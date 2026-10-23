/**
 * Local CWS readiness checks (no GitHub required).
 * node tests/cws-verify.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("manifest permissions are minimal and optional hosts are declared", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.version, "3.4.1");
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.deepEqual([...manifest.permissions].sort(), [
    "activeTab",
    "contextMenus",
    "scripting",
    "sidePanel",
    "storage",
  ]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.deepEqual(manifest.optional_host_permissions, [
    "https://*/*",
    "http://*/*",
  ]);
});

test("optional_host_permissions is used via chrome.permissions.request", () => {
  const bg = fs.readFileSync(path.join(root, "background.js"), "utf8");
  const panel = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  assert.match(bg, /chrome\.permissions\.request\s*\(/);
  assert.match(panel, /chrome\.permissions\.request\s*\(/);
  assert.match(bg, /needsHostAccess/);
  assert.match(bg, /originPattern/);
  assert.match(bg, /https:\/\/\*\/\*/);
  assert.match(bg, /allFrames:\s*true/);
  assert.doesNotMatch(bg, /"i18n\.js"/);
});

test("paste helper ignores password, date, number and accepts text", () => {
  const context = vm.createContext({
    Node: { ELEMENT_NODE: 1 },
    chrome: {
      runtime: {
        onMessage: { addListener() {} },
        sendMessage() {
          return Promise.resolve();
        },
      },
    },
    document: { addEventListener() {} },
    window: {},
    console,
  });
  context.globalThis = context;
  vm.runInContext(
    fs.readFileSync(path.join(root, "content.js"), "utf8"),
    context,
  );
  const Helper = vm.runInContext("VoiceToTextPasteHelper", context);
  const helper = Object.create(Helper.prototype);
  const el = (type) => ({
    nodeType: 1,
    tagName: "INPUT",
    type,
    disabled: false,
    readOnly: false,
  });
  assert.equal(helper.isEditableElement(el("password")), false);
  assert.equal(helper.isEditableElement(el("date")), false);
  assert.equal(helper.isEditableElement(el("number")), false);
  assert.equal(helper.isEditableElement(el("datetime-local")), false);
  assert.equal(helper.isEditableElement(el("text")), true);
  assert.equal(helper.isEditableElement(el("email")), true);
});

test("copy path prefers Clipboard API", () => {
  const src = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  assert.match(src, /navigator\.clipboard\?\.writeText/);
  assert.match(src, /copyToClipboard\s*\(/);
});

test("privacy consent gate exists", () => {
  const html = fs.readFileSync(path.join(root, "sidepanel.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  assert.match(html, /id="privacyConsent"/);
  assert.match(js, /privacyConsentAccepted/);
  assert.match(js, /if \(!this\.privacyConsentAccepted\)/);
  assert.ok(fs.existsSync(path.join(root, "privacy.html")));
});

test("speech recognition runs in the recorder tab", () => {
  const bg = fs.readFileSync(path.join(root, "background.js"), "utf8");
  const panel = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
  assert.doesNotMatch(bg, /function startRecordingInTab/);
  assert.match(bg, /recorder\.html/);
  assert.match(bg, /chrome\.storage\.session/);
  assert.match(bg, /PANEL_GONE_MS/);
  assert.match(panel, /applyRecorderChunks/);
  assert.doesNotMatch(panel, /action === "updateTranscript"/);
  assert.doesNotMatch(panel, /notifications/);
  const start = content.indexOf("insertIntoContentEditable(target, textToPaste)");
  const end = content.indexOf("pasteText(textToPaste)", start);
  const insertFn = content.slice(start, end);
  assert.ok(insertFn.indexOf("execCommand") < insertFn.indexOf("createTextNode"));
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(css, /\.editor-overlay[\s\S]*pointer-events:\s*none/);
});
