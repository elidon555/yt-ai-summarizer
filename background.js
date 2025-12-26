try {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
} catch (error) {
  console.warn("YouTube Summarizer: Failed to set access level. Content scripts may not be able to read session storage.", error);
}

const CHATGPT_URL = "https://chatgpt.com/?model=gpt-5-2-thinking&temporary-chat=true";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_CHATGPT" && message.prompt) {
    console.log("YouTube Summarizer BG: Received OPEN_CHATGPT", { promptLength: message.prompt.length });
    chrome.storage.session.set({ latestPrompt: message.prompt }, () => {
      console.log("YouTube Summarizer BG: Prompt saved to session storage. Opening tab...");
      chrome.tabs.create({ url: CHATGPT_URL });
      sendResponse({ ok: true });
    });
    return true;
  }
});
