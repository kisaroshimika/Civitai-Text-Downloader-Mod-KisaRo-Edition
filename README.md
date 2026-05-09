# Civitai Text Downloader Mod KisaRo Edition

Civitaiのモデルページにて、モデルファイルのダウンロードと同時に、メタデータ（JSON形式）やサムネイル画像に加え、**KisaRo Edition最大の特徴である「モデルの説明文（テキストファイル）」**をまとめてダウンロードできる拡張スクリプト（UserScript）です。
また、モデル詳細の下部に、モデル本体はダウンロードせずに「JSON・画像・説明文のみ」を取得できる専用ボタンも追加されます。

## ✨ 主な機能

- **説明文のテキスト化（KisaRo Edition専用機能）**: モデルの説明（Description）からHTMLタグなどを除去し、読みやすいプレーンテキスト（.txt）として自動保存します。
- **一括ダウンロード**: 通常のDownloadボタンをクリックした際に、モデルファイルだけでなく、そのモデルのメタデータ(JSON)・プレビュー画像・説明文(.txt)を同時にダウンロードします。
- **情報のみダウンロード**: 「JSON and Image Download」ボタンから、モデル本体をダウンロードせずに付随データ（JSON/画像/説明文）だけを取得できます。
- **複数ドメイン対応**: `civitai.com` だけでなく、`civitai.red` 等の代替ドメインにも対応しています。

## 🌐 動作確認環境

- **ブラウザ**: Google Chrome
- **拡張機能**: Tampermonkey
※上記以外のブラウザや拡張機能（Violentmonkey等）での動作検証は行っておりません。

## 📥 導入方法

1. Google Chromeに拡張機能 **[Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)** をインストールします。
2. Tampermonkeyのアイコンをクリックし、「新規スクリプトを追加」を選択します。
3. エディタに表示されている初期コードをすべて削除し、当リポジトリの `Civitai Text Downloader Mod KisaRo Edition.user.js` のコードをすべてコピー＆ペーストします。
4. `Ctrl + S` キーを押すか、「ファイル」メニューから「保存」をクリックしてスクリプトを保存します。
5. Civitaiのサイトにアクセスし、モデルのページを開くとスクリプトが適用されます。

## 使い方

- **モデルをダウンロードする場合**:
  通常通りCivitaiのモデルダウンロードボタンを押すと、バックグラウンドでJSON（メタデータ）、プレビュー画像、説明文のテキストファイルがモデル本体と一緒にダウンロードされます。
- **メタデータ・画像のみが欲しい場合**:
  ダウンロードボタンの近くに追加される `JSON and Image Download` ボタンをクリックしてください。

## 📝 ライセンスとクレジット

本スクリプトは [Takenoko3333](https://github.com/Takenoko3333) 氏によって作成されたスクリプトをベースに改変を加えたものです。
オリジナルのライセンスに則り、**BSD License**を継承しています。

- **Original Author**: Takenoko3333 (Modified from Civitai Text Downloader Mod)
- **Modified by**: KisaRoshimika
- **License**: BSD License

---
**免責事項**: 
本スクリプトは自己責任でご利用ください。本スクリプトの利用により発生したいかなるトラブルや損害についても、作者は一切の責任を負いません。また、Civitaiの仕様変更により突然動作しなくなる可能性があります。
