const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const messageList = document.getElementById("messageList");

// Chromeブラウザの機能で、マイク音声を文字に変換している
const SpeechRecognition = window.SpeechRecognition;
const recognition = new SpeechRecognition();

// 初期値の録音状態は false
let isListening = false;

// スクロール
function scrollToBottom() {
  const lastMessage = messageList.lastElementChild;

  // 最初はスクロールしない
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

  // 字幕追加後にスクロール
  scrollToBottom();
}

// ボタン状態
function updateButtonState() {
  startButton.disabled = isListening;
  stopButton.disabled = !isListening;
  startButton.classList.toggle("is-recording", isListening);
}

// 音声認識の設定
recognition.lang = "en-US"; // 日本語なら "ja-JP" 両方だと精度が低い
recognition.continuous = true; // 録音を続ける→話し終わるたびにすぐ終了させない
recognition.interimResults = false; // 途中字幕は使わない→確定字幕のみ

// 音声認識開始
recognition.addEventListener("start", () => {
  isListening = true; // このタイミングで録音中フラグをtrueにし、ボタン表示を更新
  updateButtonState();
});

// 音声認識の結果を受け取り
/*
 * event.results の中に音声認識結果が入っている
 * 確定字幕した結果を扱うため、isFinal が true のものだけを処理する
 * 文字列の前後の空白を trimで削除して、空でない場合は字幕エリアに追加する
 */
recognition.addEventListener("result", (event) => {
  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    // ブラウザが「この発話は確定した」と判断した結果だけ使う
    if (event.results[i].isFinal) {
      // 文字列の前後の空白をtrimで削除
      const transcript = event.results[i][0].transcript.trim();

      // 字幕追加
      if (transcript) {
        createMessageRow(transcript);
      }
    }
  }
});

// マイクの許可しないときのエラー：録音を false に戻す
recognition.addEventListener("error", () => {
  isListening = false;
  updateButtonState();
});

// 終了時、停止時も同じ：録音を false に戻す
recognition.addEventListener("end", () => {
  isListening = false;
  updateButtonState();
});

// 開始ボタン
startButton.addEventListener("click", () => {
  // 録音中か
  if (isListening) {
    return;
  }

  // recognition.startでChromeが「マイクを許可」の確認を表示
  recognition.start();
});

// 終了ボタン
stopButton.addEventListener("click", () => {
  if (!isListening) {
    return;
  }

  recognition.stop();
});

// 初期状態のボタン表示
updateButtonState();
