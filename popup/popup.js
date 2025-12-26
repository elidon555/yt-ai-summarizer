const DEFAULT_PROMPT = `Summarize the following content in 5-10 bullet points with timestamp if it's transcript.
Title: "{{Title}}"

URL: "{{URL}}"

Transcript: "{{Transcript}}"`;

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
    chrome.storage.sync.get(['promptTemplate'], (result) => {
        document.getElementById('promptTemplate').value = result.promptTemplate || DEFAULT_PROMPT;
    });
});

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
    const template = document.getElementById('promptTemplate').value;
    chrome.storage.sync.set({ promptTemplate: template }, () => {
        showStatus('Settings saved!', 'success');
    });
});

// Reset settings
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset to the default prompt?')) {
        document.getElementById('promptTemplate').value = DEFAULT_PROMPT;
        chrome.storage.sync.set({ promptTemplate: DEFAULT_PROMPT }, () => {
            showStatus('Reset to default!', 'success');
        });
    }
});
