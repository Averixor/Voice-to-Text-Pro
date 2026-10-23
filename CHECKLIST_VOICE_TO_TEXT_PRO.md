# Voice to Text Pro — project checklist v3.4

## Project description

**Voice to Text Pro** is a Google Chrome extension (Manifest V3): speech to text via Web Speech API, **four AI punctuation levels**, spell check in the input field, UI in the **side panel**. The selected **recognition language** drives STT, spell check, and the native string pack in **`i18n.js`** (including `ru-RU` / `uk-UA`). Recording-started notification and context menu item are localized in **`background.js`** from `storage.language`. Paste injects `content.js` on demand after a user gesture; there is no permanent `content_scripts` block.

---

## Project structure

```text
Voice-to-Text-Pro-v3.4/
├── manifest.json                 # MV3: permissions, optional_host_permissions, side_panel, commands
├── background.js                 # Service worker: menu, notifications, commands, on-demand paste
├── i18n.js                       # UI strings + punctuation regex; globalThis.AppI18n
├── sidepanel.html                # Panel markup (i18n.js + sidepanel.js)
├── sidepanel.js                  # Panel recognition, privacy consent, applyAppLocale(), storage
├── content.js                    # Paste-only helper (injected after user gesture)
├── privacy.html                  # Privacy Policy (package copy)
├── styles.css                    # Side panel styles + prefers-reduced-motion
├── LICENSE                       # MIT
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md                     # User / developer documentation
├── CHANGELOG.md                  # Change history
└── CHECKLIST_VOICE_TO_TEXT_PRO.md
```

---

## Completed fixes and features

### v3.3 — critical and syntax fixes

- [x] `background.js` — `return true` / `sendResponse` in message handlers
- [x] `background.js` — panel close and side panel wiring
- [x] `content.js` — paste, messages, settings
- [x] `sidepanel.js` — insertBtn, punctuation, `sendMessage` instead of `connect`
- [x] `sidepanel.html` / `styles.css` — markup and styles for actual UI
- [x] `manifest.json` — version 3.3 → 3.4

### v3.4 — UX, pause, accessibility, localization, reliability

- [x] **Pause / Resume** — full cycle without text loss
- [x] Two button groups: recording and text actions; labels always visible
- [x] **Close panel** — `window.close()` + `tabs.query` in background
- [x] **Capitalization** — based on `finalTranscript.trimEnd().slice(-1)`
- [x] Load punctuation level **`off`** (not only truthy check)
- [x] `showTransientStatus()` — transient messages without mode reset
- [x] **`SpeechRecognition`** fallback in the panel
- [x] `e.repeat` ignored in keyboard handler
- [x] ARIA, `role="status"`, visually-hidden label, `status-idle` on load
- [x] `closeSidePanel()` — stop recording, save draft
- [x] `recognitionError` clears flags correctly
- [x] **`i18n.js`** + **`applyAppLocale()`** — selected list locale loads its native string pack (including `ru-RU` / `uk-UA`)
- [x] **`globalThis.AppI18n`** — safe export (including worker via `importScripts`)
- [x] **`background.js`**: `updateSettings` partially saves `language` and/or `autoPunctuation`
- [x] **Notification** and **context menu** follow `storage.language`; menu update + fallback on `update` error
- [x] **`sendPasteToTab`** + **`chrome.scripting.executeScript`** (`i18n.js`, `content.js`) when content script missing
- [x] **`content.js`**: paste-only helper (no tab STT); password / non-text inputs excluded
- [x] Documentation: README, CHANGELOG, CHECKLIST

---

## File roles in v3.4

- **`manifest.json`** — v3.4; `optional_host_permissions`; no permanent `content_scripts`; `scripting` + on-demand inject.
- **`i18n.js`** — UI localization and punctuation regex; `globalThis.AppI18n`.
- **`background.js`** — menu/notification by language; `updateSettings` (partial fields); `sendPasteToTab` + optional script inject.
- **`sidepanel.js`** — pause, `applyAppLocale()`, transient status, capitalization, panel close, a11y.
- **`sidepanel.html`** — loads `i18n.js`; markup for pause and accessibility.
- **`content.js`** — paste-only; editable-field tracking; injected on demand.
- **`styles.css`** — panel styles, accessibility, media queries.
- **Docs** — `README.md`, `CHANGELOG.md`, `CHECKLIST_VOICE_TO_TEXT_PRO.md` (aligned with code).

---

## Manual test checklist

### Functional

- Start / stop recognition — pass
- Pause and resume — pass
- Auto-restart on recognition drop — pass
- Paste into `input` / `textarea` — pass
- Paste into `contentEditable` — pass
- Copy / clear — pass
- Close panel — pass
- Draft and settings persistence — pass
- Language change (UI + STT + spellcheck) — verify before release

### UI and localization

- Transitions idle → recording → paused → idle — pass
- Start / pause / stop buttons — pass
- Language list updates panel strings — verify before release
- Notification and context menu match `storage.language` — verify before release

### Shortcuts

- `Ctrl+Shift+1` start — pass
- `Ctrl+Shift+2` stop — pass
- `Ctrl+Shift+I` insert — pass
- `Ctrl+Shift+9` toggle panel — pass
- `Ctrl+C` / `Ctrl+Del` in field — pass

### Punctuation

- **off** — no auto punctuation — pass
- **low** — period at segment end — pass
- **medium** — period when length threshold met — pass
- **high** — `?` / `!` / `.` via language rules (`i18n.js`) — pass

---

## Future ideas

1. Export text to files (.txt, .md)
2. Session history
3. Voice commands
4. Cloud backup
5. Offline recognition (separate engine)
6. `_locales` in manifest for `commands` descriptions per UI language
7. Themes and font size

---

## Notes

- Critical v3.3 checklist items closed; v3.4 adds UX and localization
- Chrome Web Speech API depends on network
- Permissions: microphone (site / usage context), internet

---

**Documentation updated:** May 2026
**Project version (`manifest`):** 3.4
**Status:** ready to ship after regression on language switching
