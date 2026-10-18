// Since we cannot use ES modules for files injected as content scripts
// without a bundler, we will fetch the defaults dynamically or use hardcoded values
// until Chrome supports modules in content scripts natively without throwing SyntaxErrors.

const DEFAULTS = {
  incognito: false,
};

try {
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
} catch (error) {
  console.warn("YouTube Summarizer: Failed to set access level. Content scripts may not be able to read session storage.", error);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_CLAUDE" && message.prompt) {
    console.log("YouTube Summarizer BG: Received OPEN_CLAUDE", { promptLength: message.prompt.length });

    chrome.storage.session.set({ latestPrompt: message.prompt }, () => {
      console.log("YouTube Summarizer BG: Prompt saved to session storage. Opening tab...");

      chrome.storage.sync.get(['incognito'], (result) => {
        const incognito = result.incognito !== undefined ? result.incognito : DEFAULTS.incognito;

        const url = incognito ? "https://claude.ai/new?incognito" : "https://claude.ai/new";
        chrome.tabs.create({ url });
      });

      sendResponse({ ok: true });
    });
    return true;
  }
});
