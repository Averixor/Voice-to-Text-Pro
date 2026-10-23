import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
);

const files = [
  "manifest.json",
  "background.js",
  "sidepanel.html",
  "sidepanel.js",
  "styles.css",
  "content.js",
  "recorder.html",
  "recorder.js",
  "i18n.js",
  "privacy.html",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing pack file: ${file}`);
    process.exit(1);
  }
}

const outDir = path.join(root, "dist");
fs.mkdirSync(outDir, { recursive: true });
const outName = `Voice-to-Text-Pro-v${manifest.version}.zip`;
const outPath = path.join(outDir, outName);
fs.rmSync(outPath, { force: true });

const zip = spawnSync("zip", ["-r", outPath, ...files], {
  cwd: root,
  stdio: "inherit",
});
if (zip.status !== 0) {
  process.exit(zip.status || 1);
}

const listing = spawnSync("unzip", ["-l", outPath], { encoding: "utf8" });
const listingText = listing.stdout || "";
if (!listingText.includes("manifest.json")) {
  console.error("Zip is missing manifest.json");
  process.exit(1);
}
if (listingText.includes("manifest.json") && /\/manifest\.json/.test(listingText)) {
  console.error("manifest.json must sit at the zip root");
  process.exit(1);
}

console.log(`Packed ${outName}`);
