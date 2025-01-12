// デバッグモード
const DEBUG = true;

// ログ出力
function log(...args) {
  if (DEBUG) {
    console.log("📝 [Content]", ...args);
  }
}

// エラーログ
function error(...args) {
  if (DEBUG) {
    console.error("❌ [Content]", ...args);
  }
}

// 選択テキストを保持する変数
let selectedText = "";

// テキスト選択時のイベントリスナー
document.addEventListener("selectionchange", () => {
  try {
    const selection = window.getSelection();
    const newText = selection.toString().trim();

    if (newText !== selectedText) {
      selectedText = newText;
      log(
        "Selection updated:",
        selectedText ? `${selectedText.slice(0, 50)}...` : "empty"
      );
    }
  } catch (e) {
    error("Error updating selection:", e);
  }
});

// 現在の選択テキストを取得
function getCurrentSelection() {
  try {
    // 現在のselectionを直接取得
    const selection = window.getSelection();
    const currentText = selection.toString().trim();

    // 保持している値と比較・更新
    if (currentText && currentText !== selectedText) {
      selectedText = currentText;
      log("Selection refreshed:", `${selectedText.slice(0, 50)}...`);
    }

    return selectedText;
  } catch (e) {
    error("Error getting current selection:", e);
    return "";
  }
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log("Received message:", request);

  switch (request.type) {
    case "getSelectedText":
      const text = getCurrentSelection();
      log(
        "Returning selected text:",
        text ? `${text.slice(0, 50)}...` : "empty"
      );
      sendResponse({ text });
      break;

    default:
      error("Unknown message type:", request.type);
      sendResponse({});
  }
});

// 初期化時のログ
log("Content script initialized");
