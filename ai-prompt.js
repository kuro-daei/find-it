let selectedText = "";

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  initializeI18n();
  initializeUI();
  loadSelectedText();
});

// Initialize i18n
function initializeI18n() {
  // Set page title
  document.title = chrome.i18n.getMessage("appTitle");

  // Set text content for elements
  document.getElementById("appTitle").textContent =
    chrome.i18n.getMessage("appTitle");
  document.getElementById("selectedText-label").textContent =
    chrome.i18n.getMessage("selectedText");
  document.getElementById("instruction-label").textContent =
    chrome.i18n.getMessage("instruction");
  document.getElementById("processing-label").textContent =
    chrome.i18n.getMessage("processing");
  document.getElementById("result-label").textContent =
    chrome.i18n.getMessage("result");

  // Set button text
  document.getElementById("summarizeButton").textContent =
    chrome.i18n.getMessage("summarize");
  document.getElementById("translateToJapaneseButton").textContent =
    chrome.i18n.getMessage("translateToJapanese");
  document.getElementById("translateToEnglishButton").textContent =
    chrome.i18n.getMessage("translateToEnglish");
  document.getElementById("explainButton").textContent =
    chrome.i18n.getMessage("explain");
  document.getElementById("submitButton").textContent =
    chrome.i18n.getMessage("execute");
  document.getElementById("cancelButton").textContent =
    chrome.i18n.getMessage("cancel");
  document.getElementById("copyButton").textContent =
    chrome.i18n.getMessage("copyResult");

  // Set placeholder
  document.getElementById("promptInput").placeholder =
    chrome.i18n.getMessage("promptPlaceholder");
}

// Initialize UI
function initializeUI() {
  // Preset buttons
  document.getElementById("summarizeButton").addEventListener("click", () => {
    usePreset("summarize");
  });
  document
    .getElementById("translateToJapaneseButton")
    .addEventListener("click", () => {
      usePreset("translateToJapanese");
    });
  document
    .getElementById("translateToEnglishButton")
    .addEventListener("click", () => {
      usePreset("translateToEnglish");
    });
  document.getElementById("explainButton").addEventListener("click", () => {
    usePreset("explain");
  });

  // Submit button
  document
    .getElementById("submitButton")
    .addEventListener("click", submitPrompt);

  // Cancel button
  document.getElementById("cancelButton").addEventListener("click", () => {
    window.close();
  });

  // Copy button
  document.getElementById("copyButton").addEventListener("click", copyResult);

  // Initial state
  document.getElementById("resultSection").style.display = "none";

  log("UI initialized");
}

// Load selected text
async function loadSelectedText() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "getSelectedText",
    });
    if (response && response.text) {
      selectedText = response.text;
      document.getElementById("selectedText").textContent = selectedText;
      log("Selected text loaded:", selectedText);
    } else {
      warn("No text selected or failed to get selection");
    }
  } catch (error) {
    error("Error loading selected text:", error);
  }
}

// Logging functions
function log(...args) {
  console.log("📝 [AI Prompt]", ...args);
}

function warn(...args) {
  console.warn("⚠️ [AI Prompt]", ...args);
}

function error(...args) {
  console.error("❌ [AI Prompt]", ...args);
}

// Handle preset buttons
function usePreset(type) {
  const promptInput = document.getElementById("promptInput");
  switch (type) {
    case "summarize":
      promptInput.value = "Please summarize this text:\n";
      break;
    case "translateToJapanese":
      promptInput.value = "このテキストを日本語に翻訳してください:\n";
      break;
    case "translateToEnglish":
      promptInput.value = "Please translate this text to English:\n";
      break;
    case "explain":
      promptInput.value = "Please explain this text:\n";
      break;
  }
}

// Handle prompt submission
async function submitPrompt() {
  const promptInput = document.getElementById("promptInput");
  const prompt = promptInput.value.trim();

  // Input validation
  if (!prompt) {
    alert("指示文を入力してください");
    promptInput.focus();
    return;
  }

  if (!selectedText) {
    alert("テキストが選択されていません");
    return;
  }

  showLoading(true);
  console.log("🚀 Submitting prompt:", { prompt, selectedText });

  try {
    // Refresh selected text (just in case)
    await refreshSelectedText();

    if (!selectedText) {
      throw new Error("Failed to get selected text");
    }

    // Send to AI
    const result = await sendToAI(prompt, selectedText);

    // Display result
    showResult(result);
    console.log("✅ AI processing complete:", result);
  } catch (error) {
    console.error("❌ AI processing failed:", error);
    showError(error);
  } finally {
    showLoading(false);
  }
}

// Refresh selected text
async function refreshSelectedText() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getSelectedText" }, (response) => {
      if (response && response.text) {
        selectedText = response.text;
        document.getElementById("selectedText").textContent = selectedText;
        console.log("📝 Refreshed selected text:", selectedText);
      } else {
        console.warn("⚠️ Failed to refresh selected text");
      }
      resolve();
    });
  });
}

// Send request to AI
async function sendToAI(prompt, text) {
  console.log("🤖 Sending to AI:", { prompt, textLength: text.length });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("AI request timed out"));
    }, 30000); // 30 second timeout

    chrome.runtime.sendMessage(
      {
        type: "processWithAI",
        prompt: `回答のみを出力してください。挨拶、説明、追加のコメントは含めないでください。直接的な回答のみを提供し、前置き、文脈説明、追加の説明は避けてください。${prompt}:`,
        text: text,
      },
      (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          console.error("💥 Runtime error:", chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          console.error("💥 Empty response received");
          reject(new Error("Empty response from AI"));
          return;
        }

        if (response.error) {
          console.error("💥 API error:", response.error);
          reject(response.error);
          return;
        }

        if (!response.result) {
          console.error("💥 No result in response:", response);
          reject(new Error("No result in AI response"));
          return;
        }

        console.log("✨ AI response received:", response);
        resolve(response.result);
      }
    );
  });
}

// Display result
function showResult(result) {
  const resultContent = document.getElementById("resultContent");
  const resultSection = document.getElementById("resultSection");

  // Set result in textarea
  resultContent.value = result;

  // Adjust height automatically
  resultContent.style.height = "auto";
  resultContent.style.height =
    Math.min(resultContent.scrollHeight + 5, 400) + "px";

  resultSection.style.display = "block";

  // Scroll to result
  resultSection.scrollIntoView({ behavior: "smooth" });

  // Select result
  resultContent.focus();
  resultContent.select();

  log("Result displayed and selected");
}

// Display error
function showError(error) {
  const message = error.message || chrome.i18n.getMessage("unknownError");
  console.error("💥 Error:", message);
  alert(chrome.i18n.getMessage("errorOccurred", [message]));
}

// Control loading display
function showLoading(show) {
  const loadingElement = document.getElementById("loading");
  const submitButton = document.getElementById("submitButton");

  loadingElement.style.display = show ? "block" : "none";
  submitButton.disabled = show;
  submitButton.textContent = show ? "Processing..." : "Submit";
}

function copyResult() {
  const resultContent = document.getElementById("resultContent");
  const copyButton = document.getElementById("copyButton");
  const originalText = copyButton.textContent;

  try {
    resultContent.focus();
    resultContent.select();
    document.execCommand("copy");
    copyButton.textContent = chrome.i18n.getMessage("copiedToClipboard");
    log("Result copied to clipboard");
  } catch (error) {
    error("Copy failed:", error);
    alert(chrome.i18n.getMessage("copyFailed"));
  }
}
