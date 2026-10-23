// ===========================================
// background.js - service worker
// Commands, side panel + recorder ports, context menu, paste inject.
// ===========================================

const CONTEXT_MENU_I18N = {
  "ru-RU": "Вставить текст из Голос в Текст Pro",
  "uk-UA": "Вставити текст з Голос у Текст Pro",
  "en-US": "Insert text from Voice to Text Pro",
  "es-ES": "Insertar texto de Voz a Texto Pro",
  "fr-FR": "Insérer le texte depuis Voix en Texte Pro",
  "de-DE": "Text aus Sprache zu Text Pro einfügen",
  "it-IT": "Inserisci testo da Voce in Testo Pro",
  "ja-JP": "音声テキスト変換 Pro からテキストを挿入",
  "ko-KR": "음성을 텍스트로 Pro에서 텍스트 삽입",
  "zh-CN": "从语音转文本 Pro 插入文本",
};

const SUPPORTED_LOCALES = [
  "ru-RU",
  "uk-UA",
  "en-US",
  "es-ES",
  "fr-FR",
  "de-DE",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "zh-CN",
];

const SESSION_KEY = "recorderSession";
const PANEL_GONE_MS = 4000;
const BROAD_HOST_ORIGINS = ["https://*/*", "http://*/*"];

/** @type {Set<chrome.runtime.Port>} */
const sidePanelPorts = new Set();

/** @type {Map<chrome.runtime.Port, number|null>} */
const panelWindowByPort = new Map();

/** @type {chrome.runtime.Port|null} */
let recorderPort = null;

/** @type {number|null} */
let recorderTabId = null;

/** Tab to restore after recorder is running in the background. */
/** @type {number|null} */
let recorderReturnTabId = null;

/** @type {{ type: string, language?: string }|null} */
let pendingRecorderCommand = null;

/** Window whose panel owns the current dictation. */
/** @type {number|null} */
let dictationWindowId = null;

/** @type {ReturnType<typeof setTimeout>|null} */
let panelGoneTimer = null;

function defaultLocale() {
  const ui = chrome.i18n?.getUILanguage?.() || "en-US";
  if (SUPPORTED_LOCALES.includes(ui)) return ui;
  const base = String(ui).split("-")[0].toLowerCase();
  return (
    SUPPORTED_LOCALES.find((code) => code.toLowerCase().startsWith(base)) ||
    "en-US"
  );
}

function contextMenuTitleForLanguage(code) {
  return CONTEXT_MENU_I18N[code] || CONTEXT_MENU_I18N["en-US"];
}

function createOrRefreshContextMenu(languageCode) {
  const title = contextMenuTitleForLanguage(languageCode || defaultLocale());
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "pasteTranscript",
      title,
      contexts: ["editable"],
    });
  });
}

function originFromTabUrl(url) {
  if (!url || !/^https?:/i.test(url)) return null;
  try {
    return new URL(url).origin + "/*";
  } catch {
    return null;
  }
}

function tabAccessKind(url) {
  if (!url) return "unknown";
  if (/^file:/i.test(url)) return "file";
  if (/\.pdf(?:$|[?#])/i.test(url)) return "pdf";
  if (
    /^(chrome|chrome-untrusted|edge|about|devtools|view-source|chrome-extension):/i.test(
      url,
    )
  ) {
    return "restricted";
  }
  if (/^https?:/i.test(url)) return "web";
  return "restricted";
}

function hostOriginsFor(url) {
  const originPattern = originFromTabUrl(url);
  return originPattern ? [originPattern] : BROAD_HOST_ORIGINS.slice();
}

function persistRecorderSession() {
  if (!chrome.storage?.session) return;
  chrome.storage.session
    .set({
      [SESSION_KEY]: {
        recorderTabId,
        recorderReturnTabId,
        pendingRecorderCommand,
        dictationWindowId,
      },
    })
    .catch(() => {});
}

function clearRecorderTabState() {
  recorderTabId = null;
  recorderReturnTabId = null;
  recorderPort = null;
  pendingRecorderCommand = null;
  persistRecorderSession();
}

function restoreRecorderSession() {
  if (!chrome.storage?.session) return;
  chrome.storage.session
    .get(SESSION_KEY)
    .then((stored) => {
      const session = stored?.[SESSION_KEY];
      if (!session) return;
      recorderTabId = Number.isInteger(session.recorderTabId)
        ? session.recorderTabId
        : null;
      recorderReturnTabId = Number.isInteger(session.recorderReturnTabId)
        ? session.recorderReturnTabId
        : null;
      pendingRecorderCommand = session.pendingRecorderCommand || null;
      dictationWindowId = Number.isInteger(session.dictationWindowId)
        ? session.dictationWindowId
        : null;
      if (recorderTabId == null) return;
      chrome.tabs
        .get(recorderTabId)
        .then(() => {
          scheduleStopWhenPanelGone();
        })
        .catch(() => {
          clearRecorderTabState();
        });
    })
    .catch(() => {});
}

async function injectPasteHelper(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content.js"],
    });
    return true;
  } catch (allFramesError) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return false;
  }
}

