class PopupController {
  constructor() {
    this.elements = {
      promptTemplate: document.getElementById("promptTemplate"),
      incognito: document.getElementById("incognito"),
      saveBtn: document.getElementById("saveBtn"),
      resetBtn: document.getElementById("resetBtn"),
      status: document.getElementById("status"),
    };

    this.init();
  }

  // ── Initialization ───────────────────────────────────────

  init() {
    this.loadSettings();
    this.elements.saveBtn.addEventListener("click", () => this.saveSettings());
    this.elements.resetBtn.addEventListener("click", () => this.resetSettings());
  }

  // ── Settings ─────────────────────────────────────────────

  loadSettings() {
    chrome.storage.sync.get(["promptTemplate", "incognito"], (result) => {
      this.elements.promptTemplate.value = result.promptTemplate || DEFAULTS.prompt;
      this.elements.incognito.checked = result.incognito !== undefined ? result.incognito : DEFAULTS.incognito;
    });
  }

  saveSettings() {
    chrome.storage.sync.set(
      {
        promptTemplate: this.elements.promptTemplate.value,
        incognito: this.elements.incognito.checked,
      },
      () => this.showStatus("Settings saved!", "success")
    );
  }

  resetSettings() {
    if (!confirm("Are you sure you want to reset all settings to default?")) return;

    this.elements.promptTemplate.value = DEFAULTS.prompt;
    this.elements.incognito.checked = DEFAULTS.incognito;

    chrome.storage.sync.set(
      {
        promptTemplate: DEFAULTS.prompt,
        incognito: DEFAULTS.incognito,
      },
      () => this.showStatus("Reset to default!", "success")
    );
  }

  // ── UI Feedback ──────────────────────────────────────────

  showStatus(message, type = "info") {
    this.elements.status.textContent = message;
    this.elements.status.className = `status ${type}`;
    setTimeout(() => {
      this.elements.status.textContent = "";
      this.elements.status.className = "status";
    }, 3000);
  }
}

// Instantiate after DOM is ready
document.addEventListener("DOMContentLoaded", () => new PopupController());
