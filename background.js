// ===========================================
// background.js - service worker
// Commands, side panel + recorder ports, context menu, notifications, paste inject.
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

const RECORDING_NOTIFICATION_ID = "voice-to-text-pro-recording";

const RECORDING_STARTED_NOTIFY = {
  "ru-RU": {
    title: "Голос в Текст Pro",
    message: "Запись голоса начата. Говорите сейчас.",
    openPanel: "Открыть панель",
  },
  "uk-UA": {
    title: "Голос у Текст Pro",
    message: "Запис розпочато. Говоріть.",
    openPanel: "Відкрити панель",
  },
  "en-US": {
    title: "Voice to Text Pro",
    message: "Recording started. Speak now.",
    openPanel: "Open panel",
  },
  "es-ES": {
    title: "Voz a Texto Pro",
    message: "Grabación iniciada. Hable ahora.",
    openPanel: "Abrir panel",
  },
  "fr-FR": {
    title: "Voix en Texte Pro",
    message: "Enregistrement démarré. Parlez maintenant.",
    openPanel: "Ouvrir le panneau",
  },
  "de-DE": {
    title: "Sprache zu Text Pro",
    message: "Aufnahme gestartet. Sprechen Sie jetzt.",
    openPanel: "Panel öffnen",
  },
  "it-IT": {
    title: "Voce in Testo Pro",
    message: "Registrazione avviata. Parla ora.",
    openPanel: "Apri pannello",
  },
  "ja-JP": {
    title: "音声テキスト変換 Pro",
    message: "録音を開始しました。話してください。",
    openPanel: "パネルを開く",
  },
  "ko-KR": {
    title: "음성을 텍스트로 Pro",
    message: "녹음이 시작되었습니다. 말하세요.",
    openPanel: "패널 열기",
  },
  "zh-CN": {
    title: "语音转文本 Pro",
    message: "已开始录音，请说话。",
    openPanel: "打开面板",
  },
};

/** @type {Set<chrome.runtime.Port>} */
const sidePanelPorts = new Set();

/** @type {chrome.runtime.Port|null} */
let recorderPort = null;

/** @type {number|null} */
let recorderTabId = null;

/** Tab to restore after recorder is running in the background. */
/** @type {number|null} */
let recorderReturnTabId = null;

/** @type {{ type: string, language?: string }|null} */
let pendingRecorderCommand = null;

function notifyStringsForLanguage(code) {
  return RECORDING_STARTED_NOTIFY[code] || RECORDING_STARTED_NOTIFY["en-US"];
}

function contextMenuTitleForLanguage(code) {
  return CONTEXT_MENU_I18N[code] || CONTEXT_MENU_I18N["en-US"];
}

function createOrRefreshContextMenu(languageCode) {
  const title = contextMenuTitleForLanguage(languageCode || "ru-RU");
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

function injectContentScripts(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    files: ["i18n.js", "content.js"],
  });
}

function deliverPaste(tabId, textToPaste) {
  const payload = {
    action: "pasteSelection",
    textToPaste,
  };
  return chrome.tabs.sendMessage(tabId, payload);
}

/**
 * Paste after a user gesture: message → inject → optional host grant → retry.
 * @param {number} tabId
 * @param {string} textToPaste
 * @param {{ requestPermission?: boolean, tabUrl?: string }} [options]
 */