async function pasteInTab(tabId, textToPaste) {
  const allFrames = await injectPasteHelper(tabId);
  const target = { tabId };
  if (allFrames) target.allFrames = true;

  const probe = await chrome.scripting.executeScript({
    target,
    func: () => {
      const helper = globalThis.__voiceToTextProContentInstance;
      if (!helper || typeof helper.getPasteTarget !== "function") {
        return { hasTarget: false };
      }
      const deep =
        typeof helper.deepActiveElement === "function"
          ? helper.deepActiveElement(document.activeElement)
          : document.activeElement;
      const found = helper.getPasteTarget();
      return {
        hasTarget: Boolean(found),
        focused: document.hasFocus(),
        activeIsTarget: Boolean(
          found && (deep === found || document.activeElement === found),
        ),
      };
    },
  });

  const frames = probe || [];
  const chosen =
    frames.find((frame) => frame.result?.activeIsTarget) ||
    frames.find((frame) => frame.result?.focused && frame.result?.hasTarget) ||
    frames.find((frame) => frame.result?.hasTarget);

  if (!chosen || chosen.frameId == null) {
    return { success: false, reason: "no-field" };
  }

  const pasted = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [chosen.frameId] },
    func: (text) => {
      const helper = globalThis.__voiceToTextProContentInstance;
      if (!helper || typeof helper.pasteText !== "function") {
        return { success: false, reason: "no-helper" };
      }
      const ok = helper.pasteText(text);
      return { success: Boolean(ok), reason: ok ? "ok" : "no-field" };
    },
    args: [textToPaste],
  });

  const result = pasted?.[0]?.result;
  if (result?.success) return { success: true, reason: "ok" };
  return { success: false, reason: result?.reason || "no-field" };
}

/**
 * Paste after a user gesture: inject all frames → optional host grant → retry.
 * When the tab URL is hidden, the caller asks for all http and https origins.
 * @param {number} tabId
 * @param {string} textToPaste
 * @param {{ requestPermission?: boolean, tabUrl?: string }} [options]
 */
async function sendPasteToTab(tabId, textToPaste, options = {}) {
  const requestPermission = options.requestPermission !== false;
  const tabUrl = options.tabUrl || "";
  const kind = tabAccessKind(tabUrl);

  if (kind === "restricted") return { success: false, reason: "restricted" };
  if (kind === "file") return { success: false, reason: "file" };
  if (kind === "pdf") return { success: false, reason: "pdf" };

  try {
    return await pasteInTab(tabId, textToPaste);
  } catch (injectError) {
    const origins = hostOriginsFor(tabUrl);
    const originPattern = origins.length === 1 ? origins[0] : undefined;
    if (requestPermission && chrome.permissions?.request) {
      const granted = await chrome.permissions.request({ origins });
      if (!granted) {
        return {
          success: false,
          needsHostAccess: true,
          origins,
          originPattern,
          reason: "needs-host",
        };
      }
      try {
        return await pasteInTab(tabId, textToPaste);
      } catch (retryError) {
        return {
          success: false,
          reason: "inject-failed",
          error: String(retryError?.message || retryError),
        };
      }
    }

    return {
      success: false,
      needsHostAccess: true,
      origins,
      originPattern,
      reason: "needs-host",
      error: String(injectError?.message || injectError),
    };
  }
}

function openSidePanelForTab(tabId) {
  return chrome.sidePanel.open({ tabId }).catch(() => {});
}

function openSidePanelForActiveTab() {
  return chrome.tabs
    .query({ active: true, lastFocusedWindow: true })
    .then((tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) return openSidePanelForTab(tabId);
      return chrome.tabs
        .query({ active: true, currentWindow: true })
        .then((fallback) => {
          const id = fallback[0]?.id;
          if (id) return openSidePanelForTab(id);
        });
    });
}

