// ===========================================
// sidepanel.js - Chrome side panel page
// UI + transcript; SpeechRecognition runs in recorder.html (extension window).
// ===========================================

class SpeechToTextPro {
  constructor() {
    this.isRecording = false;
    this.isPaused = false;
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.spellCheckEnabled = false;
    this.autoPunctuationLevel = "medium";
    this.sessionWordCount = 0;
    this.currentLanguage = "en-US";
    this.uiLanguage = "en-US";
    this.windowId = null;
    this.suppressStoppedUntil = 0;
    this.draftRetention = "keep";
    this.saveTimeout = null;
    this._transientStatusTimer = null;

    this.privacyConsentAccepted = false;
    this.sidePanelPort = null;
    this.pendingStartAfterMic = false;
    this.awaitingMicGrant = false;

    this.initializeElements();
    if (this.autoPunctuationSelect) {
      this.autoPunctuationSelect.value = this.autoPunctuationLevel;
    }
    const fallback = this.defaultLocale();
    this.currentLanguage = fallback;
    this.uiLanguage = fallback;
    if (this.languageSelect) this.languageSelect.value = fallback;
    if (this.uiLanguageSelect) this.uiLanguageSelect.value = fallback;
    this.connectSidePanelPort();
    this.applyAppLocale();
    this.setupEventListeners();
    this.loadSavedSettings();
    this.checkBrowserSupport();
    this.setupSpellCheck();
    this.updateStats();
    this.updateEditorOverlay();
  }

  connectSidePanelPort() {
    if (!chrome.runtime?.id) return;

    try {
      this.sidePanelPort = chrome.runtime.connect({ name: "sidePanel" });
      this.sidePanelPort.onMessage.addListener((msg) =>
        this.handleRecorderBridgeMessage(msg),
      );
      this.sidePanelPort.onDisconnect.addListener(() => {
        this.sidePanelPort = null;
        setTimeout(() => this.connectSidePanelPort(), 300);
      });
      if (chrome.windows?.getCurrent) {
        chrome.windows.getCurrent((win) => {
          this.windowId = win?.id ?? null;
          this.postToBackground({ type: "panelHello" });
        });
      }
    } catch (error) {
      setTimeout(() => this.connectSidePanelPort(), 500);
    }
  }

  async ensureWindowId() {
    if (this.windowId != null || !chrome.windows?.getCurrent) return this.windowId;
    const win = await new Promise((resolve) => {
      chrome.windows.getCurrent((current) => resolve(current || null));
    });
    this.windowId = win?.id ?? null;
    return this.windowId;
  }

  postToBackground(message) {
    if (!chrome.runtime?.id) return;
    const payload = Object.assign({ windowId: this.windowId ?? undefined }, message);
    if (this.sidePanelPort) {
      try {
        this.sidePanelPort.postMessage(payload);
        return;
      } catch (e) {
        this.sidePanelPort = null;
      }
    }
    this.connectSidePanelPort();
    setTimeout(() => {
      if (this.sidePanelPort) {
        try {
          this.sidePanelPort.postMessage(payload);
        } catch (e) {
          /* ignore */
        }
      }
    }, 100);
  }

  safeRuntimeSend(message) {
    if (!chrome.runtime?.id) return Promise.resolve();
    try {
      const result = chrome.runtime.sendMessage(message);
      if (result && typeof result.then === "function") {
        return result.catch(() => {});
      }
    } catch (e) {
      /* Extension context invalidated after reload */
    }
    return Promise.resolve();
  }