async function sendPasteToTab(tabId, textToPaste, options = {}) {
  const requestPermission = options.requestPermission !== false;
  const tabUrl = options.tabUrl;

  try {
    const response = await deliverPaste(tabId, textToPaste);
    return { success: Boolean(response?.success) };
  } catch {
    // No receiver yet — inject, then retry.
  }

  try {
    await injectContentScripts(tabId);
    const response = await deliverPaste(tabId, textToPaste);
    return { success: Boolean(response?.success) };
  } catch (injectError) {
    const originPattern = originFromTabUrl(tabUrl);
    if (requestPermission && originPattern && chrome.permissions?.request) {
      const granted = await chrome.permissions.request({
        origins: [originPattern],
      });
      if (!granted) {
        return { success: false, needsHostAccess: true, originPattern };
      }

      await injectContentScripts(tabId);
      const response = await deliverPaste(tabId, textToPaste);
      return { success: Boolean(response?.success) };
    }

    return {
      success: false,
      needsHostAccess: Boolean(originPattern),
      originPattern: originPattern || undefined,
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

function focusRecorderOrPanel() {
  if (recorderTabId !== null) {
    return chrome.tabs
      .update(recorderTabId, { active: true })
      .catch(() => openSidePanelForActiveTab());
  }
  return openSidePanelForActiveTab();
}

function clearRecorderTabState() {
  recorderTabId = null;
  recorderReturnTabId = null;
  recorderPort = null;
  pendingRecorderCommand = null;
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
    });
}

function clearRecordingNotification() {
  return chrome.notifications.clear(RECORDING_NOTIFICATION_ID).catch(() => {});
}

function showRecordingNotification(languageCode) {
  const n = notifyStringsForLanguage(languageCode);
  return chrome.notifications.create(RECORDING_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: n.title,
    message: n.message,
    buttons: [{ title: n.openPanel }],
    priority: 1,
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

function postToSidePanels(message) {
  for (const port of sidePanelPorts) {
    try {
      port.postMessage(message);
    } catch (e) {
      sidePanelPorts.delete(port);
    }
  }
}

function relayToSidePanel(message) {
  if (sidePanelPorts.size === 0) {
    return Promise.reject(new Error("no-panel"));
  }
  postToSidePanels(message);
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

function openRecorderTab(autostart) {
  const url =
    chrome.runtime.getURL("recorder.html") +
    (autostart ? "?autostart=1" : "?setup=1");

  if (recorderTabId !== null) {
    return chrome.tabs
      .get(recorderTabId)
      .then((tab) => {
        // Keep it pinned to the far left.
        chrome.tabs.move(tab.id, { index: 0 }).catch(() => {});
        if (autostart && recorderPort) {
          chrome.storage.local.get("language", (stored) => {
            postToRecorder({
              type: "startRecording",
              language: stored.language || "ru-RU",
            });
          });
          backgroundRecorderTab();
        }
        // Never steal focus just because the tab already exists.
        return tab;
      })
      .catch(() => {
        clearRecorderTabState();
        return createRecorderTab(url);
      });
  }

  return createRecorderTab(url);
}

function createRecorderTab(url) {
  return chrome.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      const returnId = tabs[0]?.id ?? null;
      // Far-left tab, opened in the background — user stays on their page.
      return chrome.tabs
        .create({
          url,
          active: false,
          index: 0,
        })
        .then((tab) => {
          recorderTabId = tab?.id ?? null;
          recorderReturnTabId =
            returnId != null && returnId !== recorderTabId ? returnId : null;
          return tab;
        });
    });
}

function ensureRecorderAndCommand(command) {
  pendingRecorderCommand = command;

  if (postToRecorder(command)) {
    pendingRecorderCommand = null;
    if (
      command.type === "startRecording" ||
      command.type === "resumeRecording"
    ) {
      backgroundRecorderTab();
    }
    if (command.type === "stopRecording") {
      // Tab closes after recorder reports stopped / closeRecorderWindow.
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
    port.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;

      if (
        msg.type === "startRecording" ||
        msg.type === "stopRecording" ||
        msg.type === "pauseRecording" ||
        msg.type === "resumeRecording"
      ) {
        chrome.storage.local.get("language", (stored) => {
          ensureRecorderAndCommand({
            type: msg.type,
            language: msg.language || stored.language || "ru-RU",
          }).catch(() => {});
        });
      } else if (msg.type === "openRecorderSetup") {
        openRecorderTab(false).catch(() => {});
      }
    });
    port.onDisconnect.addListener(() => {
      sidePanelPorts.delete(port);
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
          postToRecorder(cmd);
        }
        return;
      }

      // Do not show chrome.notifications on recorderStarted — recognition
      // restarts after silence and would spam the desktop toast.
      if (msg.type === "recorderStarted" || msg.type === "micGranted") {
        // Recorder stays leftmost in the strip; user returns to their page.
        backgroundRecorderTab();
      }

      if (msg.type === "needMicFocus") {
        // Do not activate the recorder tab. The side panel (on the user's
        // page) must request the mic so Chrome shows the prompt there.
        postToSidePanels({ type: "needMicFocus" });
        return;
      }

      if (
        msg.type === "recorderStopped" ||
        msg.type === "recorderError" ||
        msg.type === "recorderWindowClosed"
      ) {
        clearRecordingNotification();
      }

      if (msg.type === "closeRecorderWindow") {
        closeRecorderTab();
      }

      postToSidePanels(msg);
    });
    port.onDisconnect.addListener(() => {
      if (recorderPort === port) recorderPort = null;
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === recorderTabId) {
    clearRecorderTabState();
    postToSidePanels({ type: "recorderWindowClosed" });
  }
  if (tabId === recorderReturnTabId) {
    recorderReturnTabId = null;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.language) return;
  const lang = changes.language.newValue || "ru-RU";
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
    createOrRefreshContextMenu(stored.language || "ru-RU");
  });

  chrome.storage.local.remove("sidePanelOpen");
  clearRecordingNotification();
});

