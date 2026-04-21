# readme

Chrome で動く、シンプルなリアルタイム字幕ページです。
2026年4月時点で、ChatGPT の音声会話は、終了後に会話履歴が表示されることを前提としています。

## 使い方

1. `index.html` を Chrome で開く
2. `開始` を押す
3. マイクを許可する
4. 録音中は `開始` が赤くなる
5. `終了` で止める

## 補足

- 自作の音声認識ではありません。
- Chrome が持っている音声認識機能SpeechRecognitionを使っています。

## 処理フロー
```
開始ボタン
↓
Chrome がマイク許可
↓
音声認識開始
↓
確定した音声結果を受け取る
↓
字幕履歴に1行追加
↓
スクロール
↓
終了ボタンで停止
```

```
役割：関数名
⓪ 初期表示：updateButtonState()
① 開始ボタン：startButton.addEventListener("click", ...) → マイクの許可
② 音声認識開始：recognition.start()
③ 録音開始イベント：recognition.addEventListener("start", ...)
④ 音声結果：recognition.addEventListener("result", ...)
⑤ 画面表示：createMessageRow()
⑥ スクロール：scrollToBottom()
⑦ 終了ボタン：stopButton.addEventListener("click", ...)
⑧ 音声認識停止：recognition.stop()
⑨ 終了イベント：recognition.addEventListener("end", ...)
⑩ マイク許可しない：recognition.addEventListener("error", ...)
```
