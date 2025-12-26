const BUTTON_ID = "yt-summarize-transcript";
const BUTTON_TITLE = "Summarize with ChatGPT";


async function copyTranscript() {
  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  if (segments.length === 0) return null;

  const transcriptText = Array.from(segments).map(segment => {
    const timestamp = segment.querySelector('.segment-timestamp')?.innerText.trim() || "";
    const text = segment.querySelector('.segment-text')?.innerText.trim() || "";
    return `${timestamp} ${text}`;
  }).join('\n');

  try {
    await navigator.clipboard.writeText(transcriptText);
    return transcriptText;
  } catch (err) {
    console.error("YouTube Transcript Summarizer: Failed to copy transcript:", err);
    return transcriptText;
  }
}

async function handleSummarizeClick(button) {
  const processTranscript = async (text) => {
    if (!text) return false;

    // Get stored prompt template or use default
    chrome.storage.sync.get(['promptTemplate'], (result) => {
      let prompt = result.promptTemplate || `Summarize the following content as you see fit.
Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`;

      // Replace placeholders
      prompt = prompt.replace(/{{Title}}/g, document.title)
        .replace(/{{URL}}/g, window.location.href)
        .replace(/{{Transcript}}/g, text);

      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: "OPEN_CHATGPT", prompt });
      } else {
        console.warn("YouTube Transcript Summarizer: Extension context invalidated, cannot send message.");
      }
    });

    return true;
  };

  // Try to copy if it's already open
  const existingText = await copyTranscript();
  if (existingText) {
    await processTranscript(existingText);
    return;
  }

  const transcriptButton = document.querySelector('button[aria-label="Show transcript"]');
  if (transcriptButton) {
    transcriptButton.click();

    // Polling to wait for transcript loading
    let attempts = 0;
    const maxAttempts = 20; // 5 seconds total
    const interval = setInterval(async () => {
      attempts++;
      const text = await copyTranscript();
      if (text) {
        clearInterval(interval);
        await processTranscript(text);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn("YouTube Transcript Summarizer: Timed out waiting for transcript segments.");
      }
    }, 250);
  } else {
    console.warn("YouTube Transcript Summarizer: 'Show transcript' button not found.");
  }
}

function injectStyles() {
  if (document.getElementById("yt-ai-summarizer-styles")) return;
  const style = document.createElement("style");
  style.id = "yt-ai-summarizer-styles";
  style.textContent = `
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
  document.head.appendChild(style);
}

function createButton() {
  injectStyles();
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.className = "ytp-button";
  button.title = BUTTON_TITLE;
  button.style.background = "transparent";
  button.style.border = "none";
  button.style.outline = "none";
  button.style.height = "100%";
  button.style.padding = "0px";
  button.style.cursor = "pointer";
  button.style.verticalAlign = "top";

  button.innerHTML = `
    <div class="yt-ai-btn-container">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.84002 6.95246L9.28205 1L11.7191 6.94024C11.8321 7.21563 12.0618 7.42638 12.346 7.51517L18 9.28205L12.2112 12.1765C12.0081 12.278 11.8456 12.4457 11.7504 12.6518L9.28205 18L6.80657 12.6365C6.71577 12.4397 6.56351 12.2778 6.37271 12.1751L1 9.28205L6.23381 7.52067C6.50872 7.42815 6.72992 7.22082 6.84002 6.95246Z" fill="white"></path>
        <path d="M17.1733 16.9525L18.3846 14L19.5909 16.9402C19.7039 17.2156 19.9336 17.4264 20.2178 17.5152L23 18.3846L20.083 19.8431C19.8799 19.9447 19.7174 20.1123 19.6222 20.3185L18.3846 23L17.1399 20.3031C17.0491 20.1064 16.8968 19.9445 16.706 19.8417L14 18.3846L16.5671 17.5207C16.8421 17.4282 17.0633 17.2208 17.1733 16.9525Z" fill="white"></path>
      </svg>
    </div>
  `;

  button.addEventListener("click", () => handleSummarizeClick(button));
  return button;
}

function ensureButton() {
  if (document.getElementById(BUTTON_ID)) return;
  const controls = document.querySelector(".ytp-right-controls");
  if (controls) {
    controls.insertBefore(createButton(), controls.firstChild);
  }
}

// Observe for dynamic navigation/player loading
const observer = new MutationObserver(ensureButton);
observer.observe(document.body, { childList: true, subtree: true });
ensureButton();
