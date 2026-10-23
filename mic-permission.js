// ===========================================
// mic-permission.js — grant mic for extension origin (once).
// ===========================================

(function () {
  const heading = document.getElementById("micHeading");
  const body = document.getElementById("micBody");
  const allowBtn = document.getElementById("micAllowBtn");
  const allowLabel = document.getElementById("micAllowLabel");
  const statusEl = document.getElementById("micStatus");
  const noteEl = document.getElementById("micNote");

  function packFor(lang) {
    if (typeof AppI18n === "undefined") return null;
    return AppI18n.getPack(AppI18n.normalizeLocale(lang || "en-US"));
  }

  function applyPack(pack) {
    if (!pack) return;
    document.documentElement.lang = pack.htmlLang || "en";
    document.title = pack.micPageDocTitle || "Microphone — Voice to Text Pro";
    heading.textContent = pack.micPageHeading || heading.textContent;
    body.textContent = pack.micPageBody || body.textContent;
    allowLabel.textContent = pack.micPageAllowBtn || allowLabel.textContent;
    noteEl.textContent = pack.micPageCloseHint || noteEl.textContent;
  }

  function setStatus(ok, text) {
    statusEl.className = "mic-status " + (ok ? "is-ok" : "is-err");
    statusEl.textContent = text;
    statusEl.style.display = "block";
  }

  async function markGranted() {
    try {
      await chrome.storage.local.set({ microphoneAccessGranted: true });
    } catch (e) {
      /* ignore */
    }
  }

  async function requestMicrophone(pack) {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(false, pack?.micPageDenied || "Microphone API unavailable.");
      return;
    }

    allowBtn.disabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await markGranted();
      setStatus(
        true,
        pack?.recorderGrantedClosing ||
          "Microphone allowed. This window will close…",
      );
      allowLabel.textContent = pack?.micPageAllowedBtn || "Allowed";
      setTimeout(() => {
        try {
          window.close();
        } catch (err) {
          /* ignore */
        }
      }, 900);
    } catch (e) {
      allowBtn.disabled = false;
      setStatus(
        false,
        pack?.micPageDenied ||
          "Access denied. Click Allow in the Chrome prompt, or reset the block in Chrome microphone settings.",
      );
    }
  }

  async function probeExisting(pack) {
    if (!navigator.permissions?.query) return;
    try {
      const result = await navigator.permissions.query({ name: "microphone" });
      if (result.state === "granted") {
        await markGranted();
        setStatus(
          true,
          pack?.recorderGrantedClosing ||
            "Microphone already allowed. This window will close…",
        );
        allowLabel.textContent = pack?.micPageAllowedBtn || "Allowed";
        allowBtn.disabled = true;
        setTimeout(() => {
          try {
            window.close();
          } catch (err) {
            /* ignore */
          }
        }, 900);
      }
    } catch (e) {
      /* permissions.query(microphone) not supported in all builds */
    }
  }

  chrome.storage.local.get("language", (stored) => {
    const pack = packFor(stored.language || "ru-RU");
    applyPack(pack);
    probeExisting(pack);
    allowBtn.addEventListener("click", () => requestMicrophone(pack));
  });
})();
