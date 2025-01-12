// Initialize i18n
function initializeI18n() {
  // Set page title
  document.title = chrome.i18n.getMessage("optionsTitle");

  // Set text content for all elements
  document.querySelector(".gradient-text").textContent =
    chrome.i18n.getMessage("appTitle");
  document.querySelector("div > p").textContent =
    chrome.i18n.getMessage("appDescription");

  // API Key section
  document.querySelector(".section h2").textContent =
    chrome.i18n.getMessage("apiKeyTitle");
  document.getElementById("apiKey").placeholder =
    chrome.i18n.getMessage("apiKeyPlaceholder");
  document.querySelector(".section a").textContent =
    chrome.i18n.getMessage("getApiKey");

  // System Prompt section
  document.querySelectorAll(".section h2")[1].textContent =
    chrome.i18n.getMessage("systemPromptTitle");
  document.getElementById("systemPrompt").placeholder = chrome.i18n.getMessage(
    "systemPromptPlaceholder"
  );
  document.querySelector(".hint").textContent =
    chrome.i18n.getMessage("systemPromptHint");

  // Search Sections
  document.querySelector(".section-heading").textContent =
    chrome.i18n.getMessage("searchSectionsTitle");
  document.querySelector("#add-section span:not(.add-icon)").textContent =
    chrome.i18n.getMessage("addSection");
  document.querySelector("#reset-settings span").textContent =
    chrome.i18n.getMessage("resetDefaults");
}

// Function to save settings with debounce
let saveTimeout;
function saveSettings() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const sections = Array.from(
      document.getElementsByClassName("section search-section")
    ).map((section) => ({
      title: section.querySelector(".section-title").value,
      details: section.querySelector(".section-description").value,
      url: section.querySelector(".section-url").value,
    }));

    const settings = {
      apiKey: document.getElementById("apiKey").value,
      systemPrompt: document.getElementById("systemPrompt").value,
      sections: sections,
    };

    try {
      await chrome.storage.sync.set(settings);
      showStatus(chrome.i18n.getMessage("result"));
    } catch (error) {
      showStatus(chrome.i18n.getMessage("error"), true);
      console.error("Save error:", error);
    }
  }, 500);
}

// Show status message
function showStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = isError ? "status-error" : "status-success";
  status.style.opacity = "1";
  setTimeout(() => {
    status.style.opacity = "0";
  }, 2000);
}

// Function to create a new search section
function createSearchSection() {
  const section = document.createElement("div");
  section.className = "section search-section";
  section.innerHTML = `
    <div class="input-group">
      <label for="title">${chrome.i18n.getMessage("selectedText")}</label>
      <input type="text" class="section-title" placeholder="e.g., Perplexity, Google, Amazon">
    </div>
    <div class="input-group">
      <label for="details">${chrome.i18n.getMessage("instruction")}</label>
      <textarea class="section-description" placeholder="${chrome.i18n.getMessage(
        "promptPlaceholder"
      )}"></textarea>
    </div>
    <div class="input-group">
      <label for="url">${chrome.i18n.getMessage("url")}</label>
      <input type="text" class="section-url" placeholder="e.g., perplexity.ai, google.com">
    </div>
    <button class="delete-button" type="button">
      ${chrome.i18n.getMessage("cancel")}
    </button>
  `;

  // Add auto-save to all inputs in the section
  section.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("input", saveSettings);
    input.addEventListener("blur", saveSettings);
  });

  // Add delete functionality with auto-save
  section.querySelector(".delete-button").addEventListener("click", () => {
    section.remove();
    saveSettings();
  });

  return section;
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize i18n
  initializeI18n();

  const sectionsContainer = document.getElementById("sections-list");

  // Reset settings button functionality
  document
    .getElementById("reset-settings")
    .addEventListener("click", async () => {
      try {
        document.getElementById("systemPrompt").value =
          defaultSettings.systemPrompt;
        sectionsContainer.innerHTML = "";
        defaultSettings.sections.forEach((section) => {
          const newSection = createSearchSection();
          newSection.querySelector(".section-title").value = section.title;
          newSection.querySelector(".section-description").value =
            section.details;
          newSection.querySelector(".section-url").value = section.url;
          sectionsContainer.appendChild(newSection);
        });
        await saveSettings();
        showStatus(chrome.i18n.getMessage("resetDefaults"));
      } catch (error) {
        showStatus(chrome.i18n.getMessage("error"), true);
        console.error("Reset error:", error);
      }
    });

  // Add section button functionality
  document.getElementById("add-section").addEventListener("click", () => {
    const newSection = createSearchSection();
    sectionsContainer.appendChild(newSection);
    saveSettings();
  });

  // Add auto-save to API Key and System Prompt
  ["apiKey", "systemPrompt"].forEach((id) => {
    const element = document.getElementById(id);
    element.addEventListener("input", saveSettings);
    element.addEventListener("blur", saveSettings);
  });

  // Load saved settings
  chrome.storage.sync.get(["apiKey", "systemPrompt", "sections"], (items) => {
    if (items.apiKey) {
      document.getElementById("apiKey").value = items.apiKey;
    }
    if (items.systemPrompt) {
      document.getElementById("systemPrompt").value = items.systemPrompt;
    } else {
      document.getElementById("systemPrompt").value =
        defaultSettings.systemPrompt;
    }

    // Load sections
    const sections = items.sections || defaultSettings.sections;
    sections.forEach((section) => {
      const newSection = createSearchSection();
      newSection.querySelector(".section-title").value = section.title;
      newSection.querySelector(".section-description").value = section.details;
      newSection.querySelector(".section-url").value = section.url;
      sectionsContainer.appendChild(newSection);
    });
  });

  // Language selector functionality
  document
    .getElementById("language-select")
    .addEventListener("change", function (e) {
      chrome.storage.sync.set({ language: e.target.value });
      window.location.reload();
    });
});