function closeRecorderTab() {
  const id = recorderTabId;
  clearRecorderTabState();
  if (id === null) return Promise.resolve();
  return chrome.tabs.remove(id).catch(() => {});
}

/** Leave the recorder tab open but switch back to the user's page. */
function backgroundRecorderTab() {
  if (recorderReturnTabId === null) return Promise.resolve();
  return chrome.tabs
    .get(recorderReturnTabId)
    .then(() => chrome.tabs.update(recorderReturnTabId, { active: true }))
    .catch(() => {
      recorderReturnTabId = null;
      persistRecorderSession();
    });
}

function closeSidePanelForTab(tabId) {
  return chrome.sidePanel
    .setOptions({ tabId, enabled: false })
    .then(() =>
      chrome.sidePanel.setOptions({ tabId, enabled: true }).catch(() => {}),
    )
    .catch(() => {});
}

function isSidePanelConnected() {
  return sidePanelPorts.size > 0;
}

function rememberPanelWindow(port, windowId) {
  if (!Number.isInteger(windowId)) return;
  panelWindowByPort.set(port, windowId);
}

function dictationPanelConnected() {
  if (dictationWindowId == null) return sidePanelPorts.size > 0;
  for (const port of sidePanelPorts) {
    if (panelWindowByPort.get(port) === dictationWindowId) return true;
  }
  return false;
}

function clearPanelGoneTimer() {
  if (panelGoneTimer !== null) {
    clearTimeout(panelGoneTimer);
    panelGoneTimer = null;
  }
}

function scheduleStopWhenPanelGone() {
  clearPanelGoneTimer();
  if (dictationPanelConnected()) return;
  if (recorderTabId === null && !recorderPort) return;
  panelGoneTimer = setTimeout(() => {
    panelGoneTimer = null;
    if (dictationPanelConnected()) return;
    const told = postToRecorder({ type: "stopRecording" });
    setTimeout(
      () => {
        if (!dictationPanelConnected()) closeRecorderTab();
      },
      told ? 1200 : 0,
    );
  }, PANEL_GONE_MS);
}

function postToSidePanels(message, windowId) {
  let delivered = 0;
  for (const port of sidePanelPorts) {
    const portWindow = panelWindowByPort.get(port);
    if (windowId != null && portWindow != null && portWindow !== windowId) {
      continue;
    }
    try {
      port.postMessage(message);
      delivered += 1;
    } catch (e) {
      sidePanelPorts.delete(port);
      panelWindowByPort.delete(port);
    }
  }
  return delivered;
}

function relayToSidePanel(message, windowId) {
  if (postToSidePanels(message, windowId) === 0) {
    return Promise.reject(new Error("no-panel"));
  }
  return Promise.resolve({ success: true });
}

function postToRecorder(message) {
  if (!recorderPort) return false;
  try {
    recorderPort.postMessage(message);
    return true;
  } catch (e) {
    recorderPort = null;
    return false;
  }
}

function requestLiveDraft(windowId) {
  return new Promise((resolve) => {
    let port = null;
    for (const candidate of sidePanelPorts) {
      if (windowId == null || panelWindowByPort.get(candidate) === windowId) {
        port = candidate;
        break;
      }
    }
    if (!port && sidePanelPorts.size === 1) {
      port = sidePanelPorts.values().next().value;
    }
    const fromStorage = () => {
      chrome.storage.local.get("textDraft", (result) => {
        resolve(result.textDraft || "");
      });
    };
    if (!port) {
      fromStorage();
      return;
    }
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = setTimeout(() => {
      port.onMessage.removeListener(onDraft);
      fromStorage();
    }, 400);
    function onDraft(msg) {
      if (msg?.type !== "liveDraft" || msg.requestId !== requestId) return;
      clearTimeout(timer);
      port.onMessage.removeListener(onDraft);
      resolve(msg.text || "");
    }
    port.onMessage.addListener(onDraft);
    try {
      port.postMessage({ type: "getLiveDraft", requestId });
    } catch (e) {
      clearTimeout(timer);
      port.onMessage.removeListener(onDraft);
      fromStorage();
    }
  });
}

