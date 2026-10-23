const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function loadScript(fileName, globals) {
  const context = vm.createContext({
    clearInterval,
    clearTimeout,
    console: {
      error() {},
      log() {},
      warn() {},
    },
    setInterval,
    setTimeout,
    ...globals,
  });
  context.globalThis = context;
  vm.runInContext(
    fs.readFileSync(path.join(projectRoot, fileName), "utf8"),
    context,
    { filename: fileName },
  );
  return context;
}

function recognitionEvent(transcript, isFinal) {
  return {
    resultIndex: 0,
    results: [
      {
        0: { transcript },
        isFinal,
      },
    ],
  };
}

test("side panel keeps manual edits when an interim result becomes final", () => {
  const context = loadScript("sidepanel.js", {
    chrome: {
      runtime: {
        connect() {
          return { name: "sidePanel" };
        },
        onMessage: { addListener() {} },
      },
    },
    document: {
      addEventListener() {},
    },
    window: {},
  });
  const SpeechToTextPro = vm.runInContext("SpeechToTextPro", context);
  const app = Object.create(SpeechToTextPro.prototype);
  let saveCount = 0;

  app.finalTranscript = "Original ";
  app.interimTranscript = "live words";
  app.output = {
    scrollHeight: 42,
    scrollTop: 0,
    value: "Edited live words",
  };
  app.formatText = (text) => `${text} `;
  app.saveTextDraft = () => {
    saveCount += 1;
  };
  app.updateEditorOverlay = () => {};
  app.updateStats = () => {};

  app.syncTranscriptFromOutput();
  app.applyRecorderChunks([{ transcript: "live words", isFinal: true }]);

  assert.equal(app.finalTranscript, "Edited live words ");
  assert.equal(app.output.value, "Edited live words ");
  assert.equal(app.output.scrollTop, 42);
  assert.equal(saveCount, 1);
});

test("side panel separates new speech from a manually edited draft", () => {
  const context = loadScript("sidepanel.js", {
    chrome: {
      runtime: {
        connect() {
          return { name: "sidePanel" };
        },
        onMessage: { addListener() {} },
      },
    },
    document: {
      addEventListener() {},
    },
    window: {},
  });
  const SpeechToTextPro = vm.runInContext("SpeechToTextPro", context);
  const app = Object.create(SpeechToTextPro.prototype);

  app.finalTranscript = "Old";
  app.interimTranscript = "";
  app.output = { scrollHeight: 0, scrollTop: 0, value: "Manual correction" };
  app.formatText = (text) => `${text} `;
  app.saveTextDraft = () => {};
  app.updateEditorOverlay = () => {};
  app.updateStats = () => {};

  app.syncTranscriptFromOutput();
  app.applyRecorderChunks([{ transcript: "new speech", isFinal: false }]);

  assert.equal(app.finalTranscript, "Manual correction ");
  assert.equal(app.output.value, "Manual correction new speech");
});

test("high punctuation marks a question only when it starts the phrase", () => {
  const context = loadScript("sidepanel.js", {
    chrome: {
      runtime: {
        connect() {
          return { name: "sidePanel" };
        },
        onMessage: { addListener() {} },
      },
    },
    document: {
      addEventListener() {},
    },
    window: {},
  });
  const SpeechToTextPro = vm.runInContext("SpeechToTextPro", context);
  const app = Object.create(SpeechToTextPro.prototype);
  app.autoPunctuationLevel = "high";
  app.finalTranscript = "";
  app.pack = {
    punctQuestionRe: /\b(what|how)\b/i,
    punctExclaimRe: /$^/,
  };

  assert.equal(app.formatText("what time is it"), "What time is it? ");
  app.finalTranscript = "";
  assert.equal(
    app.formatText("tell me what time it is"),
    "Tell me what time it is. ",
  );

  const src = fs.readFileSync(path.join(projectRoot, "sidepanel.js"), "utf8");
  assert.doesNotMatch(src, /action === "updateTranscript"/);
  assert.doesNotMatch(src, /action === "recognitionError"/);
  assert.doesNotMatch(src, /e\.code === "Delete"/);
  assert.doesNotMatch(src, /e\.code === "KeyI"/);
});

test("content paste helper rejects password fields", () => {
  const context = loadScript("content.js", {
    Node: { ELEMENT_NODE: 1 },
    chrome: {
      runtime: {
        onMessage: { addListener() {} },
        sendMessage() {
          return Promise.resolve();
        },
      },
    },
    document: {
      addEventListener() {},
    },
    window: {},
  });
  const VoiceToTextPasteHelper = vm.runInContext(
    "VoiceToTextPasteHelper",
    context,
  );
  const helper = Object.create(VoiceToTextPasteHelper.prototype);

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
});

test("background has no tab STT fallback helper", () => {
  const context = loadScript("background.js", {
    chrome: {
      commands: { onCommand: { addListener() {} } },
      contextMenus: {
        create() {},
        onClicked: { addListener() {} },
        removeAll() {},
        update() {},
      },
      runtime: {
        getURL(file) {
          return `chrome-extension://test/${file}`;
        },
        onConnect: { addListener() {} },
        onInstalled: { addListener() {} },
        onMessage: { addListener() {} },
        sendMessage() {
          return Promise.reject(new Error("no panel"));
        },
      },
      scripting: {
        executeScript() {
          return Promise.resolve();
        },
      },
      sidePanel: {
        open() {
          return Promise.resolve();
        },
        setOptions() {
          return Promise.resolve();
        },
        setPanelBehavior() {
          return Promise.resolve();
        },
      },
      storage: {
        local: {
          get() {
            return Promise.resolve({});
          },
          remove() {},
          set() {},
        },
        session: {
          get() {
            return Promise.resolve({});
          },
          set() {
            return Promise.resolve();
          },
        },
        onChanged: { addListener() {} },
      },
      i18n: {
        getUILanguage() {
          return "en-US";
        },
      },
      tabs: {
        query() {
          return Promise.resolve([]);
        },
        get() {
          return Promise.resolve({ id: 1 });
        },
        sendMessage() {
          return Promise.resolve({ success: true });
        },
        onRemoved: { addListener() {} },
      },
      windows: {
        create() {
          return Promise.resolve({ id: 1 });
        },
        get() {
          return Promise.resolve({ id: 1 });
        },
        update() {
          return Promise.resolve();
        },
        onRemoved: { addListener() {} },
      },
    },
  });

  assert.equal(
    vm.runInContext("typeof startRecordingInTab", context),
    "undefined",
  );
  assert.equal(vm.runInContext("typeof sendPasteToTab", context), "function");
});
