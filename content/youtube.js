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
    const title = document.title;
    const prompt = `Summarize the below video with title: ${title}:\n\n${text}`;
    chrome.runtime.sendMessage({ type: "OPEN_CHATGPT", prompt });
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

function createButton() {
  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.className = "ytp-button";
  button.title = BUTTON_TITLE;
  button.innerHTML = `
    <svg height="100%" width="100%" viewBox="0 0 24 24">
      <path fill="#fff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"/>
    </svg>
  `;
  button.style.verticalAlign = "top";
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
