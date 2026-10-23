// ===========================================
// sidepanel.js - Chrome side panel page
// SpeechRecognition, applyAppLocale(), storage, shortcuts, paste to tab.
// ===========================================

class SpeechToTextPro {
  constructor() {
    this.recognition = null;
    this.isRecording = false;
    this.isPaused = false;
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.microphoneAccessGranted = false;
    this.recordingStartTime = null;
    this.recordingTimer = null;
    this.spellCheckEnabled = false;
    this.autoPunctuationLevel = "medium";
    this.sessionWordCount = 0;
    this.currentLanguage = "ru-RU";
    this.saveTimeout = null;
    this._transientStatusTimer = null;

    this.privacyConsentAccepted = false;
    this.sidePanelPort = null;

    this.initializeElements();
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
    try {
      this.sidePanelPort = chrome.runtime.connect({ name: "sidePanel" });
    } catch (error) {
      console.error("Failed to connect side panel port:", error);
    }
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
    this.autoPunctuationSelect = document.getElementById("autoPunctuation");
    this.instructions = document.getElementById("instructions");
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
    if (!globalThis.AppI18n || !this.languageSelect) return;
    this.pack = globalThis.AppI18n.getPack(this.languageSelect.value);
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
    for (let i = 0; i < this.languageSelect.options.length; i++) {
      const opt = this.languageSelect.options[i];
      if (p.langLabels[opt.value]) opt.textContent = p.langLabels[opt.value];
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

    this.languageSelect.addEventListener("change", () => {
      this.applyAppLocale();
      this.saveSettings();
    });
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

    this.output.addEventListener("paste", () => {
      setTimeout(() => {
        this.updateStats();
        this.updateEditorOverlay();
        this.saveTextDraft();
      }, 50);
    });
  }

  static getSpeechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  checkBrowserSupport() {
    if (!SpeechToTextPro.getSpeechRecognitionCtor()) {
      this.status.textContent = this.pack.statusBrowserErr;
      this.statusCard.classList.remove("status-info");
      this.statusCard.classList.add("status-error");
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = true;
      this.stopBtn.disabled = true;
    } else {
      this.initRecognition();
    }
  }

  initRecognition() {
    const Recognition = SpeechToTextPro.getSpeechRecognitionCtor();
    if (!Recognition) return;
    this.recognition = new Recognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.languageSelect.value;

    this.setupRecognitionHandlers();
  }

  setupRecognitionHandlers() {
    this.recognition.onstart = () => {
      this.isRecording = true;
      this.updateUIStatus("recording");
      this.startTimer();
      this.sendRecordingNotification();
    };

    this.recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event);
      this.stopTimer();

      if (
        event.error === "not-allowed" ||
        event.error === "permission-denied"
      ) {
        this.microphoneAccessGranted = false;
        this.instructions.style.display = "flex";
        this.status.textContent = this.pack.errMicDetail;
        this.isRecording = false;
        this.isPaused = false;
        this.updateUIStatus("error", this.pack.errMic);
      } else if (event.error === "no-speech") {
        if (this.isRecording) {
          this.recognition.start();
        }
      } else if (event.error === "network") {
        this.status.textContent = this.pack.errNetworkDetail;
        this.isRecording = false;
        this.isPaused = false;
        this.updateUIStatus("error", this.pack.errNetwork);
      } else {
        this.isRecording = false;
        this.isPaused = false;
        this.updateUIStatus("error", this.pack.errRecognition);
      }
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        console.log("Recognition ended automatically. Restarting...");
        try {
          this.recognition.start();
        } catch (e) {
          console.error("Failed to restart recognition:", e);
          this.isRecording = false;
          this.isPaused = false;
          this.updateUIStatus("idle", this.pack.statusStopped);
        }
      } else if (!this.isPaused) {
        this.updateUIStatus("idle", this.pack.statusStopped);
      }
    };

    this.recognition.onresult = (event) => this.handleRecognitionResult(event);
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

  handleRecognitionResult(event) {
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        const formattedTranscript = this.formatText(transcript);
        this.ensureTranscriptBoundary(formattedTranscript);
        this.finalTranscript += formattedTranscript;
      } else {
        interimTranscript += transcript;
      }
    }

    this.ensureTranscriptBoundary(interimTranscript);
    this.interimTranscript = interimTranscript;
    this.output.value = this.finalTranscript + this.interimTranscript;
    this.output.scrollTop = this.output.scrollHeight;
    this.updateStats();
    this.updateEditorOverlay();
    this.saveTextDraft();
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

  startRecording() {
    if (!this.privacyConsentAccepted) {
      this.showPrivacyConsent();
      this.showTransientStatus(this.pack.privacyRequired, 2500, true);
      return;
    }

    if (this.isPaused) {
      this.resumeRecording();
      return;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) return;

    this.recognition.lang = this.languageSelect.value;
    this.currentLanguage = this.languageSelect.value;
    this.finalTranscript = this.output.value;
    this.interimTranscript = "";
    this.isPaused = false;
    this.isRecording = true;

    try {
      this.recognition.start();
      this.updateUIStatus("preparing", this.pack.statusMicWait);
      this.instructions.style.display = "none";
      this.saveSettings();
    } catch (e) {
      console.error("Failed to start recognition:", e);
      this.isRecording = false;
      this.isPaused = false;
      this.updateUIStatus("error", this.pack.errStartFailed);
    }
  }

  pauseRecording() {
    if (!this.recognition || !this.isRecording || this.isPaused) return;

    this.isPaused = true;
    this.isRecording = false;

    try {
      this.recognition.stop();
    } catch (e) {
      console.error("Failed to pause recognition:", e);
      this.isPaused = false;
      this.isRecording = true;
      this.updateUIStatus("recording");
      return;
    }

    this.stopTimer();
    this.saveTextDraft();
    this.updateUIStatus("paused", this.pack.statusPaused);
  }

  resumeRecording() {
    if (!this.privacyConsentAccepted) {
      this.showPrivacyConsent();
      this.showTransientStatus(this.pack.privacyRequired, 2500, true);
      return;
    }

    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition || !this.isPaused) return;

    this.isPaused = false;
    this.recognition.lang = this.languageSelect.value;
    this.currentLanguage = this.languageSelect.value;
    this.finalTranscript = this.output.value;
    this.interimTranscript = "";
    this.isRecording = true;

    try {
      this.recognition.start();
      this.updateUIStatus("preparing", this.pack.statusMicWait);
      this.saveSettings();
    } catch (e) {
      console.error("Failed to resume recognition:", e);
      this.isPaused = true;
      this.isRecording = false;
      this.updateUIStatus("paused", this.pack.statusPaused);
    }
  }

  stopRecording() {
    if (!this.recognition) return;

    this.isPaused = false;
    const wasLive = this.isRecording;
    this.isRecording = false;

    if (wasLive) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error("Failed to stop recognition:", e);
      }
    }

    this.stopTimer();
    this.saveTextDraft();
    this.updateUIStatus("idle", this.pack.statusStopped);
  }

  insertTextToActiveField() {
    const textToInsert = this.output.value;
    if (!textToInsert.trim()) {
      this.showTransientStatus(this.pack.toastNoText);
      return;
    }

    const handlePasteResponse = (response) => {
      if (response?.success) {
        this.showTransientStatus(
          this.pack.toastPasteOk || this.pack.toastPasted,
        );
      } else {
        this.showTransientStatus(this.pack.toastPasteFail, 2500, true);
      }
    };

    const requestPaste = () =>
      chrome.runtime.sendMessage({
        action: "pasteToActiveTab",
        textToPaste: textToInsert,
      });

    requestPaste()
      .then(async (response) => {
        if (
          response?.needsHostAccess &&
          response.originPattern &&
          chrome.permissions?.request
        ) {
          const granted = await chrome.permissions.request({
            origins: [response.originPattern],
          });
          if (granted) {
            return requestPaste().then(handlePasteResponse);
          }
        }
        handlePasteResponse(response);
      })
      .catch(() => {
        this.showTransientStatus(this.pack.toastPasteFail, 2500, true);
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
        if (lower.match(this.pack.punctQuestionRe)) {
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
      this.pauseBtn.classList.remove("hidden");
      this.stopBtn.classList.remove("hidden");
    }
  }

  copyToClipboard() {
    const text = this.output.value;
    const done = () => this.showTransientStatus(this.pack.toastCopied);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
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
    this.output.value = "";
    this.finalTranscript = "";
    this.interimTranscript = "";
    this.sessionWordCount = 0;
    this.updateStats();
    this.updateEditorOverlay();
    chrome.storage.local.set({ textDraft: "" });
    this.showTransientStatus(this.pack.toastCleared);
  }

  closeSidePanel() {
    if (this.isRecording) {
      this.stopRecording();
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    clearTimeout(this._transientStatusTimer);
    this.saveTextDraft();
    chrome.runtime.sendMessage({ action: "closeSidePanel" }).catch(() => {});
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
    if (this.output.value.length > 0) {
      this.editorOverlay.style.opacity = "0";
      this.editorOverlay.style.pointerEvents = "none";
    } else {
      this.editorOverlay.style.opacity = "1";
      this.editorOverlay.style.pointerEvents = "auto";
    }
  }

  setupSpellCheck() {
    this.output.setAttribute("spellcheck", "true");
    this.output.setAttribute("lang", this.languageSelect.value.split("-")[0]);
  }

  sendRecordingNotification() {
    chrome.runtime.sendMessage({ type: "recordingStarted" }).catch(() => {});
  }

  handleGlobalKeyboardShortcuts(e) {
    if (e.repeat) return;

    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.code === "KeyC" && document.activeElement === this.output) {
      this.copyToClipboard();
      e.preventDefault();
    }

    if (mod && e.code === "Delete") {
      this.clearText();
      e.preventDefault();
    }

    if (mod && e.shiftKey && e.code === "Digit1") {
      this.startRecording();
      e.preventDefault();
    }

    if (mod && e.shiftKey && e.code === "Digit2") {
      this.stopRecording();
      e.preventDefault();
    }

    if (mod && e.shiftKey && e.code === "KeyI") {
      this.insertTextToActiveField();
      e.preventDefault();
    }
  }

  saveSettings() {
    const settings = {
      language: this.languageSelect.value,
      autoPunctuation: this.autoPunctuationSelect.value,
      textDraft: this.output.value,
    };
    chrome.storage.local.set(settings);
  }

  saveTextDraft() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      chrome.storage.local.set({ textDraft: this.output.value });
    }, 1000);
  }

  loadSavedSettings() {
    chrome.storage.local.get(
      ["language", "autoPunctuation", "textDraft", "privacyConsentAccepted"],
      (result) => {
        if (result.language) {
          this.languageSelect.value = result.language;
          this.currentLanguage = result.language;
        }
        if (
          result.autoPunctuation !== undefined &&
          result.autoPunctuation !== null
        ) {
          this.autoPunctuationSelect.value = result.autoPunctuation;
          this.autoPunctuationLevel = result.autoPunctuation;
        }
        if (result.textDraft) {
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

        if (this.recognition) {
          this.recognition.lang = this.languageSelect.value;
        }

        this.applyAppLocale();
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

  if (request.action === "startRecording") {
    sttAppInstance.startRecording();
    sendResponse({ success: true });
  } else if (request.action === "stopRecording") {
    sttAppInstance.stopRecording();
    sendResponse({ success: true });
  } else if (request.action === "updateTranscript") {
    if (sttAppInstance.output) {
      sttAppInstance.finalTranscript = request.final || "";
      sttAppInstance.interimTranscript = request.interim || "";
      sttAppInstance.output.value =
        sttAppInstance.finalTranscript + sttAppInstance.interimTranscript;
      sttAppInstance.output.scrollTop = sttAppInstance.output.scrollHeight;
      sttAppInstance.updateStats();
      sttAppInstance.updateEditorOverlay();
      sttAppInstance.saveTextDraft();
    }
    sendResponse({ success: true });
  } else if (request.action === "recognitionError") {
    sttAppInstance.isRecording = false;
    sttAppInstance.isPaused = false;
    sttAppInstance.updateUIStatus(
      "error",
      `${sttAppInstance.pack.recognitionErrPrefix} ${request.error}`,
    );
    sendResponse({ success: true });
  } else if (request.action === "pasteCompleted") {
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
