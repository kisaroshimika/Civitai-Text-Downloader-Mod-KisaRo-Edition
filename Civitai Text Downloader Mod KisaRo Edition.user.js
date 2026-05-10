// ==UserScript==
// @name            Civitai Text Downloader Mod KisaRo Edition
// @name:ja         Civitai Text Downloader Mod KisaRo Edition
// @namespace       http://tampermonkey.net/
// @version         1.0.2
// @description     Click Download button will download the file and save the JSON, images, and model description (.txt) at the same time. Also add a button to download JSON, images, and description under details.
// @description:ja  Downloadボタンをクリックするとファイルのダウンロードと同時にJSON、画像、およびモデル説明文（.txt）が保存されます。また、Detailsの下にJSONと画像、説明文をダウンロードするボタンを追加します。
// @author          KisaRoshimika
// @match           https://civitai.com/*
// @match           https://civitai.red/*
// @icon            https://civitai.com/favicon.ico
// @grant           GM.addStyle
// @grant           GM.xmlHttpRequest
// @connect         civitai.com
// @connect         image.civitai.com
// @connect         civitai.red
// @connect         image.civitai.red
// @connect         civitai-media-uploads.sfo3.digitaloceanspaces.com
// @license         BSD
// @downloadURL     https://raw.githubusercontent.com/kisaroshimika/Civitai-Text-Downloader-Mod-KisaRo-Edition/main/Civitai%20Text%20Downloader%20Mod%20KisaRo%20Edition.user.js
// @updateURL       https://raw.githubusercontent.com/kisaroshimika/Civitai-Text-Downloader-Mod-KisaRo-Edition/main/Civitai%20Text%20Downloader%20Mod%20KisaRo%20Edition.user.js
// ==/UserScript==
//
// Original author: Takenoko3333
// Modified from Civitai Text Downloader Mod

