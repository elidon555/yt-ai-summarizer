const DEFAULT_PROMPT = `Make a summary of this video as you see fit
Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`;

const DEFAULT_MODEL = 'gpt-5-2-thinking';
const DEFAULT_TEMP_CHAT = false;

const statusEl = document.getElementById('status');

function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    setTimeout(() => {
        statusEl.textContent = '';
        statusEl.className = 'status';
    }, 3000);
}

// Load settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['promptTemplate', 'selectedModel', 'tempChat'], (result) => {
        document.getElementById('promptTemplate').value = result.promptTemplate || DEFAULT_PROMPT;
        document.getElementById('modelSelect').value = result.selectedModel || DEFAULT_MODEL;
        document.getElementById('tempChat').checked = result.tempChat !== undefined ? result.tempChat : DEFAULT_TEMP_CHAT;
    });
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
    const template = document.getElementById('promptTemplate').value;
    const model = document.getElementById('modelSelect').value;
    const tempChat = document.getElementById('tempChat').checked;

    chrome.storage.sync.set({
        promptTemplate: template,
        selectedModel: model,
        tempChat: tempChat
    }, () => {
        showStatus('Settings saved!', 'success');
    });
});

// Reset settings
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        document.getElementById('promptTemplate').value = DEFAULT_PROMPT;
        document.getElementById('modelSelect').value = DEFAULT_MODEL;
        document.getElementById('tempChat').checked = DEFAULT_TEMP_CHAT;

        chrome.storage.sync.set({
            promptTemplate: DEFAULT_PROMPT,
            selectedModel: DEFAULT_MODEL,
            tempChat: DEFAULT_TEMP_CHAT
        }, () => {
            showStatus('Reset to default!', 'success');
        });
    }
});
