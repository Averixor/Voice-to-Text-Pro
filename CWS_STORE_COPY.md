# Chrome Web Store listing copy (Voice to Text Pro 3.4.1)

## Privacy Policy URL

After you push `main` and enable GitHub Pages (Settings → Pages → Deploy from branch `main` / root):

`https://averixor.github.io/Voice-to-Text-Pro/privacy.html`

Until Pages is live, do not submit the listing with a broken URL.

Local package copy (not valid for the store field): `privacy.html` inside the extension.

## Single purpose statement

Voice to Text Pro converts the user’s speech into text in the Chrome Side Panel, lets them edit the draft, and inserts that text into a field they choose on the current page.

## Permission justifications

### activeTab

Used only when the user invokes the extension (side-panel Insert, keyboard command, or context-menu paste) so the extension can reach the active tab for paste injection.

### scripting

Used only after an explicit user gesture (Insert in the side panel or “paste transcript” in the context menu) to inject `i18n.js` and `content.js` into that tab when they are not already present, so the draft can be pasted into the focused editable field. There is no permanent `content_scripts` registration and no background inject without a gesture.

### storage

Stores recognition language, punctuation level, text draft, and privacy-consent flag in `chrome.storage.local` on the device.

### sidePanel

Provides the primary UI for recording, editing, and settings.

### contextMenus

Adds a context-menu item on editable fields to paste the saved draft.

### notifications

Shows an optional “recording started” notification when recognition begins in the side panel.

### optional_host_permissions (`http://*/*`, `https://*/*`)

Not granted at install. Requested only for the specific site origin when paste inject needs lasting host access beyond the temporary `activeTab` grant (for example Insert from the side panel). The user must approve the Chrome permission prompt. If they deny it, paste fails safely without broader access.

## Remote code

The extension does not load or execute remote code. All scripts ship in the package. Speech recognition uses the browser Web Speech API (network to Google’s speech service), which is disclosed in the in-product privacy notice and in `privacy.html`.

## Data use (short)

- Audio: sent to Google Web Speech for recognition while recording (internet required).
- Text draft and settings: stored locally in `chrome.storage.local`.
- No first-party analytics or account server.

## Deploy commands (run on a machine with GitHub auth)

```bash
git push -u origin main
# GitHub → Settings → Pages → Source: Deploy from a branch → main → / (root) → Save
# Wait ~1 minute, then open:
# https://averixor.github.io/Voice-to-Text-Pro/privacy.html
```
