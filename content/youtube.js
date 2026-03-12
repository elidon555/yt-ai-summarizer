const ICON_SUMMARIZE = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.84002 6.95246L9.28205 1L11.7191 6.94024C11.8321 7.21563 12.0618 7.42638 12.346 7.51517L18 9.28205L12.2112 12.1765C12.0081 12.278 11.8456 12.4457 11.7504 12.6518L9.28205 18L6.80657 12.6365C6.71577 12.4397 6.56351 12.2778 6.37271 12.1751L1 9.28205L6.23381 7.52067C6.50872 7.42815 6.72992 7.22082 6.84002 6.95246Z" fill="white"></path>
    <path d="M17.1733 16.9525L18.3846 14L19.5909 16.9402C19.7039 17.2156 19.9336 17.4264 20.2178 17.5152L23 18.3846L20.083 19.8431C19.8799 19.9447 19.7174 20.1123 19.6222 20.3185L18.3846 23L17.1399 20.3031C17.0491 20.1064 16.8968 19.9445 16.706 19.8417L14 18.3846L16.5671 17.5207C16.8421 17.4282 17.0633 17.2208 17.1733 16.9525Z" fill="white"></path>
  </svg>
`;

const BUTTON_STYLES = `
  .yt-ai-btn-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 40px;
    padding: 0 2px;
    border: none;
    cursor: pointer;
    background-color: transparent;
    outline: none;
    opacity: 0.9;
    position: relative;
    border-radius: 9999px;
    transition: background-color 0.2s;
  }
  .yt-ai-btn-container:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  .yt-ai-btn-container:active {
    background-color: rgba(255, 255, 255, 0.15);
  }
`;

const DEFAULT_PROMPT = `Summarize the following content as you see fit.

Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`;

class YouTubeSummarizer {
  constructor() {
    this.config = {
      buttonId: "yt-summarize-transcript",
      buttonTitle: "Summarize with ChatGPT",
      styleId: "yt-ai-summarizer-styles",
      selectors: {
        controls: ".ytp-right-controls",
        transcriptButton: 'button[aria-label="Show transcript"]',
        segments: "ytd-transcript-segment-renderer, transcript-segment-view-model",
        timestamp: ".segment-timestamp, .ytwTranscriptSegmentViewModelTimestamp",
        text: ".segment-text, .yt-core-attributed-string",
      },
      polling: {
        maxAttempts: 20,
        intervalMs: 250,
      },
    };

    this.init();
  }

  // ── Lifecycle ────────────────────────────────────────────

  init() {
    const observer = new MutationObserver(() => this.ensureButton());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("yt-navigate-finish", () => this.ensureButton());
    window.addEventListener("popstate", () => this.ensureButton());

    this.ensureButton();
  }

  // ── UI / DOM ─────────────────────────────────────────────

  injectStyles() {
    if (document.getElementById(this.config.styleId)) return;
    const style = document.createElement("style");
    style.id = this.config.styleId;
    style.textContent = BUTTON_STYLES;
    document.head.appendChild(style);
  }

  createButton() {
    this.injectStyles();

    const button = document.createElement("button");
    button.id = this.config.buttonId;
    button.className = "ytp-button";
    button.title = this.config.buttonTitle;
    Object.assign(button.style, {
      background: "transparent",
      border: "none",
      outline: "none",
      height: "100%",
      padding: "0px",
      cursor: "pointer",
      verticalAlign: "top",
    });

    button.innerHTML = `<div class="yt-ai-btn-container">${ICON_SUMMARIZE}</div>`;
    button.addEventListener("click", () => this.handleSummarizeClick());

    return button;
  }

  ensureButton() {
    if (!this.isWatchPage()) {
      this.removeButton();
      return;
    }

    if (document.getElementById(this.config.buttonId)) return;

    const controls = document.querySelector(this.config.selectors.controls);
    if (controls) {
      controls.insertBefore(this.createButton(), controls.firstChild);
    }
  }

  removeButton() {
    document.getElementById(this.config.buttonId)?.remove();
  }

  isWatchPage() {
    return window.location.pathname === "/watch";
  }

  // ── Data Extraction ──────────────────────────────────────

  async extractTranscript() {
    const { segments, timestamp, text } = this.config.selectors;
    const nodes = document.querySelectorAll(segments);
    if (nodes.length === 0) return null;

    const seen = new Set();
    const transcriptText = Array.from(nodes)
      .map((segment) => {
        const ts = segment.querySelector(timestamp)?.innerText.trim() || "";
        const txt = segment.querySelector(text)?.innerText.trim() || "";
        const row = `${ts} ${txt}`;
        if (seen.has(row)) return null;
        seen.add(row);
        return row;
      })
      .filter(Boolean)
      .join("\n");

    if (!transcriptText) return null;

    try {
      await navigator.clipboard.writeText(transcriptText);
    } catch (err) {
      console.error("YouTube Transcript Summarizer: Failed to copy transcript:", err);
    }

    return transcriptText;
  }

  // ── Extension Communication ──────────────────────────────

  sendPrompt(text) {
    chrome.storage.sync.get(["promptTemplate"], (result) => {
      let prompt = result.promptTemplate || DEFAULT_PROMPT;

      prompt = prompt
        .replace(/{{Title}}/g, document.title)
        .replace(/{{URL}}/g, window.location.href)
        .replace(/{{Transcript}}/g, text);

      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: "OPEN_CHATGPT", prompt });
      } else {
        console.warn("YouTube Transcript Summarizer: Extension context invalidated, cannot send message.");
      }
    });
  }

  // ── Event Handling ───────────────────────────────────────

  async handleSummarizeClick() {
    // Try to grab an already-visible transcript
    const existingText = await this.extractTranscript();
    if (existingText) {
      this.sendPrompt(existingText);
      return;
    }

    // Otherwise, open the transcript panel and poll for segments
    const transcriptButton = document.querySelector(this.config.selectors.transcriptButton);
    if (!transcriptButton) {
      console.warn("YouTube Transcript Summarizer: 'Show transcript' button not found.");
      return;
    }

    transcriptButton.click();

    const { maxAttempts, intervalMs } = this.config.polling;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      const text = await this.extractTranscript();

      if (text) {
        clearInterval(interval);
        this.sendPrompt(text);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn("YouTube Transcript Summarizer: Timed out waiting for transcript segments.");
      }
    }, intervalMs);
  }
}

// Instantiate
new YouTubeSummarizer();
