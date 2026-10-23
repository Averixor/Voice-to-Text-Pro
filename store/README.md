# Chrome Web Store listing assets

Not packaged in the extension ZIP.

## Screenshots

| File                                          | Use                                      |
| --------------------------------------------- | ---------------------------------------- |
| `screenshots/01-privacy-consent-1280x800.png` | Primary — consent gate before recording  |
| `screenshots/02-panel-ready-1280x800.png`     | After consent, UI ready, footer `v3.4.1` |
| `screenshots/03-consent-panel-380x800.png`    | Do not upload — store needs 1280×800 or 640×400 |
| `screenshots/03-consent-panel-400x800.png`    | Do not upload — same size problem          |

Upload **01** and **02** only. Do not upload the 380×800 or 400×800 crops.

## Package

Build from repo root:

```bash
npm run pack
# writes dist/Voice-to-Text-Pro-v3.4.1.zip with manifest.json at the zip root
```

Runtime-only; `manifest.json` → `"version": "3.4.1"`.