  handleRecorderBridgeMessage(msg) {
    if (!msg) return;

    if (msg.action === "startRecording") {
      this.startRecording();
      return;
    }
    if (msg.action === "stopRecording") {
      this.stopRecording();
      return;
    }

    if (!msg.type) return;

    if (msg.type === "recorderResult" && Array.isArray(msg.chunks)) {
      this.applyRecorderChunks(msg.chunks);
      return;
    }

    if (msg.type === "getLiveDraft") {
      this.flushTextDraft();
      this.postToBackground({
        type: "liveDraft",
        requestId: msg.requestId,
        text: this.output?.value || "",
      });
      return;
    }

    if (msg.type === "recorderStarted") {
      this.isRecording = true;
      this.isPaused = false;
      this.awaitingMicGrant = false;
      this.instructions.style.display = "none";
      this.updateUIStatus("recording");
      this.startTimer();
      return;
    }

    if (msg.type === "recorderPaused") {
      this.isPaused = true;
      this.isRecording = false;
      this.stopTimer();
      this.updateUIStatus("paused", this.pack.statusPaused);
      return;
    }

    if (msg.type === "recorderStopped" || msg.type === "recorderWindowClosed") {
      if (
        msg.type === "recorderStopped" &&
        this.suppressStoppedUntil &&
        Date.now() < this.suppressStoppedUntil
      ) {
        return;
      }
      const wasLive = this.isRecording || this.isPaused;
      this.isRecording = false;
      this.isPaused = false;
      this.awaitingMicGrant = false;
      this.pendingStartAfterMic = false;
      this.stopTimer();
      this.updateUIStatus(
        "idle",
        wasLive ? this.pack.statusStopped : this.pack.statusReady,
      );
      return;
    }

    if (msg.type === "recorderError") {
      const errorCode = msg.error || "unknown";
      this.suppressStoppedUntil = Date.now() + 1500;
      this.isRecording = false;
      this.isPaused = false;
      this.awaitingMicGrant = false;
      this.pendingStartAfterMic = false;
      this.stopTimer();
      if (errorCode === "not-allowed" || errorCode === "permission-denied") {
        this.showMicrophoneDenied();
      } else if (errorCode === "network") {
        this.updateUIStatus("error", this.pack.errNetwork);
        this.status.textContent = this.pack.errNetworkDetail;
      } else {
        this.updateUIStatus("error", this.pack.errRecognition);
      }
      return;
    }

    if (msg.type === "micGranted") {
      this.awaitingMicGrant = false;
      this.instructions.style.display = "none";

      // User allowed mic on the left tab — continue the Start that was waiting.
      if (this.pendingStartAfterMic && !this.isRecording) {
        this.pendingStartAfterMic = false;
        this.updateUIStatus("preparing", this.pack.statusMicWait);
        this.postToBackground({
          type: "startRecording",
          language: this.languageSelect?.value || this.currentLanguage,
        });
        return;
      }

      this.pendingStartAfterMic = false;
      if (!this.isRecording) {
        this.updateUIStatus("idle", this.pack.statusReady);
      }
      return;
    }

    if (msg.type === "needMicFocus") {
      // Background shows the recorder tab beside this page for Allow.
      this.awaitingMicGrant = true;
      this.pendingStartAfterMic = true;
      this.updateUIStatus("preparing", this.pack.statusMicWait);
    }
  }

  applyRecorderChunks(chunks) {
    const el = this.output;
    const composed = this.finalTranscript + this.interimTranscript;
    if (el.value !== composed) {
      this.syncTranscriptFromOutput();
    }

    const selStart =
      typeof el.selectionStart === "number" ? el.selectionStart : el.value.length;
    const selEnd =
      typeof el.selectionEnd === "number" ? el.selectionEnd : selStart;
    const focused = document.activeElement === el;
    const atEnd = selStart === selEnd && selStart === el.value.length;

    let interimTranscript = "";
    for (const chunk of chunks) {
      const transcript = chunk.transcript || "";
      if (chunk.isFinal) {
        const formattedTranscript = this.formatText(transcript);
        this.ensureTranscriptBoundary(formattedTranscript);
        this.finalTranscript += formattedTranscript;
      } else {
        interimTranscript += transcript;
      }
    }

    this.ensureTranscriptBoundary(interimTranscript);
    this.interimTranscript = interimTranscript;
    const next = this.finalTranscript + this.interimTranscript;
    el.value = next;
    if (focused && !atEnd) {
      const max = next.length;
      el.selectionStart = Math.min(selStart, max);
      el.selectionEnd = Math.min(selEnd, max);
    } else if (!focused) {
      el.scrollTop = el.scrollHeight;
    }
    this.updateStats();
    this.updateEditorOverlay();
    this.saveTextDraft();
  }

