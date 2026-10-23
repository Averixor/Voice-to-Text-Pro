# Chrome Web Store listing copy (Voice to Text Pro 3.4.1)

## Privacy Policy URL (paste into CWS form)

`https://averixor.github.io/Voice-to-Text-Pro/privacy.html`

Also available at site root: `https://averixor.github.io/Voice-to-Text-Pro/`

Local package copy (in-extension link only): `privacy.html`.

## Upload package

`dist/Voice-to-Text-Pro-v3.4.1.zip` — runtime only (`manifest.json` version **3.4.1**). No `tests/`, docs, or `.github/`.

## Listing screenshots

In `store/screenshots/` (not inside the ZIP):

1. `01-privacy-consent-1280x800.png` — consent gate (recording blocked until Accept).
2. `02-panel-ready-1280x800.png` — panel after consent, footer `v3.4.1`.
3. Do not upload `03-consent-panel-380x800.png` or `03-consent-panel-400x800.png`. Chrome Web Store wants 1280×800 or 640×400.

## If asked about Google / audio

Use this (same as the live policy):

> Recognition uses the browser Web Speech API. In desktop Google Chrome this typically sends audio to Google’s speech recognition servers over the internet. An active network connection is required for recognition. The extension does not run a separate speech model on your device.

## Single purpose statement

Convert speech to text and insert the resulting draft into a page field chosen by the user. Controls and the draft are in the Chrome side panel. Recognition runs in an extension recorder tab because the side panel cannot use the microphone reliably.

## Permission justifications

### activeTab

Used only when the user invokes the extension (side-panel Insert, keyboard command, or context-menu paste) so the extension can reach the active tab for paste injection.

### scripting

Inject paste helper only after an explicit user gesture (Insert or context-menu paste).

Longer form (if the form allows detail): injects `content.js` into the tab after the gesture, including frames the extension can access, so the draft can be pasted into the focused editable field. No permanent `content_scripts`. If the tab URL is hidden, the panel asks for optional http/https access instead of guessing an origin.

### storage

Stores recognition language, interface language, punctuation level, draft retention, text draft, and privacy-consent flag in `chrome.storage.local` on the device. The user can keep the draft, clear it when the panel closes, or clear it after 7 days.

### sidePanel

Provides the primary UI for recording, editing, and settings.

### contextMenus

Adds a context-menu item on editable fields to paste the saved draft.

### optional_host_permissions (`http://*/*`, `https://*/*`) — KEEP

**Decision:** keep in the manifest. Not granted at install. Context-menu paste calls `chrome.permissions.request` from the service worker when an origin is known. Insert, which runs from the side panel, requests either that origin or both `http://*/*` and `https://*/*` when `tab.url` is missing. Do not remove while those call sites exist.

There is no `notifications` permission. Recording state is shown in the side panel and the recorder tab.

## Remote code

The extension does not load or execute remote code. All scripts ship in the package. Speech recognition uses the browser Web Speech API (network to Google’s speech service), which is disclosed in the in-product privacy notice and in `privacy.html`.

## Data use (short)

- Audio: sent to Google Web Speech for recognition while recording (internet required).
- Text draft and settings: stored locally in `chrome.storage.local`.
- No first-party analytics or account server.

## Deploy status

GitHub Pages is live from `main` `/` (legacy). Privacy policy HTTPS URL above is verified HTTP 200.