function placeRecorderBesideActiveTab(tabId) {
  return chrome.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      const active = tabs[0];
      if (!active || active.id === tabId) return;
      const index =
        typeof active.index === "number" ? active.index + 1 : undefined;
      const moveOpts = { windowId: active.windowId };
      if (typeof index === "number") moveOpts.index = index;
      return chrome.tabs.move(tabId, moveOpts).catch(() => {});
    });
}

function openRecorderTab(autostart) {
  const url =
    chrome.runtime.getURL("recorder.html") +
    (autostart ? "?autostart=1" : "?setup=1");

  if (recorderTabId !== null) {
    return chrome.tabs
      .get(recorderTabId)
      .then(async (tab) => {
        await placeRecorderBesideActiveTab(tab.id);
        if (autostart && recorderPort) {
          chrome.storage.local.get("language", (stored) => {
            postToRecorder({
              type: "startRecording",
              language: stored.language || defaultLocale(),
            });
          });
          backgroundRecorderTab();
        }
        return tab;
      })
      .catch(() => {
        clearRecorderTabState();
        return createRecorderTab(url, { active: true });
      });
  }

  return createRecorderTab(url, { active: true });
}

function createRecorderTab(url, options = {}) {
  const active = options.active !== false;
  return chrome.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      const current = tabs[0];
      const returnId = current?.id ?? null;
      const createOpts = {
        url,
        active,
      };
      if (current && typeof current.index === "number") {
        createOpts.index = current.index + 1;
        createOpts.openerTabId = current.id;
      }

      return chrome.tabs.create(createOpts).then((tab) => {
        recorderTabId = tab?.id ?? null;
        recorderReturnTabId =
          returnId != null && returnId !== recorderTabId ? returnId : null;
        persistRecorderSession();
        return tab;
      });
    });
}

/** Open/focus recorder beside the side-panel tab for the Chrome Allow prompt. */
function openRecorderTabForMicPrompt() {
  const url = chrome.runtime.getURL("recorder.html") + "?setup=1";

  if (recorderTabId !== null) {
    return chrome.tabs
      .get(recorderTabId)
      .then(async (tab) => {
        await placeRecorderBesideActiveTab(tab.id);
        return chrome.tabs.update(tab.id, { active: true });
      })
      .catch(() => {
        clearRecorderTabState();
        return createRecorderTab(url, { active: true });
      });
  }

  return createRecorderTab(url, { active: true });
}

