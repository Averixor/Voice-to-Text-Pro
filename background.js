// ===========================================
// background.js - service worker
// Commands, side panel ports, context menu, notifications, on-demand paste inject.
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

const RECORDING_STARTED_NOTIFY = {
  "ru-RU": {
    title: "Голос в Текст Pro",
    message: "Запись голоса начата. Говорите сейчас.",
  },
  "uk-UA": {
    title: "Голос у Текст Pro",
    message: "Запис розпочато. Говоріть.",
  },
  "en-US": {
    title: "Voice to Text Pro",
    message: "Recording started. Speak now.",
  },
  "es-ES": {
    title: "Voz a Texto Pro",
    message: "Grabación iniciada. Hable ahora.",
  },
  "fr-FR": {
    title: "Voix en Texte Pro",
    message: "Enregistrement démarré. Parlez maintenant.",
  },
  "de-DE": {
    title: "Sprache zu Text Pro",
    message: "Aufnahme gestartet. Sprechen Sie jetzt.",
  },
  "it-IT": {
    title: "Voce in Testo Pro",
    message: "Registrazione avviata. Parla ora.",
  },
  "ja-JP": {
    title: "音声テキスト変換 Pro",
    message: "録音を開始しました。話してください。",
  },
  "ko-KR": {
    title: "음성을 텍스트로 Pro",
    message: "녹음이 시작되었습니다. 말하세요.",
  },
  "zh-CN": {
    title: "语音转文本 Pro",
    message: "已开始录音，请说话。",
  },
};

/** @type {Set<chrome.runtime.Port>} */
const sidePanelPorts = new Set();

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

function relayToSidePanel(message) {
  return chrome.runtime.sendMessage(message);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "sidePanel") return;
  sidePanelPorts.add(port);
  port.onDisconnect.addListener(() => {
    sidePanelPorts.delete(port);
  });
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
});

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
    chrome.storage.local.get("language", (stored) => {
      const lang = stored.language || "ru-RU";
      const n = notifyStringsForLanguage(lang);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: n.title,
        message: n.message,
      });
    });
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
