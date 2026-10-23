// ===========================================
// content.js - injected on demand after a user paste gesture
// Paste transcript into the focused (or last) editable field.
// ===========================================

class VoiceToTextPasteHelper {
  constructor() {
    this.lastEditableElement = null;
    this.lastContentEditableRange = null;

    this.setupEditableTracking();
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "pasteSelection") {
        const success = this.pasteText(request.textToPaste || "");
        sendResponse({ success });
      }
      return true;
    });
  }

  setupEditableTracking() {
    const rememberFromEvent = (event) => {
      const editable = this.findEditableElement(event.target);
      if (editable) {
        this.rememberEditableElement(editable);
      }
    };

    document.addEventListener("focusin", rememberFromEvent, true);
    document.addEventListener("mousedown", rememberFromEvent, true);
    document.addEventListener("mouseup", rememberFromEvent, true);
    document.addEventListener("keyup", rememberFromEvent, true);
    document.addEventListener("input", rememberFromEvent, true);
    document.addEventListener("contextmenu", rememberFromEvent, true);
    document.addEventListener(
      "selectionchange",
      () => {
        const editable = this.findEditableElement(document.activeElement);
        if (editable) {
          this.rememberEditableElement(editable);
        }
      },
      true,
    );
  }

  findEditableElement(element) {
    let current = element;
    while (
      current &&
      current !== document &&
      current !== document.documentElement
    ) {
      if (this.isEditableElement(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  isEditableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;

    const tagName = element.tagName;
    if (tagName === "TEXTAREA") {
      return !element.disabled && !element.readOnly;
    }

    if (tagName === "INPUT") {
      const type = (element.type || "text").toLowerCase();
      const textInputTypes = new Set([
        "text",
        "search",
        "url",
        "tel",
        "email",
      ]);
      return textInputTypes.has(type) && !element.disabled && !element.readOnly;
    }

    return (
      element.isContentEditable === true ||
      element.getAttribute("contenteditable") === "true"
    );
  }

  rememberEditableElement(element) {
    if (!this.isEditableElement(element)) return;

    this.lastEditableElement = element;

    if (
      element.isContentEditable ||
      element.getAttribute("contenteditable") === "true"
    ) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (
          element.contains(range.commonAncestorContainer) ||
          element === range.commonAncestorContainer
        ) {
          this.lastContentEditableRange = range.cloneRange();
        }
      }
    }
  }

  getPasteTarget() {
    const activeEditable = this.findEditableElement(document.activeElement);
    if (activeEditable) {
      this.rememberEditableElement(activeEditable);
      return activeEditable;
    }

    if (
      this.lastEditableElement &&
      document.contains(this.lastEditableElement) &&
      this.isEditableElement(this.lastEditableElement)
    ) {
      return this.lastEditableElement;
    }

    return null;
  }

  insertIntoContentEditable(target, textToPaste) {
    const selection = window.getSelection();
    let range = null;

    if (
      this.lastContentEditableRange &&
      (target.contains(
        this.lastContentEditableRange.commonAncestorContainer,
      ) ||
        target === this.lastContentEditableRange.commonAncestorContainer)
    ) {
      range = this.lastContentEditableRange.cloneRange();
    } else if (selection && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (
        target.contains(currentRange.commonAncestorContainer) ||
        target === currentRange.commonAncestorContainer
      ) {
        range = currentRange;
      }
    }

    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const activeRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (activeRange) {
      activeRange.deleteContents();
      const textNode = document.createTextNode(textToPaste);
      activeRange.insertNode(textNode);
      activeRange.setStartAfter(textNode);
      activeRange.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(activeRange);
      return true;
    }

    try {
      if (document.execCommand("insertText", false, textToPaste)) {
        return true;
      }
    } catch {
      // Fall through to append.
    }

    target.appendChild(document.createTextNode(textToPaste));
    return true;
  }

  pasteText(textToPaste) {
    if (!textToPaste) {
      chrome.runtime.sendMessage({ action: "pasteCompleted", success: false });
      return false;
    }

    const target = this.getPasteTarget();
    let success = false;

    if (target) {
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        target.focus();
        let start = target.value.length;
        let end = start;

        try {
          start =
            typeof target.selectionStart === "number"
              ? target.selectionStart
              : target.value.length;
          end =
            typeof target.selectionEnd === "number"
              ? target.selectionEnd
              : start;
        } catch {
          start = target.value.length;
          end = start;
        }

        try {
          if (typeof target.setRangeText === "function") {
            target.setRangeText(textToPaste, start, end, "end");
          } else {
            throw new Error("setRangeText is not available");
          }
        } catch {
          const originalValue = target.value || "";
          target.value =
            originalValue.substring(0, start) +
            textToPaste +
            originalValue.substring(end);
          const newCursorPos = start + textToPaste.length;
          try {
            target.selectionStart = newCursorPos;
            target.selectionEnd = newCursorPos;
          } catch {
            // Some input[type] elements do not allow programmatic selection.
          }
        }

        target.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: textToPaste,
          }),
        );
        target.dispatchEvent(new Event("change", { bubbles: true }));
        success = true;
      } else if (
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true"
      ) {
        target.focus();
        success = this.insertIntoContentEditable(target, textToPaste);
        if (success) {
          target.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              inputType: "insertText",
              data: textToPaste,
            }),
          );
        }
      }
    }

    chrome.runtime.sendMessage({ action: "pasteCompleted", success });
    return success;
  }
}

if (!globalThis.__voiceToTextProContentInstance) {
  globalThis.__voiceToTextProContentInstance = new VoiceToTextPasteHelper();
}