function ensureRecorderAndCommand(command) {
  pendingRecorderCommand = command;
  persistRecorderSession();

  if (postToRecorder(command)) {
    pendingRecorderCommand = null;
    persistRecorderSession();
    if (
      command.type === "startRecording" ||
      command.type === "resumeRecording"
    ) {
      backgroundRecorderTab();
    }
    return Promise.resolve({ success: true });
  }

  return openRecorderTab(command.type === "startRecording").then(() => ({
    success: true,
    pending: true,
  }));
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidePanel") {
    sidePanelPorts.add(port);
    clearPanelGoneTimer();
    port.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;
      rememberPanelWindow(port, msg.windowId);

      if (msg.type === "panelHello" || msg.type === "liveDraft") return;

      if (
        msg.type === "startRecording" ||
        msg.type === "stopRecording" ||
        msg.type === "pauseRecording" ||
        msg.type === "resumeRecording"
      ) {
        const portWindow = panelWindowByPort.get(port);
        if (Number.isInteger(portWindow)) dictationWindowId = portWindow;
        persistRecorderSession();
        chrome.storage.local.get("language", (stored) => {
          ensureRecorderAndCommand({
            type: msg.type,
            language: msg.language || stored.language || defaultLocale(),
          }).catch(() => {});
        });
      } else if (msg.type === "openRecorderSetup") {
        openRecorderTab(false).catch(() => {});
      } else if (msg.type === "openRecorderForMicPrompt") {
        openRecorderTabForMicPrompt().catch(() => {});
      }
    });
    port.onDisconnect.addListener(() => {
      sidePanelPorts.delete(port);
      panelWindowByPort.delete(port);
      scheduleStopWhenPanelGone();
    });
    return;
  }

  if (port.name === "recorder") {
    recorderPort = port;
    port.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;

      if (msg.type === "recorderReady") {
        if (pendingRecorderCommand) {
          const cmd = pendingRecorderCommand;
          pendingRecorderCommand = null;
          persistRecorderSession();
          postToRecorder(cmd);
        }
        return;
      }

      if (msg.type === "recorderStarted" || msg.type === "micGranted") {
        backgroundRecorderTab();
      }

      if (msg.type === "needMicFocus") {
        postToSidePanels({ type: "needMicFocus" }, dictationWindowId);
        if (recorderTabId !== null) {
          placeRecorderBesideActiveTab(recorderTabId)
            .then(() => chrome.tabs.update(recorderTabId, { active: true }))
            .catch(() => {});
        }
        return;
      }

      if (msg.type === "closeRecorderWindow") {
        closeRecorderTab();
      }

      postToSidePanels(msg, dictationWindowId);
    });
    port.onDisconnect.addListener(() => {
      if (recorderPort === port) recorderPort = null;
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === recorderTabId) {
    clearRecorderTabState();
    postToSidePanels({ type: "recorderWindowClosed" }, dictationWindowId);
  }
  if (tabId === recorderReturnTabId) {
    recorderReturnTabId = null;
    persistRecorderSession();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.language) return;
  const lang = changes.language.newValue || defaultLocale();
  const title = contextMenuTitleForLanguage(lang);
  chrome.contextMenus.update("pasteTranscript", { title }, () => {
    if (chrome.runtime.lastError) {
      createOrRefreshContextMenu(lang);
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) =>
      console.error("Failed to set side panel behavior:", error),
    );

  chrome.storage.local.get("language", (stored) => {
    createOrRefreshContextMenu(stored.language || defaultLocale());
  });

  chrome.storage.local.remove("sidePanelOpen");
});

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) return;

    if (command === "start_recording") {
      relayToSidePanel({ action: "startRecording" }, activeTab.windowId).catch(
        () => {
          openSidePanelForTab(activeTab.id);
        },
      );
    } else if (command === "stop_recording") {
      relayToSidePanel({ action: "stopRecording" }, activeTab.windowId).catch(
        () => {
          openSidePanelForTab(activeTab.id);
        },
      );
    } else if (command === "toggle_side_panel") {
      if (isSidePanelConnected()) {
        closeSidePanelForTab(activeTab.id);
      } else {
        openSidePanelForTab(activeTab.id);
      }
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "pasteTranscript" || !tab?.id) return;

  requestLiveDraft(tab.windowId)
    .then((textToPaste) => {
      if (!textToPaste) return;
      return sendPasteToTab(tab.id, textToPaste, {
        requestPermission: true,
        tabUrl: tab.url,
      });
    })
    .catch((error) => console.error("Context menu paste failed:", error));
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeSidePanel") {
    const windowId = sender.tab?.windowId;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab =
        (windowId != null
          ? tabs.find((item) => item.windowId === windowId)
          : null) || tabs[0];
      if (tab?.id) {
        closeSidePanelForTab(tab.id).finally(() => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (request.action === "pasteToActiveTab") {
    const textToPaste = request.textToPaste || "";
    const fromExtensionPage = Boolean(
      sender.url && sender.url.startsWith("chrome-extension://"),
    );
    const windowId = Number.isInteger(request.windowId)
      ? request.windowId
      : undefined;
    const query = windowId != null
      ? { active: true, windowId }
      : { active: true, currentWindow: true };
    chrome.tabs.query(query, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse({ success: false, reason: "no-tab" });
        return;
      }

      sendPasteToTab(activeTab.id, textToPaste, {
        requestPermission: !fromExtensionPage,
        tabUrl: activeTab.url,
      })
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ success: false, reason: "inject-failed" }));
    });
    return true;
  }

  if (request.action === "updateSettings") {
    const settings = {};

    if (request.autoPunctuation !== undefined) {
      settings.autoPunctuation = request.autoPunctuation;
    }

    if (request.language !== undefined) {
      settings.language = request.language;
    }

    if (request.uiLanguage !== undefined) {
      settings.uiLanguage = request.uiLanguage;
    }

    chrome.storage.local.set(settings);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "getSettings") {
    chrome.storage.local.get(
      ["autoPunctuation", "language", "uiLanguage"],
      (result) => {
        const fallback = defaultLocale();
        sendResponse({
          autoPunctuation: result.autoPunctuation || "medium",
          language: result.language || fallback,
          uiLanguage: result.uiLanguage || fallback,
        });
      },
    );
    return true;
  }

  sendResponse({ success: false });
  return true;
});

restoreRecorderSession();
