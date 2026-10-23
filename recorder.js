// ===========================================
// recorder.js — SpeechRecognition host (extension window).
// Side panel cannot reliably use the mic; this window can.
// ===========================================

(function () {
  const brandTitle = document.getElementById("recBrandTitle");
  const brandTag = document.getElementById("recBrandTag");
  const heading = document.getElementById("recHeading");
  const body = document.getElementById("recBody");
  const allowBtn = document.getElementById("recAllowBtn");
  const allowLabel = document.getElementById("recAllowLabel");
  const statusEl = document.getElementById("recStatus");
  const tutorialHeading = document.getElementById("recTutorialHeading");
  const step1 = document.getElementById("recStep1");
  const step2 = document.getElementById("recStep2");
  const step3 = document.getElementById("recStep3");
  const step4 = document.getElementById("recStep4");
  const keysEl = document.getElementById("recKeys");

  /** @type {chrome.runtime.Port|null} */
  let port = null;
  /** @type {SpeechRecognition|null} */
  let recognition = null;
  let isRecording = false;
  let isPaused = false;
  let restartTimer = null;
  let language = "ru-RU";
  /** @type {ReturnType<typeof AppI18n.getPack>|null} */
  let pack = null;
  let pendingStart = false;
  let emitStoppedOnEnd = true;
  let sessionAnnounced = false;
  let closeTimer = null;
  const params = new URLSearchParams(location.search);
  const autoStart = params.get("autostart") === "1";

  function getPack(lang) {
    if (typeof AppI18n === "undefined") return null;
    return AppI18n.getPack(AppI18n.normalizeLocale(lang || "en-US"));
  }

  function setHtml(el, html) {
    if (el && html !== undefined) el.innerHTML = html;
  }

  function setText(el, text) {
    if (el && text !== undefined) el.textContent = text;
  }

  function applyPack(p) {
    pack = p;
    if (!p) return;
    document.documentElement.lang = p.htmlLang || "en";
    document.title = p.recorderDocTitle || "Recorder — Voice to Text Pro";
    setText(brandTitle, p.headerTitle);
    setText(brandTag, p.recorderBrandTag || p.tagline);
    setText(heading, p.recorderHeading);
    setText(body, p.recorderBody);
    setText(tutorialHeading, p.recorderTutorialHeading);
    setText(step1, p.recorderStep1);
    setText(step2, p.recorderStep2);
    setText(step3, p.recorderStep3);
    setText(step4, p.recorderStep4);
    setHtml(keysEl, p.recorderKeysHtml);
    if (!isRecording) {
      setText(allowLabel, p.micPageAllowBtn);
    }
  }

  function setStatus(kind, text) {
    statusEl.className = "rec-status is-" + kind;
    statusEl.textContent = text;
    statusEl.style.display = "block";
  }

  function cancelAutoClose() {
    if (closeTimer !== null) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  /** Close the recorder tab after mic grant or Stop — no manual close needed. */
  function scheduleClose(delayMs) {
    cancelAutoClose();
    closeTimer = setTimeout(() => {
      closeTimer = null;
      post({ type: "closeRecorderWindow" });
    }, delayMs);
  }

  function post(message) {
    if (!port) return;
    try {
      port.postMessage(message);
    } catch (e) {
      /* port gone */
    }
  }

  function connectPort() {
    try {
      port = chrome.runtime.connect({ name: "recorder" });
      port.onMessage.addListener(onPortMessage);
      port.onDisconnect.addListener(() => {
        port = null;
        setTimeout(connectPort, 250);
      });
      post({ type: "recorderReady" });
      if (pendingStart) {
        startRecognition();
      }
    } catch (e) {
      setTimeout(connectPort, 500);
    }
  }

  function onPortMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.language) language = msg.language;

    if (msg.type === "startRecording") {
      startRecognition();
    } else if (msg.type === "stopRecording") {
      stopRecognition();
    } else if (msg.type === "pauseRecording") {
      pauseRecognition();
    } else if (msg.type === "resumeRecording") {
      resumeRecognition();
    }
  }

  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function cancelRestart() {
    if (restartTimer !== null) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function scheduleRestart() {
    cancelRestart();
    restartTimer = setTimeout(() => {
      restartTimer = null;
      if (!recognition || !isRecording || isPaused) return;
      try {
        recognition.start();
      } catch (e) {
        if (e && e.name === "InvalidStateError") return;
        isRecording = false;
        post({ type: "recorderError", error: "restart-failed" });
        setStatus("err", pack?.errStartFailed || "Failed to restart");
      }
    }, 50);
  }

  async function ensureMic() {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (e) {
      return false;
    }
  }

  function initRecognition() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus(
        "err",
        pack?.statusBrowserErr || "SpeechRecognition unavailable",
      );
      return false;
    }
    if (recognition) return true;

    recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      isRecording = true;
      allowBtn.disabled = true;
      allowLabel.textContent = pack?.micPageAllowedBtn || "Allowed";
      statusEl.innerHTML =
        '<span class="rec-dot" aria-hidden="true"></span>' +
        (pack?.recorderListening ||
          "Recording… This tab stays in the background.");
      statusEl.className = "rec-status is-live";
      statusEl.style.display = "block";
      // Announce once per user session — not on every silence restart.
      // Background switches the user back to their previous tab.
      if (!sessionAnnounced) {
        sessionAnnounced = true;
        post({ type: "recorderStarted" });
      }
    };

    recognition.onerror = (event) => {
      const errorCode = event?.error || "unknown";
      if (errorCode === "no-speech" || errorCode === "aborted") return;

      cancelRestart();
      isRecording = false;
      isPaused = false;
      sessionAnnounced = false;
      emitStoppedOnEnd = false;
      post({ type: "recorderError", error: errorCode });

      if (errorCode === "not-allowed" || errorCode === "permission-denied") {
        allowBtn.disabled = false;
        allowLabel.textContent = pack?.micPageAllowBtn || "Allow microphone";
        setStatus("err", pack?.micPageDenied || "Microphone denied");
      } else {
        setStatus("err", pack?.errRecognition || errorCode);
      }
    };

    recognition.onend = () => {
      if (isRecording && !isPaused) {
        scheduleRestart();
        return;
      }
      if (!isPaused && emitStoppedOnEnd) {
        post({ type: "recorderStopped" });
        setStatus(
          "ok",
          pack?.recorderIdle || "Idle. Press Start in the side panel.",
        );
      }
      emitStoppedOnEnd = true;
    };

    recognition.onresult = (event) => {
      const chunks = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        chunks.push({
          transcript: event.results[i][0].transcript,
          isFinal: event.results[i].isFinal,
        });
      }
      post({
        type: "recorderResult",
        resultIndex: event.resultIndex,
        chunks,
      });
    };

    return true;
  }

  async function startRecognition() {
    pendingStart = false;
    emitStoppedOnEnd = true;
    const ok = await ensureMic();
    if (!ok) {
      allowBtn.disabled = false;
      allowLabel.textContent = pack?.micPageAllowBtn || "Allow microphone";
      setStatus(
        "err",
        pack?.micPageDenied ||
          "Click «Allow microphone» on this tab, then confirm in Chrome.",
      );
      // Ask background to show this tab beside the user's page for Allow.
      post({ type: "needMicFocus" });
      return;
    }

    if (!initRecognition()) return;

    isPaused = false;
    recognition.lang = language;
    cancelRestart();

    try {
      recognition.start();
    } catch (e) {
      if (e && e.name === "InvalidStateError") {
        isRecording = true;
        if (!sessionAnnounced) {
          sessionAnnounced = true;
          post({ type: "recorderStarted" });
        }
        return;
      }
      post({ type: "recorderError", error: "start-failed" });
      setStatus("err", pack?.errStartFailed || "Failed to start");
    }
  }

  function stopRecognition() {
    isPaused = false;
    isRecording = false;
    sessionAnnounced = false;
    emitStoppedOnEnd = false;
    cancelRestart();
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        /* ignore */
      }
    }
    post({ type: "recorderStopped" });
    setStatus("ok", pack?.recorderClosing || "Done. Closing…");
    scheduleClose(600);
  }

  function pauseRecognition() {
    if (!isRecording || isPaused) return;
    isPaused = true;
    isRecording = false;
    sessionAnnounced = false;
    cancelRestart();
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        /* ignore */
      }
    }
    post({ type: "recorderPaused" });
    setStatus("ok", pack?.statusPaused || "Paused");
  }

  async function resumeRecognition() {
    isPaused = true;
    await startRecognition();
  }

  allowBtn.addEventListener("click", async () => {
    const ok = await ensureMic();
    if (ok) {
      allowBtn.disabled = true;
      allowLabel.textContent = pack?.micPageAllowedBtn || "Allowed";
      post({ type: "micGranted" });
      if (autoStart) {
        setStatus(
          "ok",
          pack?.micPageSuccess || "Microphone allowed. Starting…",
        );
        startRecognition();
      } else {
        setStatus(
          "ok",
          pack?.recorderGrantedClosing ||
            "Microphone allowed. This tab will close…",
        );
        scheduleClose(900);
      }
    } else {
      setStatus("err", pack?.micPageDenied || "Microphone denied");
      post({ type: "needMicFocus" });
    }
  });

  chrome.storage.local.get(["language"], (stored) => {
    language = stored.language || "ru-RU";
    applyPack(getPack(language));
    connectPort();

    if (autoStart) {
      if (port) startRecognition();
      else pendingStart = true;
    } else {
      // Setup / mic-prompt tab: try silently; if denied, wait for Allow click.
      ensureMic().then((ok) => {
        if (ok) {
          allowBtn.disabled = true;
          allowLabel.textContent = pack?.micPageAllowedBtn || "Allowed";
          post({ type: "micGranted" });
          setStatus(
            "ok",
            pack?.recorderGrantedClosing ||
              "Microphone allowed. This tab will close…",
          );
          scheduleClose(900);
        } else {
          setStatus(
            "err",
            pack?.micPageDenied ||
              "Click Allow microphone, then confirm in Chrome.",
          );
        }
      });
    }
  });
})();
