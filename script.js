const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const messageList = document.getElementById("messageList");

// ブラウザの音声認識機能を取得する。
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isRecognitionRunning = false;
let isManuallyStopping = false;
let assistantSocket = null;
let assistantReconnectTimer = null;
let canAutoRestart = true;

// 「自分：self」と「ChatGPT：assistant」を別々に 1行ずつ
const liveCaptionRows = {
  self: null,
  assistant: null,
};

// スクロール機能
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

// 字幕 1行分の HTML を作って一覧に追加する。
function createMessageRow(text) {
  const row = document.createElement("div");
  row.className = "message-row";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  messageList.appendChild(row);
  scrollToBottom();

  return row;
}

// 途中字幕を更新する。
// まだ行がなければ作り、あれば同じ行の文字だけ差し替える。
function updateLiveCaption(source, text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    removeLiveCaption(source);
    return;
  }

  if (!liveCaptionRows[source]) {
    liveCaptionRows[source] = createMessageRow(trimmedText);
    return;
  }

  const bubble = liveCaptionRows[source].querySelector(".bubble");
  bubble.textContent = trimmedText;
  scrollToBottom();
}

// 会話履歴の字幕は残す、音声確定前の字幕が消える。
function removeLiveCaption(source) {
  const row = liveCaptionRows[source];

  if (!row) {
    return;
  }

  row.remove();
  liveCaptionRows[source] = null;
}

// 確定した字幕を行として残す。
function commitFinalMessage(source, text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return;
  }

  removeLiveCaption(source);
  createMessageRow(trimmedText);
}

// ボタンの有効/無効
function updateButtonState() {
  const unsupported = !SpeechRecognition;

  startButton.disabled = unsupported || isRecognitionRunning;
  stopButton.disabled = unsupported || !isRecognitionRunning;
  startButton.classList.toggle("is-recording", isRecognitionRunning);
}

// ChatGPT 側の WebSocket が切れたら、少し待って再接続する。
function scheduleAssistantReconnect() {
  if (assistantSocket || assistantReconnectTimer) {
    return;
  }

  assistantReconnectTimer = window.setTimeout(() => {
    assistantReconnectTimer = null;
    connectChatGPTSocket();
  }, 3000);
}

// ChatGPT側の字幕受信用の接続口。
// 未接続なら切れても再接続する。
function connectChatGPTSocket() {
  if (assistantSocket) {
    return;
  }

  assistantSocket = new WebSocket("ws://127.0.0.1:8765");

  assistantSocket.addEventListener("open", () => {
    removeLiveCaption("assistant");
  });

  assistantSocket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);

    if (payload.speaker !== "assistant") {
      return;
    }

    if (payload.isFinal) {
      commitFinalMessage("assistant", payload.text || "");
      return;
    }

    updateLiveCaption("assistant", payload.text || "");
  });

  assistantSocket.addEventListener("close", () => {
    assistantSocket = null;
    removeLiveCaption("assistant");
    scheduleAssistantReconnect();
  });

  assistantSocket.addEventListener("error", () => {
    if (assistantSocket) {
      assistantSocket.close();
    } else {
      scheduleAssistantReconnect();
    }
  });
}

// Web Speech API の設定とイベント登録を行う。
function setupRecognition() {
  if (!SpeechRecognition) {
    startButton.textContent = "非対応";
    updateButtonState();
    return;
  }

  recognition = new SpeechRecognition();
  // 日本語なら "ja-JP"、英語なら "en-US" 必要に応じて変更(両方だと精度低い)
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  // 音声認識が始まったときのイベント。
  recognition.addEventListener("start", () => {
    isRecognitionRunning = true;
    isManuallyStopping = false;
    canAutoRestart = true;
    updateButtonState();
  });

  // 確定した字幕と確定前字幕を受け取り、それぞれ表示する。
  recognition.addEventListener("result", (event) => {
    let liveTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;

      // ブラウザが「ここで 1 つの発話が確定した」と判断している
      // isFinal が true が会話の区切り
      if (event.results[i].isFinal) {
        commitFinalMessage("self", transcript);
      } else {
        // まだ話し終わっていない途中の文字列は、確定せずに上書き表示する。
        liveTranscript += transcript;
      }
    }

    updateLiveCaption("self", liveTranscript);
  });

  // マイク拒否など、止めるべきエラーだけ自動再開を止める。
  recognition.addEventListener("error", (event) => {
    if (event.error === "not-allowed" || event.error === "audio-capture") {
      isRecognitionRunning = false;
      canAutoRestart = false;
      updateButtonState();
    }

    console.error("Speech recognition error:", event.error);
  });

  // 手動停止でなければ自動で再開する。
  recognition.addEventListener("end", () => {
    isRecognitionRunning = false;
    updateButtonState();

    // この end は「音声認識そのものが止まった」ときに呼ばれる。
    // これは字幕 1文 の区切りというより、会話が切れたかどうかの判定しているっぽい。
    removeLiveCaption("self");

    if (isManuallyStopping) {
      return;
    }

    if (!canAutoRestart) {
      return;
    }

    recognition.start();
  });

  updateButtonState();
}

// 開始ボタンは音声認識を始めるときにトリガー
startButton.addEventListener("click", () => {
  if (!recognition || isRecognitionRunning) {
    return;
  }

  canAutoRestart = true;
  recognition.start();
});

// 終了ボタンは自動再開しない停止として扱う。
stopButton.addEventListener("click", () => {
  if (!recognition || !isRecognitionRunning) {
    return;
  }

  isManuallyStopping = true;
  canAutoRestart = false;
  recognition.stop();
});

setupRecognition();
connectChatGPTSocket();
