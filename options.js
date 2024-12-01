
// Function to save settings with debounce
let saveTimeout;
function saveSettings() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const sections = Array.from(document.getElementsByClassName('section search-section')).map(section => ({
      title: section.querySelector('.section-title').value,
      details: section.querySelector('.section-description').value,
      domain: section.querySelector('.section-url').value
    }));

    const settings = {
      apiKey: document.getElementById('apiKey').value,
      systemPrompt: document.getElementById('systemPrompt').value,
      sections: sections
    };

    try {
      await chrome.storage.sync.set(settings);
      showStatus('Settings saved');
    } catch (error) {
      showStatus('Error saving settings', true);
      console.error('Save error:', error);
    }
  }, 500);
}

// Show status message
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = isError ? 'status-error' : 'status-success';
  status.style.opacity = '1';
  setTimeout(() => {
    status.style.opacity = '0';
  }, 2000);
}


document.addEventListener('DOMContentLoaded', function () {
  const sectionsContainer = document.getElementById('sections-list');

  // Add section button functionality
  document.getElementById('add-section').addEventListener('click', () => {
    const newSection = createSearchSection();
    sectionsContainer.appendChild(newSection);
    saveSettings();
  });

  // Add auto-save to API Key and System Prompt
  ['apiKey', 'systemPrompt'].forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener('input', saveSettings);
    element.addEventListener('blur', saveSettings); // Save on focus loss
  });

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'systemPrompt', 'sections'], items => {
    if (items.apiKey) {
      document.getElementById('apiKey').value = items.apiKey;
    }
    if (items.systemPrompt) {
      document.getElementById('systemPrompt').value = items.systemPrompt;
    } else {
      document.getElementById('systemPrompt').value = defaultSettings.systemPrompt;
    }

    // Load sections
    const sections = items.sections || defaultSettings.sections;
    sections.forEach(section => {
      const newSection = createSearchSection();
      newSection.querySelector('.section-title').value = section.title;
      newSection.querySelector('.section-description').value = section.details;
      newSection.querySelector('.section-url').value = section.domain;
      sectionsContainer.appendChild(newSection);
    });
  });
});

// Function to create a new search section
function createSearchSection() {
  const section = document.createElement('div');
  section.className = 'section search-section';
  section.innerHTML = `
    <div class="input-group">
      <label for="title">Search Title</label>
      <input type="text" class="section-title" placeholder="e.g., Perplexity, Google, Amazon">
    </div>
    <div class="input-group">
      <label for="details">Search Details</label>
      <textarea class="section-description" placeholder="Describe when to use this search option"></textarea>
    </div>
    <div class="input-group">
      <label for="domain">Domain</label>
      <input type="text" class="section-url" placeholder="e.g., perplexity.ai, google.com">
    </div>
    <button class="delete-button" type="button">
      Remove Section
    </button>
  `;

  // Add auto-save to all inputs in the section
  section.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', saveSettings);
    input.addEventListener('blur', saveSettings);
  });

  // Add delete functionality with auto-save
  section.querySelector('.delete-button').addEventListener('click', () => {
    section.remove();
    saveSettings();
  });

  return section;
}