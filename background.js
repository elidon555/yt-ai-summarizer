// Since we cannot use ES modules for files injected as content scripts
// without a bundler, we will fetch the defaults dynamically or use hardcoded values
// until Chrome supports modules in content scripts natively without throwing SyntaxErrors.

const DEFAULTS = {
  model: "gpt-5-4-thinking",
  tempChat: false,
};

try {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
} catch (error) {
  console.warn("YouTube Summarizer: Failed to set access level. Content scripts may not be able to read session storage.", error);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_CHATGPT" && message.prompt) {
    console.log("YouTube Summarizer BG: Received OPEN_CHATGPT", { promptLength: message.prompt.length });

    chrome.storage.session.set({ latestPrompt: message.prompt }, () => {
      console.log("YouTube Summarizer BG: Prompt saved to session storage. Opening tab...");

      chrome.storage.sync.get(['selectedModel', 'tempChat'], (result) => {
        const model = result.selectedModel || DEFAULTS.model;
        const tempChat = result.tempChat !== undefined ? result.tempChat : DEFAULTS.tempChat;

        const url = `https://chatgpt.com/?ref=glasp&model=${model}&temporary-chat=${tempChat}`;
        chrome.tabs.create({ url });
      });

      sendResponse({ ok: true });
    });
    return true;
  }
});
