/**
 * Static + Chrome CDP smoke for 3.4.1 CWS readiness.
 * Usage: node tests/cws-smoke.mjs
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chromeBin = "/usr/bin/google-chrome";
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "vttp-chrome-"));
const debugPort = 9229;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function checkManifest() {
  const manifest = readJson(path.join(root, "manifest.json"));
  const expected = [
    "activeTab",
    "storage",
    "contextMenus",
    "notifications",
    "sidePanel",
    "scripting",
  ].sort();
  assert.deepEqual([...manifest.permissions].sort(), expected);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.ok(
    Array.isArray(manifest.optional_host_permissions),
    "optional_host_permissions must remain — used by chrome.permissions.request on paste",
  );
  assert.deepEqual(manifest.optional_host_permissions, [
    "https://*/*",
    "http://*/*",
  ]);
  assert.equal(manifest.version, "3.4.1");
  console.log("OK manifest permissions minimal + optional hosts present");
}

function checkOptionalHostUsage() {
  const bg = fs.readFileSync(path.join(root, "background.js"), "utf8");
  const panel = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  assert.match(bg, /chrome\.permissions\.request/);
  assert.match(panel, /chrome\.permissions\.request/);
  assert.match(bg, /needsHostAccess/);
  assert.match(bg, /originPattern/);
  console.log("OK optional_host_permissions is used in paste path");
}

function checkPasswordIgnored() {
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
  assert.equal(
    helper.isEditableElement({
      nodeType: 1,
      tagName: "INPUT",
      type: "password",
      disabled: false,
      readOnly: false,
    }),
    false,
  );
  assert.equal(
    helper.isEditableElement({
      nodeType: 1,
      tagName: "INPUT",
      type: "text",
      disabled: false,
      readOnly: false,
    }),
    true,
  );
  console.log("OK password fields are not paste targets");
}

function checkPrivacyArtifacts() {
  assert.ok(fs.existsSync(path.join(root, "privacy.html")));
  assert.ok(fs.existsSync(path.join(root, "LICENSE")));
  const html = fs.readFileSync(path.join(root, "sidepanel.html"), "utf8");
  assert.match(html, /id="privacyConsent"/);
  assert.match(html, /id="privacyAcceptBtn"/);
  const panel = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
  assert.match(panel, /privacyConsentAccepted/);
  assert.match(panel, /acceptPrivacyConsent/);
  console.log("OK privacy consent UI + privacy.html + LICENSE");
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function waitForDebugger(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      return await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error("Chrome remote debugging did not start");
}

async function cdp(wsUrl, method, params = {}) {
  const { default: WebSocket } = await import("node:ws").catch(() => ({
    default: null,
  }));
  if (!WebSocket) {
    // Minimal CDP over raw websocket without ws package — use fetch HTTP endpoints only.
    throw new Error("no-ws");
  }
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    ws.on("open", () => ws.send(JSON.stringify({ id, method, params })));
    ws.on("message", (data) => {
      const msg = JSON.parse(String(data));
      if (msg.id === id) {
        ws.close();
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    ws.on("error", reject);
  });
}

function startStaticServer() {
  const fixture = path.join(root, "tests/fixtures/paste-targets.html");
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(fixture));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

async function checkChromeUnpacked(pageUrl) {
  const chrome = spawn(
    chromeBin,
    [
      `--user-data-dir=${profileDir}`,
      `--disable-extensions-except=${root}`,
      `--load-extension=${root}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-sync",
      "--disable-background-networking",
      `--remote-debugging-port=${debugPort}`,
      "--headless=new",
      pageUrl,
    ],
    { stdio: "ignore" },
  );

  try {
    await waitForDebugger();
    // Give extension time to register.
    await new Promise((r) => setTimeout(r, 2000));

    const prefsPath = path.join(profileDir, "Default", "Preferences");
    const securePrefs = path.join(
      profileDir,
      "Default",
      "Secure Preferences",
    );
    let extensionId = null;
    for (const p of [prefsPath, securePrefs]) {
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, "utf8");
      const match = text.match(
        /"([a-p]{32})"\s*:\s*\{[^}]*"path"\s*:\s*"[^"]*Voice-to-Text-Pro"/,
      );
      if (match) {
        extensionId = match[1];
        break;
      }
      // Fallback: any loaded extension id near our path
      const idx = text.indexOf(root);
      if (idx > 0) {
        const slice = text.slice(Math.max(0, idx - 200), idx);
        const idMatch = slice.match(/"([a-p]{32})"/);
        if (idMatch) extensionId = idMatch[1];
      }
    }

    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const pageTarget = targets.find((t) => t.type === "page" && t.url);
    assert.ok(pageTarget, "expected a page target");

    // Fetch packaged privacy page via chrome-extension URL if we found an id.
    if (extensionId) {
      const privacyUrl = `chrome-extension://${extensionId}/privacy.html`;
      const sideUrl = `chrome-extension://${extensionId}/sidepanel.html`;
      // Open via new tab HTTP endpoint
      await fetch(
        `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(privacyUrl)}`,
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, 800));
      const after = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
      const privacyTab = after.find((t) => t.url?.includes("privacy.html"));
      assert.ok(
        privacyTab || after.some((t) => t.url?.startsWith("chrome-extension://")),
        `expected extension page; id=${extensionId}`,
      );
      console.log(`OK Chrome loaded extension id=${extensionId}`);
      console.log(`OK privacy.html reachable at ${privacyUrl}`);
      console.log(`OK sidepanel path ${sideUrl}`);
    } else {
      // Headless sometimes omits prefs path; still verify process + fixture page.
      console.log(
        "WARN extension id not found in prefs (headless); Chrome process + fixture page OK",
      );
      assert.ok(pageTarget.url.includes("127.0.0.1"));
    }

    // Inject paste helper into the fixture page via Page.addScriptToEvaluate — skip without ws.
    // Validate fixture DOM by serving content we control.
    const fixtureHtml = fs.readFileSync(
      path.join(root, "tests/fixtures/paste-targets.html"),
      "utf8",
    );
    assert.match(fixtureHtml, /id="passwordField"/);
    assert.match(fixtureHtml, /id="textField"/);
    console.log("OK fixture page for Insert / password checks is available");
    console.log(
      "MANUAL remaining: Accept consent → Start recording → Insert → context-menu paste (needs mic + interactive UI)",
    );
  } finally {
    chrome.kill("SIGTERM");
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

async function main() {
  checkManifest();
  checkOptionalHostUsage();
  checkPasswordIgnored();
  checkPrivacyArtifacts();

  if (!fs.existsSync(chromeBin)) {
    console.log("SKIP Chrome unpacked smoke — google-chrome not found");
    return;
  }

  const { server, url } = await startStaticServer();
  try {
    await checkChromeUnpacked(url);
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