  initializeElements() {
    this.startBtn = document.getElementById("startBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.stopBtn = document.getElementById("stopBtn");
    this.insertBtn = document.getElementById("insertBtn");
    this.copyBtn = document.getElementById("copyBtn");
    this.clearBtn = document.getElementById("clearBtn");
    this.closeBtn = document.getElementById("closeBtn");
    this.output = document.getElementById("output");
    this.status = document.getElementById("status");
    this.statusCard = document.getElementById("statusCard");
    this.recordingTime = document.getElementById("recordingTime");
    this.timeCount = document.getElementById("timeCount");
    this.languageSelect = document.getElementById("language");
    this.uiLanguageSelect = document.getElementById("uiLanguage");
    this.draftRetentionSelect = document.getElementById("draftRetention");
    this.autoPunctuationSelect = document.getElementById("autoPunctuation");
    this.instructions = document.getElementById("instructions");
    this.micSettingsBtn = document.getElementById("micSettingsBtn");
    this.micChromeSettingsBtn = document.getElementById("micChromeSettingsBtn");
    this.privacyConsent = document.getElementById("privacyConsent");
    this.privacyAcceptBtn = document.getElementById("privacyAcceptBtn");
    this.privacyPolicyLink = document.getElementById("privacyPolicyLink");
    this.sessionStats = document.getElementById("sessionStats");
    this.editorOverlay = document.getElementById("editorOverlay");
    this.waveContainer = document.getElementById("waveContainer");

    this.output.setAttribute("autocomplete", "off");
    this.output.setAttribute("spellcheck", "true");
  }

  applyAppLocale() {
    if (!globalThis.AppI18n) return;
    const uiValue = this.uiLanguageSelect?.value || this.uiLanguage;
    this.pack = globalThis.AppI18n.getPack(uiValue);
    this.uiLanguage = this.pack.id;
    const p = this.pack;

    document.documentElement.lang = p.htmlLang;
    document.title = p.docTitle;

    const q = (sel) => document.querySelector(sel);
    const setText = (el, text) => {
      if (el && text !== undefined) el.textContent = text;
    };

    setText(q(".logo-text h1"), p.headerTitle);
    setText(q(".logo-text .tagline"), p.tagline);

    this.closeBtn.title = p.closeTitle;
    this.closeBtn.setAttribute("aria-label", p.closeAria);

    const editorSection = document.getElementById("editor-container");
    if (editorSection) editorSection.setAttribute("aria-label", p.editorAria);

    setText(q('label[for="output"]'), p.outputLabel);
    this.output.placeholder = p.outputPlaceholder;

    if (this.editorOverlay) {
      this.editorOverlay.setAttribute("aria-label", p.overlayAria);
      setText(q("#editorOverlay .overlay-text"), p.overlayMain);
      setText(q("#editorOverlay .overlay-subtext"), p.overlaySub);
    }

    this.startBtn.title = p.startTitle;
    setText(this.startBtn.querySelector("span"), p.btnStart);

    this.pauseBtn.title = p.pauseTitle;
    setText(this.pauseBtn.querySelector("span"), p.btnPause);

    this.stopBtn.title = p.stopTitle;
    setText(this.stopBtn.querySelector("span"), p.btnStop);

    this.insertBtn.title = p.insertTitle;
    setText(this.insertBtn.querySelector("span"), p.btnInsert);

    this.copyBtn.title = p.copyTitle;
    setText(this.copyBtn.querySelector("span"), p.btnCopy);

    this.clearBtn.title = p.clearTitle;
    setText(this.clearBtn.querySelector("span"), p.btnClear);

    setText(q('label[for="language"]'), p.labelLanguage);
    const fillLocaleOptions = (select) => {
      if (!select) return;
      for (let i = 0; i < select.options.length; i++) {
        const opt = select.options[i];
        if (p.langLabels[opt.value]) opt.textContent = p.langLabels[opt.value];
      }
    };
    fillLocaleOptions(this.languageSelect);
    fillLocaleOptions(this.uiLanguageSelect);
    setText(q('label[for="uiLanguage"]'), p.labelUiLanguage || "Interface language:");
    setText(
      q('label[for="draftRetention"]'),
      p.labelDraftRetention || "Draft storage:",
    );
    if (this.draftRetentionSelect) {
      const draftOpts = this.draftRetentionSelect.options;
      if (draftOpts[0]) draftOpts[0].textContent = p.draftKeep || "Keep until I clear";
      if (draftOpts[1])
        draftOpts[1].textContent = p.draftOnClose || "Clear when the panel closes";
      if (draftOpts[2]) draftOpts[2].textContent = p.draftDays || "Clear after 7 days";
    }

    setText(q('label[for="autoPunctuation"]'), p.labelPunctuation);
    const punctOpts = this.autoPunctuationSelect.options;
    if (punctOpts[0]) punctOpts[0].textContent = p.punctOff;
    if (punctOpts[1]) punctOpts[1].textContent = p.punctLow;
    if (punctOpts[2]) punctOpts[2].textContent = p.punctMedium;
    if (punctOpts[3]) punctOpts[3].textContent = p.punctHigh;

    setText(
      document.getElementById("instructionsHeading"),
      p.instructionsHeading,
    );
    const lis = document.querySelectorAll(
      "#instructions .instructions-content ol li",
    );
    [p.inst1, p.inst2, p.inst3, p.inst4].forEach((txt, i) => {
      if (lis[i] && txt) lis[i].textContent = txt;
    });
    if (this.micSettingsBtn) {
      setText(
        this.micSettingsBtn.querySelector("span") || this.micSettingsBtn,
        p.btnMicSettings || "Allow microphone",
      );
    }
    if (this.micChromeSettingsBtn) {
      setText(
        this.micChromeSettingsBtn.querySelector("span") ||
          this.micChromeSettingsBtn,
        p.btnMicChromeSettings || "Open Chrome microphone settings",
      );
    }

    setText(document.getElementById("privacyHeading"), p.privacyTitle);
    setText(document.getElementById("privacyBody"), p.privacyBody);
    if (this.privacyAcceptBtn) {
      setText(this.privacyAcceptBtn.querySelector("span"), p.privacyAccept);
    }
    if (this.privacyPolicyLink) {
      this.privacyPolicyLink.textContent = p.privacyPolicyLink;
      this.privacyPolicyLink.href = chrome.runtime.getURL("privacy.html");
    }

    setText(q(".footer-content .version"), p.footerVersion);

    this.setupSpellCheck();
    this.updateStats();

    if (this.isRecording) this.updateUIStatus("recording");
    else if (this.isPaused) this.updateUIStatus("paused");
    else this.updateUIStatus("idle");
  }

  setupEventListeners() {
    this.startBtn.addEventListener("click", () => this.startRecording());
    this.pauseBtn.addEventListener("click", () => this.pauseRecording());
    this.stopBtn.addEventListener("click", () => this.stopRecording());
    this.insertBtn.addEventListener("click", () =>
      this.insertTextToActiveField(),
    );
    this.copyBtn.addEventListener("click", () => this.copyToClipboard());
    this.clearBtn.addEventListener("click", () => this.clearText());
    this.closeBtn.addEventListener("click", () => this.closeSidePanel());
    if (this.privacyAcceptBtn) {
      this.privacyAcceptBtn.addEventListener("click", () =>
        this.acceptPrivacyConsent(),
      );
    }
    if (this.micSettingsBtn) {
      this.micSettingsBtn.addEventListener("click", () =>
        this.openMicrophonePermissionPage(),
      );
    }
    if (this.micChromeSettingsBtn) {
      this.micChromeSettingsBtn.addEventListener("click", () =>
        this.openExtensionMicSettings(),
      );
    }

    this.languageSelect.addEventListener("change", () => {
      this.currentLanguage = this.languageSelect.value;
      this.setupSpellCheck();
      this.saveSettings();
    });
    if (this.uiLanguageSelect) {
      this.uiLanguageSelect.addEventListener("change", () => {
        this.uiLanguage = this.uiLanguageSelect.value;
        this.applyAppLocale();
        this.saveSettings();
      });
    }
    if (this.draftRetentionSelect) {
      this.draftRetentionSelect.addEventListener("change", () => {
        this.draftRetention = this.draftRetentionSelect.value;
        this.saveSettings();
      });
    }
    this.autoPunctuationSelect.addEventListener("change", (e) => {
      this.autoPunctuationLevel = e.target.value;
      this.saveSettings();
    });

    this.output.addEventListener("input", () => {
      this.syncTranscriptFromOutput();
      this.updateStats();
      this.updateEditorOverlay();
      this.saveTextDraft();
    });

    document.addEventListener("keydown", (e) =>
      this.handleGlobalKeyboardShortcuts(e),
    );

    const syncMotion = () => {
      const inactive = document.hidden || !document.hasFocus();
      document.body.classList.toggle("panel-inactive", inactive);
    };
    window.addEventListener("focus", syncMotion);
    window.addEventListener("blur", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    syncMotion();

    this.output.addEventListener("paste", () => {
      setTimeout(() => {
        this.updateStats();
        this.updateEditorOverlay();
        this.saveTextDraft();
      }, 50);
    });
  }

  checkBrowserSupport() {
    // SpeechRecognition runs in recorder.html (extension window), not here.
    // Side panel mic access is unreliable in Chrome.
  }

  syncTranscriptFromOutput() {
    const currentText = this.output.value;

    if (
      this.interimTranscript &&
      currentText.endsWith(this.interimTranscript)
    ) {
      this.finalTranscript = currentText.slice(
        0,
        -this.interimTranscript.length,
      );
      return;
    }

    this.finalTranscript = currentText;
    this.interimTranscript = "";
  }

  ensureTranscriptBoundary(nextText) {
    if (
      this.finalTranscript &&
      nextText &&
      !/\s$/.test(this.finalTranscript) &&
      !/^\s/.test(nextText)
    ) {
      this.finalTranscript += " ";
    }
  }

  openMicrophonePermissionPage() {
    // Open recorder beside this page for the Chrome mic prompt.
    this.pendingStartAfterMic = false;
    this.awaitingMicGrant = true;
    this.updateUIStatus("preparing", this.pack.statusMicWait);
    this.postToBackground({ type: "openRecorderForMicPrompt" });
  }

  openExtensionMicSettings() {
    // Same screen as in Chrome site details — user can set Microphone → Allow.
    const site = encodeURIComponent(`chrome-extension://${chrome.runtime.id}/`);
    chrome.tabs
      .create({
        url: `chrome://settings/content/siteDetails?site=${site}`,
        active: true,
      })
      .catch(() => {});
  }

  showMicrophoneDenied() {
    this.isRecording = false;
    this.isPaused = false;
    this.awaitingMicGrant = false;
    this.pendingStartAfterMic = false;
    this.instructions.style.display = "flex";
    this.status.textContent = this.pack.errMicDetail;
    this.updateUIStatus("error", this.pack.errMic);
  }

  async startRecording() {
    if (!this.privacyConsentAccepted) {
      this.showPrivacyConsent();
      this.showTransientStatus(this.pack.privacyRequired, 2500, true);
      return;
    }

    if (this.isPaused) {
      await this.resumeRecording();
      return;
    }

    this.currentLanguage = this.languageSelect.value;
    this.finalTranscript = this.output.value;
    this.interimTranscript = "";
    this.isPaused = false;
    this.pendingStartAfterMic = true;
    this.updateUIStatus("preparing", this.pack.statusMicWait);
    this.instructions.style.display = "none";
    this.saveSettings();
    await this.ensureWindowId();

    // Open/reuse recorder beside this page; it hides after mic/start.
    this.postToBackground({
      type: "startRecording",
      language: this.currentLanguage,
    });
  }

  pauseRecording() {
    if (!this.isRecording || this.isPaused) return;
    this.saveTextDraft();
    this.postToBackground({ type: "pauseRecording" });
  }

  async resumeRecording() {
    if (!this.privacyConsentAccepted) {
      this.showPrivacyConsent();
      this.showTransientStatus(this.pack.privacyRequired, 2500, true);
      return;
    }

    if (!this.isPaused) return;

    this.currentLanguage = this.languageSelect.value;
    this.finalTranscript = this.output.value;
    this.interimTranscript = "";
    this.pendingStartAfterMic = true;
    this.updateUIStatus("preparing", this.pack.statusMicWait);
    this.saveSettings();
    await this.ensureWindowId();

    this.postToBackground({
      type: "resumeRecording",
      language: this.currentLanguage,
    });
  }

  stopRecording() {
    this.isPaused = false;
    this.isRecording = false;
    this.awaitingMicGrant = false;
    this.pendingStartAfterMic = false;
    this.postToBackground({ type: "stopRecording" });
    this.stopTimer();
    this.saveTextDraft();
    this.updateUIStatus("idle", this.pack.statusStopped);
  }

  async insertTextToActiveField() {
    const textToInsert = this.output.value;
    if (!textToInsert.trim()) {
      this.showTransientStatus(this.pack.toastNoText);
      return;
    }

    await this.ensureWindowId();

    const pasteMessage = (response) => {
      if (response?.success) return this.pack.toastPasteOk || this.pack.toastPasted;
      const reason = response?.reason;
      if (reason === "no-tab") return this.pack.toastNoTab;
      if (reason === "restricted") return this.pack.toastPasteRestricted;
      if (reason === "pdf") return this.pack.toastPastePdf;
      if (reason === "file") return this.pack.toastPasteFile;
      if (reason === "no-field") return this.pack.toastPasteNoField;
      return this.pack.toastPasteFail;
    };

    const handlePasteResponse = (response) => {
      const message = pasteMessage(response);
      if (response?.success) {
        this.showTransientStatus(message);
      } else {
        this.showTransientStatus(message, 2500, true);
      }
    };

    const requestPaste = () =>
      this.safeRuntimeSend({
        action: "pasteToActiveTab",
        textToPaste: textToInsert,
        windowId: this.windowId,
      });

    requestPaste().then(async (response) => {
      if (!response) {
        this.showTransientStatus(this.pack.toastPasteFail, 2500, true);
        return;
      }
      if (response.needsHostAccess && chrome.permissions?.request) {
        const origins =
          Array.isArray(response.origins) && response.origins.length
            ? response.origins
            : ["https://*/*", "http://*/*"];
        const granted = await chrome.permissions.request({ origins });
        if (granted) {
          return requestPaste().then(handlePasteResponse);
        }
      }
      handlePasteResponse(response);
    });
  }

  startTimer() {
    this.recordingStartTime = Date.now();
    this.timeCount.textContent = "00:00";
    clearInterval(this.recordingTimer);
    this.recordingTimer = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const totalSeconds = Math.floor(elapsed / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      this.timeCount.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  stopTimer() {
    clearInterval(this.recordingTimer);
  }

  formatText(text) {
    if (this.autoPunctuationLevel === "off") {
      return text + " ";
    }

    let formatted = text.trim();

    const committedBefore = this.finalTranscript.trimEnd();
    const lastChar = committedBefore.slice(-1);
    const sentenceEndChars = [".", "?", "!", ":", ";", "\n", "…"];
    const isStartOfSentence =
      committedBefore.length === 0 || sentenceEndChars.includes(lastChar);

    if (isStartOfSentence && formatted.length > 0) {
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    if (!formatted.match(/[.?!,;:]$/)) {
      if (this.autoPunctuationLevel === "low") {
        formatted += ".";
      } else if (
        this.autoPunctuationLevel === "medium" &&
        formatted.length > 8
      ) {
        formatted += ".";
      } else if (this.autoPunctuationLevel === "high") {
        const lower = formatted.toLowerCase();
        if (this.matchesAtStart(lower, this.pack.punctQuestionRe)) {
          formatted += "?";
        } else if (lower.match(this.pack.punctExclaimRe)) {
          formatted += "!";
        } else if (formatted.length > 5) {
          formatted += ".";
        }
      }
    }

    return formatted + " ";
  }

  matchesAtStart(text, re) {
    if (!re || !text) return false;
    const flags = String(re.flags || "").replace("g", "");
    const anchored = new RegExp(
      "^\\s*(?:[«\"'“„¿¡(]*)(?:" + re.source + ")",
      flags,
    );
    return anchored.test(text);
  }

  /**
   * Show a transient message in the status line without resetting recording / pause mode.
   * @param {boolean} [asError] - if true, briefly style the card as an error (idle/error UI).
   */
  showTransientStatus(message, durationMs = 2000, asError = false) {
    clearTimeout(this._transientStatusTimer);

    const restore = () => {
      if (this.isRecording) this.updateUIStatus("recording");
      else if (this.isPaused)
        this.updateUIStatus("paused", this.pack.statusPaused);
      else this.updateUIStatus("idle");
    };

    if (asError && !this.isRecording && !this.isPaused) {
      this.updateUIStatus("error", message);
      this._transientStatusTimer = setTimeout(() => restore(), durationMs);
      return;
    }

    if (this.isRecording || this.isPaused) {
      this.status.textContent = message;
    } else if (asError) {
      this.updateUIStatus("error", message);
    } else {
      this.updateUIStatus("idle", message);
    }

    this._transientStatusTimer = setTimeout(() => restore(), durationMs);
  }

  updateUIStatus(state, message = "") {
    const p = this.pack;
    this.statusCard.classList.remove(
      "status-recording",
      "status-idle",
      "status-error",
      "status-preparing",
    );
    this.recordingTime.style.display = "none";
    if (this.waveContainer) this.waveContainer.style.display = "none";

    const startLabel = this.startBtn.querySelector("span");

    if (state === "recording") {
      this.statusCard.classList.add("status-recording");
      this.status.textContent = message || p.statusRecording;
      this.recordingTime.style.display = "flex";
      if (this.waveContainer) this.waveContainer.style.display = "flex";
      if (startLabel) startLabel.textContent = p.btnStart;
      this.startBtn.classList.add("hidden");
      this.pauseBtn.classList.remove("hidden");
      this.stopBtn.classList.remove("hidden");
    } else if (state === "paused") {
      this.statusCard.classList.add("status-idle");
      this.status.textContent = message || p.statusPaused;
      this.recordingTime.style.display = "flex";
      if (startLabel) startLabel.textContent = p.btnResume;
      this.startBtn.classList.remove("hidden");
      this.pauseBtn.classList.add("hidden");
      this.stopBtn.classList.remove("hidden");
    } else if (state === "idle") {
      this.statusCard.classList.add("status-idle");
      this.status.textContent = message || p.statusReady;
      if (startLabel) startLabel.textContent = p.btnStart;
      this.startBtn.classList.remove("hidden");
      this.pauseBtn.classList.add("hidden");
      this.stopBtn.classList.add("hidden");
    } else if (state === "error") {
      this.statusCard.classList.add("status-error");
      this.status.textContent = message || p.statusErrorGeneric;
      if (startLabel) startLabel.textContent = p.btnStart;
      this.startBtn.classList.remove("hidden");
      this.pauseBtn.classList.add("hidden");
      this.stopBtn.classList.add("hidden");
    } else if (state === "preparing") {
      this.statusCard.classList.add("status-preparing");
      this.status.textContent = message || p.statusPreparing;
      if (startLabel) startLabel.textContent = p.btnStart;
      this.startBtn.classList.add("hidden");
      this.pauseBtn.classList.add("hidden");
      this.stopBtn.classList.remove("hidden");
    }
  }

  copyToClipboard() {
    const text = this.output.value;
    const done = () => this.showTransientStatus(this.pack.toastCopied);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(() => {
          this.output.select();
          document.execCommand("copy");
          done();
        });
      return;
    }

    this.output.select();
    document.execCommand("copy");
    done();
  }

  showPrivacyConsent() {
    if (this.privacyConsent) {
      this.privacyConsent.style.display = "flex";
    }
  }

  hidePrivacyConsent() {
    if (this.privacyConsent) {
      this.privacyConsent.style.display = "none";
    }
  }

  acceptPrivacyConsent() {
    this.privacyConsentAccepted = true;
    chrome.storage.local.set({ privacyConsentAccepted: true });
    this.hidePrivacyConsent();
  }

  clearText() {
    if (!this.output.value) return;
    const question = this.pack.clearConfirm || "Clear the entire draft?";
    if (!window.confirm(question)) return;
    this.output.value = "";
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.sessionWordCount = 0;
    this.updateStats();
    this.updateEditorOverlay();
    chrome.storage.local.set({ textDraft: "", textDraftSavedAt: Date.now() });
    this.showTransientStatus(this.pack.toastCleared);
  }

  closeSidePanel() {
    if (this.isRecording || this.isPaused) {
      this.stopRecording();
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    clearTimeout(this._transientStatusTimer);
    if (this.draftRetention === "on-close") {
      this.output.value = "";
      this.finalTranscript = "";
      this.interimTranscript = "";
      chrome.storage.local.set({ textDraft: "", textDraftSavedAt: Date.now() });
    } else {
      this.flushTextDraft();
    }
    this.safeRuntimeSend({ action: "closeSidePanel" });
    window.close();
  }

  updateStats() {
    const text = this.output.value.trim();
    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    this.sessionWordCount = wordCount;
    this.sessionStats.innerHTML = `<span>${this.pack.sessionWords(wordCount)}</span>`;
  }

  updateEditorOverlay() {
    if (!this.editorOverlay) return;
    this.editorOverlay.style.pointerEvents = "none";
    this.editorOverlay.style.opacity = this.output.value.length > 0 ? "0" : "1";
  }

  setupSpellCheck() {
    this.output.setAttribute("spellcheck", "true");
    const code = this.languageSelect?.value || this.currentLanguage || "en";
    this.output.setAttribute("lang", String(code).split("-")[0]);
  }

  handleGlobalKeyboardShortcuts(e) {
    if (e.repeat) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && e.code === "Enter") {
      this.insertTextToActiveField();
      e.preventDefault();
    }
  }

  saveSettings() {
    const settings = {
      language: this.languageSelect.value,
      uiLanguage: this.uiLanguageSelect?.value || this.uiLanguage,
      autoPunctuation: this.autoPunctuationSelect.value,
      draftRetention: this.draftRetentionSelect?.value || this.draftRetention,
      textDraft: this.output.value,
      textDraftSavedAt: Date.now(),
    };
    chrome.storage.local.set(settings);
  }

  flushTextDraft() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    chrome.storage.local.set({
      textDraft: this.output.value,
      textDraftSavedAt: Date.now(),
    });
  }

  saveTextDraft() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.flushTextDraft();
    }, 1000);
  }