clearRecordingNotification();

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.id) return;

    if (command === "start_recording") {
      relayToSidePanel({ action: "startRecording" }).catch(() => {
        openSidePanelForTab(activeTab.id);
      });
    } else if (command === "stop_recording") {
      relayToSidePanel({ action: "stopRecording" }).catch(() => {
        openSidePanelForTab(activeTab.id);
      });
    } else if (command === "toggle_side_panel") {
      if (isSidePanelConnected()) {
        closeSidePanelForTab(activeTab.id);
      } else {
        openSidePanelForTab(activeTab.id);
      }
    }
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId !== RECORDING_NOTIFICATION_ID) return;
  clearRecordingNotification();
  focusRecorderOrPanel();
});

chrome.notifications.onButtonClicked.addListener(
  (notificationId, buttonIndex) => {
    if (notificationId !== RECORDING_NOTIFICATION_ID) return;
    if (buttonIndex === 0) {
      clearRecordingNotification();
      focusRecorderOrPanel();
    }
  },
);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "pasteTranscript" || !tab?.id) return;

  chrome.storage.local.get("textDraft", (result) => {
    const textToPaste = result.textDraft || "";
    if (!textToPaste) return;

    sendPasteToTab(tab.id, textToPaste, {
      requestPermission: true,
      tabUrl: tab.url,
    }).catch((error) => console.error("Context menu paste failed:", error));
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeSidePanel") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        closeSidePanelForTab(tabs[0].id).finally(() => {
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
    // Panel must call chrome.permissions.request itself (user gesture).
    const fromExtensionPage = Boolean(
      sender.url && sender.url.startsWith("chrome-extension://"),
    );
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        sendResponse({ success: false, error: "no-tab" });
        return;
      }

      sendPasteToTab(activeTab.id, textToPaste, {
        requestPermission: !fromExtensionPage,
        tabUrl: activeTab.url,
      })
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ success: false }));
    });
    return true;
  }

  if (request.type === "recordingStarted") {
    // Intentionally no desktop toast — recorder window is the indicator.
    sendResponse({ success: true });
    return true;
  }

  if (request.type === "recordingStopped") {
    clearRecordingNotification();
    sendResponse({ success: true });
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

    chrome.storage.local.set(settings);
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "getSettings") {
    chrome.storage.local.get(["autoPunctuation", "language"], (result) => {
      sendResponse({
        autoPunctuation: result.autoPunctuation || "medium",
        language: result.language || "ru-RU",
      });
    });
    return true;
  }

  sendResponse({ success: false });
  return true;
});
