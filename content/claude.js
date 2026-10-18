class ClaudeController {
  constructor() {
    this.config = {
      selectors: {
        editor: 'div[data-testid="chat-input"]',
        sendButton: 'button[data-testid="chat-input-send"]',
      },
      timeouts: {
        elementWait: 20000,
        pollingInterval: 50,
        sendReadyWait: 5000,
        sendFallback: 1000
      }
    };

    this.init();
  }

  // ── Initialization ───────────────────────────────────────

  init() {
    // No need to wait for window load: run() polls until the editor exists
    this.run();
  }

  async run() {
    console.log("Claude Summarizer: Run started.");

    const prompt = await this.getStoredPrompt();
    if (!prompt) {
      console.log("Claude Summarizer: No prompt found in storage.");
      return;
    }
    console.log("Claude Summarizer: Prompt retrieved from storage.");

    // Clear first so a reload of this tab never re-sends the prompt
    this.clearStoredPrompt();
    await this.setPrompt(prompt);
  }

  // ── Storage Management ───────────────────────────────────

  getStoredPrompt() {
    return new Promise((resolve) => {
      if (!chrome.runtime?.id) {
        resolve("");
        return;
      }
      try {
        chrome.storage.session.get(["latestPrompt"], (result) => {
          if (chrome.runtime.lastError) {
            resolve("");
            return;
          }
          resolve(result.latestPrompt || "");
        });
      } catch (e) {
        resolve("");
      }
    });
  }

  clearStoredPrompt() {
    if (chrome.runtime?.id) {
      try {
        chrome.storage.session.remove(["latestPrompt"]);
      } catch (e) {
        // Ignored
      }
    }
  }

  // ── DOM Manipulation ─────────────────────────────────────

  waitFor(check, timeout = this.config.timeouts.elementWait) {
    const { pollingInterval } = this.config.timeouts;

    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const result = check();
        if (result) {
          clearInterval(timer);
          resolve(result);
          return;
        }
        if (Date.now() - start > timeout) {
          clearInterval(timer);
          resolve(null);
        }
      }, pollingInterval);
    });
  }

  waitForElement(selector) {
    return this.waitFor(() => document.querySelector(selector));
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async setPrompt(prompt) {
    console.log("Claude Summarizer: setPrompt called.");

    const editor = await this.waitForElement(this.config.selectors.editor);
    if (!editor) {
      console.error("Claude Summarizer: Editor not found.");
      return false;
    }
    console.log("Claude Summarizer: Editor found.");

    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);

    // Simulate a paste: Claude handles it natively and turns long text
    // (i.e. most transcripts) into a "Pasted text" attachment
    const data = new DataTransfer();
    data.setData("text/plain", prompt);
    editor.dispatchEvent(new ClipboardEvent("paste", {
      clipboardData: data,
      bubbles: true,
      cancelable: true
    }));
    console.log("Claude Summarizer: Paste dispatched.");

    // Wait until Claude has processed the paste and enabled the send button
    const { selectors, timeouts } = this.config;
    await this.waitFor(() => {
      const button = document.querySelector(selectors.sendButton);
      return button && !button.disabled;
    }, timeouts.sendReadyWait);

    console.log("Claude Summarizer: Pressing Enter...");
    const eventOptions = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    };
    editor.focus();
    editor.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
    editor.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
    editor.dispatchEvent(new KeyboardEvent('keyup', eventOptions));

    // Fallback: if Enter didn't submit (still on /new), click the send button
    await this.sleep(this.config.timeouts.sendFallback);
    const sendButton = document.querySelector(this.config.selectors.sendButton);
    if (location.pathname.startsWith('/new') && sendButton && !sendButton.disabled) {
      console.log("Claude Summarizer: Enter did not submit, clicking send button.");
      sendButton.click();
    }

    console.log("Claude Summarizer: Prompt sent.");
    return true;
  }
}

// Instantiate
new ClaudeController();
