# Chrome Web Store listing copy (Voice to Text Pro 3.4.1)

## Privacy Policy URL (paste into CWS form)

`https://averixor.github.io/Voice-to-Text-Pro/privacy.html`

Also available at site root: `https://averixor.github.io/Voice-to-Text-Pro/`

Local package copy (in-extension link only): `privacy.html`.

## Single purpose statement

Convert speech to text in the Chrome Side Panel and insert the resulting draft into a page field chosen by the user.

## Permission justifications

### activeTab

Used only when the user invokes the extension (side-panel Insert, keyboard command, or context-menu paste) so the extension can reach the active tab for paste injection.

### scripting

Inject paste helper only after an explicit user gesture (Insert or context-menu paste).

Longer form (if the form allows detail): injects `i18n.js` and `content.js` into that tab only when they are not already present, so the draft can be pasted into the focused editable field. No permanent `content_scripts`; no background inject without a gesture.

### storage

Stores recognition language, punctuation level, text draft, and privacy-consent flag in `chrome.storage.local` on the device.

### sidePanel

Provides the primary UI for recording, editing, and settings.

### contextMenus

Adds a context-menu item on editable fields to paste the saved draft.

### notifications

Shows an optional “recording started” notification when recognition begins in the side panel.

### optional_host_permissions (`http://*/*`, `https://*/*`) — KEEP

**Decision:** keep in the manifest. Code calls `chrome.permissions.request({ origins: [originPattern] })` in `background.js` (context-menu paste) and `sidepanel.js` (Insert when inject needs host access). Not granted at install; user approves per origin. Do not remove while those call sites exist.

## Remote code

The extension does not load or execute remote code. All scripts ship in the package. Speech recognition uses the browser Web Speech API (network to Google’s speech service), which is disclosed in the in-product privacy notice and in `privacy.html`.

## Data use (short)

- Audio: sent to Google Web Speech for recognition while recording (internet required).
- Text draft and settings: stored locally in `chrome.storage.local`.
- No first-party analytics or account server.

## Deploy status

GitHub Pages is live from `main` `/` (legacy). Privacy policy HTTPS URL above is verified HTTP 200.
