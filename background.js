import { systemPrompt } from "./systemPrompt.js";

// Store selected text
let lastSelectedText = "";

// Register context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "aiContextMenu",
    title: "Ask AI",
    contexts: ["selection"],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "aiContextMenu") {
    handleAIContextMenuClick(info, tab);
  }
});

async function handleAIContextMenuClick(info, tab) {
  try {
    const selectedText = await getSelectedText(tab.id);
    if (!selectedText) {
      console.warn("⚠️ No text selected");
      return;
    }

    // Store selected text
    lastSelectedText = selectedText;
    console.log("📝 Stored selected text:", lastSelectedText);

    // Show AI prompt window
    chrome.windows.create({
      url: chrome.runtime.getURL("ai-prompt.html"),
      type: "popup",
      width: 600,
      height: 800,
    });
  } catch (error) {
    console.error("💥 Error handling context menu click:", error);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Received message:", request);

  switch (request.type) {
    case "processWithAI":
      if (!request.prompt || !request.text) {
        console.error("❌ Invalid request parameters:", request);
        sendResponse({
          error: new Error("Prompt or text not specified"),
        });
        return false;
      }

      console.log("🤖 Processing with AI:", {
        prompt: request.prompt,
        text: request.text,
      });

      processWithAI(request.prompt, request.text)
        .then((result) => {
          console.log("✅ AI processing successful");
          sendResponse({ result });
        })
        .catch((error) => {
          console.error("❌ AI processing failed:", error);
          sendResponse({ error });
        });
      return true;

    case "getSelectedText":
      console.log("📝 Returning selected text:", lastSelectedText);
      sendResponse({ text: lastSelectedText });
      return false;

    default:
      console.warn("⚠️ Unknown message type:", request.type);
      sendResponse({});
      return false;
  }
});

async function processWithAI(prompt, text) {
  console.log("🚀 Starting AI processing");

  try {
    const settings = await chrome.storage.sync.get(["apiKey", "systemPrompt"]);
    console.log("⚙️ Retrieved settings:", {
      hasApiKey: !!settings.apiKey,
      hasSystemPrompt: !!settings.systemPrompt,
    });

    if (!settings.apiKey) {
      throw new Error("API key not set");
    }

    const requestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: settings.systemPrompt || "You are a helpful assistant.",
        },
        {
          role: "user",
          content: `${prompt}\n\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    };

    console.log("📦 AI Request Body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 API Response Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error Response:", errorData);

      if (response.status === 401) {
        throw new Error("Invalid API key");
      } else if (response.status === 429) {
        throw new Error("API request limit reached");
      } else {
        throw new Error(
          errorData.error?.message ||
            `API request failed (${response.status}: ${response.statusText})`
        );
      }
    }

    const data = await response.json();
    console.log("✅ AI Response Data:", {
      id: data.id,
      model: data.model,
      usage: data.usage,
      hasChoices: !!data.choices?.length,
    });

    if (!data.choices?.[0]?.message?.content) {
      console.error("❌ Invalid API response format:", data);
      throw new Error("Invalid API response format");
    }

    const result = data.choices[0].message.content;
    console.log("🎯 AI Result:", result);
    return result;
  } catch (error) {
    console.error("💥 AI Processing Error:", error);

    // Translate error messages
    const errorMessage = error.message
      .replace("API key is not set", "API key not set")
      .replace("API request failed", "API request failed")
      .replace("Invalid API response format", "Invalid API response format");

    throw new Error(errorMessage);
  }
}

async function getSelectedText(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "getSelectedText" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "💥 Error getting selected text:",
          chrome.runtime.lastError
        );
        resolve("");
      } else {
        resolve(response?.text || "");
      }
    });
  });
}

chrome.omnibox.onInputEntered.addListener(async (text) => {
  try {
    console.log("🔍 Entered text:", text);
    const settings = await chrome.storage.sync.get([
      "apiKey",
      "sections",
      "systemPrompt",
    ]);
    console.log("⚙️ Retrieved settings:", settings);

    if (!settings.apiKey) {
      console.warn("⚠️ API key is not set.");
      openOptionsPage("Please set OpenAI API key");
      return;
    }

    const requestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n${
            settings.systemPrompt || ""
          }\nRespond only with JSON in format: {"url": "string"}`,
        },
        {
          role: "user",
          content: `Search query: "${text}"\nAvailable sections: ${JSON.stringify(
            settings.sections
          )}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    };

    console.log(
      "📦 Search Request Body:",
      JSON.stringify(requestBody, null, 2)
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Search API Error:", errorData);
      throw new Error(
        errorData.error?.message || `API request failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ Search API Response:", data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid API response format");
    }

    const result = JSON.parse(data.choices[0].message.content.trim());
    console.log("🔗 Generated URL:", result.url);

    if (!result.url) {
      throw new Error("Generated URL is empty");
    }

    chrome.tabs.create({ url: result.url });
  } catch (error) {
    console.error("💥 Search error:", error);
    openOptionsPage(`Error: ${error.message}`);
  }
});

function openOptionsPage(errorMessage) {
  console.log("🛠️ Opening options page:", errorMessage);
  chrome.tabs.create({
    url: chrome.runtime.getURL("error.html"),
  });
}

chrome.action.onClicked.addListener(() => {
  console.log("🖱️ Options page open action clicked.");
  chrome.runtime.openOptionsPage();
});