(function () {
    'use strict';

    // ========== ドメイン設定 ==========
    // 新しいドメインを追加する場合：
    // 1) ここの SUPPORTED_DOMAINS に追加
    // 2) UserScriptヘッダーに @match と @connect を追加
    const SUPPORTED_DOMAINS = [
        'civitai.com',
        'civitai.red',
    ];

    /**
     * 現在のページのドメインに基づいてAPIベースURLを返す。
     * SUPPORTED_DOMAINS に含まれるドメインならそのまま使用し、
     * それ以外は civitai.com にフォールバックする。
     */
    function getApiBaseUrl() {
        const currentHost = location.hostname;
        if (SUPPORTED_DOMAINS.includes(currentHost)) {
            return `https://${currentHost}`;
        }
        return 'https://civitai.com';
    }
    // ========== ドメイン設定ここまで ==========

    // ---------- BEGIN PATCH ----------
    // 1) 説明テキストを .txt として保存するヘルパー関数
    function saveDescriptionTxt(descriptionRaw, jsonFilename) {
        if (!descriptionRaw) return;
        let text = (typeof descriptionRaw === "string") ? descriptionRaw : String(descriptionRaw || "");

        text = text
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote|pre|ul|ol|table|thead|tbody|tfoot)>/gi, "\n\n")
            .replace(/<hr[^>]*>/gi, "\n\n---\n\n")
            .replace(/<li[^>]*>/gi, "• ");

        text = text.replace(/<[^>]+?>/g, "");

        text = text.replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, (m) => {
            switch (m.toLowerCase()) {
                case "&nbsp;": return " ";
                case "&amp;": return "&";
                case "&lt;": return "<";
                case "&gt;": return ">";
                case "&quot;": return "\"";
                case "&#39;": return "'";
                default: return m;
            }
        });

        text = text
            .replace(/\r?\n/g, "\n")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/^\s+|\s+$/g, "");

        const blob = new Blob([text.replace(/\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = jsonFilename.replace(/\.json$/i, "") + ".txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // 2) API取得に安全チェック＋リトライ
    const RETRY_MAX = 4;
    const RETRY_BASE_DELAY = 500;

    function gmFetch(url, opts = {}) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: opts.method || 'GET',
                url,
                responseType: opts.responseType || '',
                headers: opts.headers || {},
                onload: (res) => resolve(res),
                onerror: (err) => reject(err),
                ontimeout: (err) => reject(err)
            });
        });
    }

    async function fetchModelJsonSafe(modelId, tryCount = 0) {
        const url = `${getApiBaseUrl()}/api/v1/models/${modelId}`;
        try {
            const res = await gmFetch(url, { method: 'GET' });
            if (res.status >= 400) {
                throw new Error(`HTTP Status ${res.status}`);
            }
            const j = JSON.parse(res.responseText || '{}');

            if (!j || !Array.isArray(j.modelVersions)) {
                throw new Error('modelVersions が取得できませんでした');
            }
            return j;
        } catch (e) {
            if (tryCount < RETRY_MAX) {
                const delay = RETRY_BASE_DELAY * Math.pow(2, tryCount);
                console.warn(`[CTD] fetchModelJsonSafe 失敗。${delay}ms 後に再試行 (${tryCount + 1}/${RETRY_MAX})`, e);
                await new Promise(r => setTimeout(r, delay));
                return fetchModelJsonSafe(modelId, tryCount + 1);
            }
            console.error('[CTD] fetchModelJsonSafe 最終失敗：', e);
            throw e;
        }
    }

    function firstOrNull(arr) {
        return Array.isArray(arr) && arr.length ? arr[0] : null;
    }

    function safeFind(arr, predicate) {
        return Array.isArray(arr) ? arr.find(predicate) : undefined;
    }

    function getPrimaryFile(modelVersion) {
        if (!modelVersion || !Array.isArray(modelVersion.files) || modelVersion.files.length === 0) return null;
        const primaryFile = modelVersion.files.find(f => f.primary === true);
        if (primaryFile) return primaryFile;
        const modelFile = modelVersion.files.find(f => f.type === "Model");
        if (modelFile) return modelFile;
        return modelVersion.files[0];
    }
    // ---------- END PATCH ----------

    GM.addStyle(".ctd-button:not([data-disabled]) { color: #ffff00; }");

    let file_id = null;
    let category = "";

    // 定期的な監視（MutationObserverの代わりに堅牢なポーリング）
    // Chrome等での初回読み込み時も必ず検知できるようにします
    setInterval(() => {
        downloadFiles();
    }, 1000);

    function createButton() {
        // ボタンを追加するターゲット要素を探す
        let targetElement = document.querySelector('[data-tour="model:download"]');
        let buttonGroup = null;

        // "Create, Download, Share, 評価" などの横並びボタングループを親要素から探す
        if (targetElement) {
            let parent = targetElement.parentElement;
            // 数階層上まで遡り、ボタン類を複数もつ横並びの Flex あるいは Group コンテナを探す
            for (let i = 0; i < 5 && parent; i++) {
                if (parent.querySelectorAll('a[href^="/api/download/models/"], button, a[href*="/generators/"]').length >= 3) {
                    buttonGroup = parent;
                    break;
                }
                parent = parent.parentElement;
            }
        }

        // ボタングループが見つかれば、その直後にグループと分離して独立したブロックとして挿入する
        if (buttonGroup) {
            targetElement = buttonGroup;
        } else if (!targetElement) {
            targetElement = document.querySelector('table');
            if (!targetElement) targetElement = document.querySelector('a[href^="/api/download/models/"]');
        }

        if (!targetElement) return;

        if (targetElement.nextElementSibling && targetElement.nextElementSibling.classList.contains('json-image-download-button')) {
            return;
        }

        const newElement = document.createElement('a');
        newElement.className = 'mantine-UnstyledButton-root mantine-Button-root mantine-4fe1an json-image-download-button ctd-button';
        newElement.type = 'button';
        newElement.setAttribute('data-button', 'true');
        newElement.style.marginTop = '8px';
        newElement.style.width = '100%';
        newElement.style.display = 'block';
        newElement.style.textAlign = 'center';
        newElement.style.backgroundColor = 'rgba(25, 113, 194, 0.2)';
        newElement.style.color = '#339af0';
        newElement.style.padding = '8px 16px';
        newElement.style.borderRadius = '4px';
        newElement.style.cursor = 'pointer';
        newElement.style.fontWeight = 'bold';
        newElement.style.border = '1px solid #339af0';

        newElement.textContent = 'JSON and Image Download';

        // クラスによる重複チェックの安全装置
        if (!document.querySelector('.json-image-download-button')) {
            targetElement.insertAdjacentElement('afterend', newElement);
            newElement.addEventListener("click", jsonAndImageOnlyDownload);
        }
    }

    async function jsonAndImageOnlyDownload() {
        try {
            if (!file_id) {
                const mainDlBtn = document.querySelector('a[href^="/api/download/models/"]');
                if (mainDlBtn && mainDlBtn.href) {
                    const match = mainDlBtn.href.match(/\/models\/(\d+)\??/);
                    if (match) file_id = match[1];
                }
            }

            if (!file_id) {
                console.warn('[CTD] file_id が未確定のため、処理を中止します。');
                return;
            }

            const modelNameEl = document.querySelector('main h1');
            const modelName = modelNameEl ? modelNameEl.textContent : '';
            const _id = (location.pathname.split("/")[2]) || '';
            if (!_id) {
                console.warn('[CTD] URLからモデルIDを取得できませんでした。');
                return;
            }

            const j = await fetchModelJsonSafe(_id);
            const file = safeFind(j.modelVersions, x => x && x.id == file_id);
            if (!file) {
                console.error('[CTD] ファイル情報を特定できませんでした。', { file_id });
                return;
            }

            const primaryFile = getPrimaryFile(file);
            let filename = (primaryFile && primaryFile.name) || (file_id + ".json");
            filename = filename.replace(/\.[a-z]*$/i, ".json");

            const text = [JSON.stringify(j)];
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(new Blob(text));
            link.download = filename;
            link.click();

            saveDescriptionTxt(
                (typeof j.description === 'string' && j.description.trim().length ? j.description : ""),
                filename
            );

            await downloadModelImage(file, filename);
        } catch (e) {
            console.error('[CTD] jsonAndImageOnlyDownload のエラー:', e);
        }
    }

    async function downloadModelImage(file, filename) {
        const image = safeFind(file.images, x => x && x.type === 'image') || firstOrNull(file.images);
        if (image && image.url) {
            try {
                const res = await gmFetch(image.url, { method: 'GET', responseType: 'blob' });
                const dlLink = document.createElement("a");
                const dataUrl = URL.createObjectURL(res.response);
                dlLink.href = dataUrl;

                // BlobのMIMEタイプ（Content-Type）を優先して拡張子を決定
                let suffix = ".jpg";
                let typeMatched = false;
                if (res.response && res.response.type) {
                    if (res.response.type.includes("image/png")) { suffix = ".png"; typeMatched = true; }
                    else if (res.response.type.includes("image/webp")) { suffix = ".webp"; typeMatched = true; }
                    else if (res.response.type.includes("image/jpeg")) { suffix = ".jpg"; typeMatched = true; }
                    else if (res.response.type.includes("image/gif")) { suffix = ".gif"; typeMatched = true; }
                }
                
                // MIMEタイプで特定できない場合はURLから推測
                if (!typeMatched) {
                    const urlWithoutQuery = image.url.split('?')[0];
                    const dotIndex = urlWithoutQuery.lastIndexOf('.');
                    if (dotIndex !== -1 && dotIndex > urlWithoutQuery.lastIndexOf('/')) {
                        const ext = urlWithoutQuery.slice(dotIndex + 1).toLowerCase();
                        if (ext === "png") suffix = ".png";
                        else if (ext === "webp") suffix = ".webp";
                        else if (ext === "gif") suffix = ".gif";
                    }
                }

                const imageName = filename.replace(/\.json$/i, suffix);
                dlLink.download = imageName;
                document.body.appendChild(dlLink);
                dlLink.click();
                dlLink.remove();
                setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
            } catch (e) {
                console.warn('[CTD] 画像ダウンロードに失敗しました。', e);
            }
        }
    }

    function downloadFiles() {
        try {
            category = location.pathname.split("/")[1] || '';
            if (category != "models") return;

            // 代表のfile_idを取得
            let new_file_id = null;
            const downloadLinks = document.querySelectorAll('a[href^="/api/download/models/"]');

            // data-tour="model:download" を持つメインボタンを優先して探す
            let mainLink = safeFind(Array.from(downloadLinks), el => el.getAttribute('data-tour') === 'model:download');
            if (!mainLink && downloadLinks.length > 0) mainLink = downloadLinks[0];

            if (mainLink && mainLink.href) {
                const match = mainLink.href.match(/\/models\/(\d+)\??/);
                if (match) new_file_id = match[1];
            }

            if (new_file_id) {
                file_id = new_file_id;
            }

            // JSON and Image Download ボタンの作成・復帰
            const existingBtn = document.querySelector('.json-image-download-button');
            if (file_id && (!existingBtn || !document.body.contains(existingBtn))) {
                if (existingBtn) existingBtn.remove();
                createButton();
            }

            // 各ダウンロードボタンにイベントを付与
            downloadLinks.forEach(button => {
                // すでにイベント付与済みならスキップ
                if (button.dataset.ctdDone) return;
                if (button.classList.contains("json-image-download-button")) return;

                // 重複付与防止のフラグ
                button.dataset.ctdDone = "true";

                button.addEventListener("click", async function () {
                    try {
                        const modelNameEl = document.querySelector('main h1');
                        const modelName = modelNameEl ? modelNameEl.textContent : '';
                        const spanElements = document.querySelectorAll('span');
                        let strength = null;
                        const _id = (location.pathname.split("/")[2]) || '';
                        if (!_id) {
                            console.warn('[CTD] URLからモデルID(_id)を取得できませんでした。');
                            return;
                        }

                        spanElements.forEach(element => {
                            if (/^Strength:/.test(element.textContent)) {
                                strength = element.textContent.split(":")[1].trim();
                            }
                        });

                        // クリックされたボタン自身の file_id を取得
                        let current_file_id = file_id;
                        if (button.tagName.toLowerCase() === 'a' && button.href) {
                            const match = button.href.match(/\/models\/(\d+)\??/);
                            if (match) current_file_id = match[1];
                        }

                        if (!current_file_id) {
                            console.warn('[CTD] ファイルIDを取得できませんでした。');
                            return;
                        }

                        const j = await fetchModelJsonSafe(_id);
                        const file = safeFind(j.modelVersions, x => x && x.id == current_file_id);
                        if (!file) {
                            console.error('[CTD] ファイル情報を特定できませんでした。');
                            return;
                        }

                        let link = document.createElement('a');
                        let text = {
                            "description": "",
                            "model name": modelName,
                            "model url": document.URL,
                            "base model": file.baseModel,
                            "sd version": "Unknown",
                            "activation text": "",
                            "preferred weight": 0,
                            "notes": document.URL + "\nModel name: " + modelName + "\nBase model: " + file.baseModel
                        };

                        if (/^SD 1/.test(file.baseModel)) text["sd version"] = "SD1";
                        else if (/^SD 2/.test(file.baseModel)) text["sd version"] = "SD2";
                        else if (/^SDXL/.test(file.baseModel) || /^Pony/.test(file.baseModel)) text["sd version"] = "SDXL";
                        else if (/^SD 3/.test(file.baseModel)) text["sd version"] = "SD3";

                        if (j.description && j.description.textContent) {
                            text.description = j.description.textContent;
                        }
                        if (Array.isArray(file.trainedWords)) {
                            text["activation text"] = file.trainedWords.join(" ");
                        }
                        if (strength) {
                            text["preferred weight"] = strength;
                        }

                        const jsonPayload = [JSON.stringify(text, null, 2)];
                        link.href = window.URL.createObjectURL(new Blob(jsonPayload));
                        const primaryFile = getPrimaryFile(file);
                        let filename = (primaryFile && primaryFile.name) || (current_file_id + ".json");
                        filename = filename.replace(/\.[a-z]*$/i, ".json");
                        link.download = filename;
                        link.click();

                        saveDescriptionTxt(
                            (typeof j.description === 'string' && j.description.trim().length ? j.description : file.description),
                            filename
                        );

                        await downloadModelImage(file, filename);

                    } catch (e) {
                        console.error('[CTD] download click handler のエラー:', e);
                    }
                });
            });
        } catch (e) {
            console.error('[CTD] downloadFiles のエラー:', e);
        }
    }
})();
