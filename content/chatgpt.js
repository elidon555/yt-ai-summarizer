const SELECTORS = {
  textarea: 'div#prompt-textarea',
  sendButton: '#composer-submit-button',
};

function getStoredPrompt() {
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

function clearStoredPrompt() {
  if (chrome.runtime?.id) {
    try {
      chrome.storage.session.remove(["latestPrompt"]);
    } catch (e) {
      // Ignored
    }
  }
}

function waitForElement(selector, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(timer);
        resolve(element);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, 500);
  });
}

async function setPrompt(prompt) {
  console.log("ChatGPT Summarizer: setPrompt called.");
  const textarea = await waitForElement(SELECTORS.textarea);
  if (!textarea) {
    console.error("ChatGPT Summarizer: Textarea not found.");
    return false;
  }
  console.log("ChatGPT Summarizer: Textarea found.");

  // Small extra delay to ensure the ProseMirror editor is fully ready
  await new Promise(r => setTimeout(r, 1500));
  console.log("ChatGPT Summarizer: Wait complete. Focusing...");

  textarea.focus();

  // Ensure selection is inside the textarea
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(textarea);
  selection.removeAllRanges();
  selection.addRange(range);
  console.log("ChatGPT Summarizer: Textarea focused and selected.");

  // Direct DOM manipulation for ProseMirror (bypassing execCommand freeze)
  try {
    textarea.textContent = prompt;
  } catch (e) {
    console.error("ChatGPT Summarizer: Direct assignment failed", e);
  }

  console.log("ChatGPT Summarizer: Content assigned. Dispatching events...");

  // Dispatch events to trigger React/ProseMirror state updates
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  console.log("ChatGPT Summarizer: Input/Change events dispatched.");

  // Small delay for state to settle
  await new Promise(r => setTimeout(r, 1000));

  // Simulate Enter key press series
  console.log("ChatGPT Summarizer: Simulating Enter key...");
  const eventOptions = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  };

  textarea.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
  textarea.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
  textarea.dispatchEvent(new KeyboardEvent('keyup', eventOptions));

  console.log("ChatGPT Summarizer: Enter key simulation complete.");
  return true;
}

async function run() {
  console.log("ChatGPT Summarizer: Run started.");
  const prompt = await getStoredPrompt();
  if (!prompt) {
    console.log("ChatGPT Summarizer: No prompt found in storage.");
    return;
  }
  console.log("ChatGPT Summarizer: Prompt retrieved from storage.");

  const success = await setPrompt(prompt);
  if (success) {
    clearStoredPrompt();
    console.log("ChatGPT Summarizer: Prompt cleared from storage.");
  }
}

if (document.readyState === 'complete') {
  console.log("ChatGPT Summarizer: Document ready, running immediately.");
  run();
} else {
  console.log("ChatGPT Summarizer: Waiting for window load.");
  window.addEventListener('load', () => {
    console.log("ChatGPT Summarizer: Window load event fired.");
    run();
  }, { once: true });
}
