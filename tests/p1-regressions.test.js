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
  app.handleRecognitionResult(recognitionEvent("live words", true));

  assert.equal(app.finalTranscript, "Edited live words ");
  assert.equal(app.output.value, "Edited live words ");
  assert.equal(app.output.scrollTop, 42);
  assert.equal(saveCount, 1);
});

test("side panel separates new speech from a manually edited draft", () => {
  const context = loadScript("sidepanel.js", {
    chrome: {
      runtime: {
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
  app.handleRecognitionResult(recognitionEvent("new speech", false));

  assert.equal(app.finalTranscript, "Manual correction ");
  assert.equal(app.output.value, "Manual correction new speech");
});

test("fallback updates synchronize side panel state and draft", () => {
  let messageListener;
  const context = loadScript("sidepanel.js", {
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            messageListener = listener;
          },
        },
      },
    },
    document: {
      addEventListener() {},
    },
    window: {},
  });
  let saveCount = 0;
  const app = {
    output: {
      scrollHeight: 24,
      scrollTop: 0,
      value: "",
    },
    saveTextDraft() {
      saveCount += 1;
    },
    updateEditorOverlay() {},
    updateStats() {},
  };
  context.testApp = app;
  vm.runInContext("sttAppInstance = testApp", context);

  messageListener(
    {
      action: "updateTranscript",
      final: "Durable ",
      interim: "fallback",
    },
    {},
    () => {},
  );

  assert.equal(app.finalTranscript, "Durable ");
  assert.equal(app.interimTranscript, "fallback");
  assert.equal(app.output.value, "Durable fallback");
  assert.equal(app.output.scrollTop, 24);
  assert.equal(saveCount, 1);
});

test("fallback recognition persists final and interim transcript text", () => {
  const storageWrites = [];
  const runtimeMessages = [];
  const context = loadScript("content.js", {
    Node: { ELEMENT_NODE: 1 },
    chrome: {
      runtime: {
        onMessage: { addListener() {} },
        sendMessage(message) {
          runtimeMessages.push(message);
          return Promise.resolve();
        },
      },
      storage: {
        local: {
          get(keys, callback) {
            callback({});
          },
          set(value) {
            storageWrites.push(value);
          },
        },
      },
    },
    document: {
      addEventListener() {},
    },
    window: {},
  });
  const ContentSpeechRecognizer = vm.runInContext(
    "ContentSpeechRecognizer",
    context,
  );
  const recognizer = Object.create(ContentSpeechRecognizer.prototype);

  recognizer.finalTranscript = "Saved draft";
  recognizer.interimTranscript = "";
  recognizer.applyPunctuation = (text) => text.trim();

  recognizer.handleRecognitionResult(recognitionEvent("new words", false));

  assert.equal(recognizer.finalTranscript, "Saved draft ");
  assert.equal(recognizer.interimTranscript, "new words");
  assert.equal(storageWrites.at(-1).textDraft, "Saved draft new words");
  assert.equal(runtimeMessages.at(-1).action, "updateTranscript");
  assert.equal(runtimeMessages.at(-1).final, "Saved draft ");
  assert.equal(runtimeMessages.at(-1).interim, "new words");
});

test("fallback start payload uses stored draft and settings", async () => {
  const sentMessages = [];
  const context = loadScript("background.js", {
    chrome: {
      commands: { onCommand: { addListener() {} } },
      contextMenus: {
        create() {},
        onClicked: { addListener() {} },
        removeAll() {},
        update() {},
      },
      notifications: { create() {} },
      runtime: {
        onInstalled: { addListener() {} },
        onMessage: { addListener() {} },
      },
      sidePanel: {},
      storage: {
        local: {
          get() {
            return Promise.resolve({
              autoPunctuation: "high",
              language: "uk-UA",
              textDraft: "Stored text",
            });
          },
        },
        onChanged: { addListener() {} },
      },
      tabs: {
        sendMessage(tabId, message) {
          sentMessages.push({ message, tabId });
          return Promise.resolve();
        },
      },
    },
  });
  const startRecordingInTab = vm.runInContext("startRecordingInTab", context);

  await startRecordingInTab(17);

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].tabId, 17);
  assert.equal(sentMessages[0].message.action, "startRecording");
  assert.equal(sentMessages[0].message.language, "uk-UA");
  assert.equal(sentMessages[0].message.autoPunctuation, "high");
  assert.equal(sentMessages[0].message.initialText, "Stored text");
});
