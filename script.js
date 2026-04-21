const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const messageList = document.getElementById("messageList");

// Chrome 系を想定
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const recognition = new SpeechRecognition();

let isListening = false;

// 一番下までスクロール
function scrollToBottom() {
  const lastMessage = messageList.lastElementChild;

  if (!lastMessage) {
    return;
  }

  lastMessage.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}

// 字幕を1行追加
function createMessageRow(text) {
  const row = document.createElement("div");
  row.className = "message-row";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  messageList.appendChild(row);
  scrollToBottom();
}

// ボタン状態を更新
function updateButtonState() {
  startButton.disabled = isListening;
  stopButton.disabled = !isListening;
  startButton.classList.toggle("is-recording", isListening);
}

// 音声認識の設定
recognition.lang = "en-US";　//　日本語なら "ja-JP"　両方だと精度低い
recognition.continuous = true;
recognition.interimResults = false; // 途中字幕は使わない

// 認識開始
recognition.addEventListener("start", () => {
  isListening = true;
  updateButtonState();
});

// 確定字幕だけ追加
recognition.addEventListener("result", (event) => {
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    if (event.results[i].isFinal) {
      const transcript = event.results[i][0].transcript.trim();

      if (transcript) {
        createMessageRow(transcript);
      }
    }
  }
});

// エラー時は停止扱い
recognition.addEventListener("error", () => {
  isListening = false;
  updateButtonState();
});

// 認識終了時
recognition.addEventListener("end", () => {
  isListening = false;
  updateButtonState();
});

// 開始ボタン
startButton.addEventListener("click", () => {
  if (isListening) {
    return;
  }

  recognition.start();
});

// 終了ボタン
stopButton.addEventListener("click", () => {
  if (!isListening) {
    return;
  }

  recognition.stop();
});

updateButtonState();