  defaultLocale() {
    const ui = chrome.i18n?.getUILanguage?.() || navigator.language || "en-US";
    if (globalThis.AppI18n?.normalizeLocale) {
      return globalThis.AppI18n.normalizeLocale(ui);
    }
    return "en-US";
  }

  loadSavedSettings() {
    const fallback = this.defaultLocale();
    chrome.storage.local.get(
      [
        "language",
        "uiLanguage",
        "autoPunctuation",
        "textDraft",
        "textDraftSavedAt",
        "draftRetention",
        "privacyConsentAccepted",
      ],
      (result) => {
        const recognition = result.language || fallback;
        const ui = result.uiLanguage || fallback;
        if (this.languageSelect) {
          this.languageSelect.value = recognition;
          this.currentLanguage = recognition;
        }
        if (this.uiLanguageSelect) {
          this.uiLanguageSelect.value = ui;
          this.uiLanguage = ui;
        }
        if (
          result.autoPunctuation !== undefined &&
          result.autoPunctuation !== null
        ) {
          this.autoPunctuationSelect.value = result.autoPunctuation;
          this.autoPunctuationLevel = result.autoPunctuation;
        }
        if (this.draftRetentionSelect) {
          const retention = result.draftRetention || "keep";
          this.draftRetentionSelect.value = retention;
          this.draftRetention = retention;
        }
        const draftAgeMs = Date.now() - (result.textDraftSavedAt || 0);
        const draftExpired =
          result.draftRetention === "7d" &&
          result.textDraftSavedAt &&
          draftAgeMs > 7 * 24 * 60 * 60 * 1000;
        if (draftExpired) {
          chrome.storage.local.set({ textDraft: "", textDraftSavedAt: Date.now() });
        } else if (result.textDraft) {
          if (!result.textDraftSavedAt) {
            chrome.storage.local.set({ textDraftSavedAt: Date.now() });
          }
          this.output.value = result.textDraft;
          this.finalTranscript = result.textDraft;
          this.interimTranscript = "";
          this.updateStats();
          this.updateEditorOverlay();
        }

        this.privacyConsentAccepted = Boolean(result.privacyConsentAccepted);
        if (!this.privacyConsentAccepted) {
          this.showPrivacyConsent();
        } else {
          this.hidePrivacyConsent();
        }

        this.applyAppLocale();
        this.setupSpellCheck();
      },
    );
  }
}

let sttAppInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  sttAppInstance = new SpeechToTextPro();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!sttAppInstance) {
    sendResponse({ success: false, error: "Not initialized" });
    return true;
  }

  if (request.action === "pasteCompleted") {
    if (request.success) {
      sttAppInstance.showTransientStatus(sttAppInstance.pack.toastPasteOk);
    } else {
      sttAppInstance.showTransientStatus(
        sttAppInstance.pack.toastPasteFail,
        2500,
        true,
      );
    }
    sendResponse({ success: true });
  }

  return true;
});
