import { systemPrompt } from './systemPrompt.js';

chrome.omnibox.onInputEntered.addListener(async (text) => {
  try {
    console.log('🔍 Entered text:', text);
    const settings = await chrome.storage.sync.get(['apiKey', 'sections']);
    console.log('⚙️ Retrieved settings:', settings);

    if (!settings.apiKey) {
      console.warn('⚠️ API key is not set.');
      openOptionsPage('Please set your OpenAI API key in the extension settings.');
      return;
    }

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt + '\nIMPORTANT:' + settings.systemPrompt + '\nRespond only with JSON in format: {"url": "string"}'
        },
        {
          role: 'user',
          content: `Search query: "${text}"\nAvailable sections: ${JSON.stringify(settings.sections)}`
        }
      ],
      response_format: { type: "json_object" }
    };

    console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Sending API request...');

    if (!response.ok) {
      console.error('❌ API request failed:', response.statusText);
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Received API response:', data);

    const result = JSON.parse(data.choices[0].message.content.trim());
    console.log('🔗 Generated search URL:', result.url);

    chrome.tabs.create({ url: result.url });

  } catch (error) {
    console.error('💥 Error occurred:', error);
    openOptionsPage(`Error: ${error.message}`);
  }
});

function openOptionsPage(errorMessage) {
  console.log('🛠️ Opening options page:', errorMessage);
  chrome.tabs.create({
    url: chrome.runtime.getURL('error.html')
  });
}

chrome.action.onClicked.addListener(() => {
  console.log('🖱️ Options page open action clicked.');
  chrome.runtime.openOptionsPage();
});
