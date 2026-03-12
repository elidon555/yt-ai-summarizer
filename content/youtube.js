const DEFAULT_PROMPT = `Summarize the following content as you see fit.

Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`;

class YouTubeSummarizer {
  constructor() {
    this.config = {
      buttonId: "yt-summarize-transcript",
      buttonTitle: "Summarize with ChatGPT",
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

  createButton() {
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
