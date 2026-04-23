// === app.js — SlimDrop 核心邏輯 ===
//
// 影片壓縮：ffmpeg.wasm（瀏覽器內執行 FFmpeg，完全本機處理）
// PPTX 壓縮：JSZip + Canvas API（解壓 → 壓縮嵌入圖片 → 重新打包）
//
// 所有處理都在瀏覽器本地完成，沒有任何資料離開使用者的裝置。

// === 全域狀態 ===
let ffmpeg = null;          // FFmpeg 實例（懶加載，第一次壓縮影片才下載）
let fetchFileFn = null;     // ffmpeg/util 的 fetchFile 函數（一起懶加載）
let progressCb = null;      // 目前的進度回呼（避免重複綁定 ffmpeg 事件）
let currentFile = null;     // 使用者目前選擇的檔案

// === 工具函數 ===

/** 將位元組數轉換為人類可讀的大小字串 */
function formatSize(bytes) {
    if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / 1024).toFixed(0) + ' KB';
}

/** 取得副檔名（小寫） */
function getExt(filename) {
    return filename.split('.').pop().toLowerCase();
}

/** 判斷是否為支援的影片格式 */
function isVideoFile(filename) {
    return ['mp4', 'mov', 'avi', 'mkv'].includes(getExt(filename));
}

/** 判斷是否為 PPTX */
function isPptxFile(filename) {
    return getExt(filename) === 'pptx';
}

/**
 * 透過 HTML5 Video 元素取得影片時長（秒）
 * 不需要上傳，只需在本機建立暫時的 Object URL
 */
// 接受 File 或 Blob（PPTX 嵌入影片會以 Blob 傳入）
function getVideoDuration(fileOrBlob) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const url = URL.createObjectURL(fileOrBlob);
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);  // 用完立即釋放記憶體
            resolve(video.duration);
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('無法讀取影片資訊，請確認檔案未損壞'));
        };
        video.src = url;
    });
}

// === 影片壓縮 ===

/**
 * 計算目標視訊位元率（kbps）
 * 公式：總位元率 = (目標大小 × 8) ÷ 時長
 *        視訊位元率 = 總位元率 − 音訊位元率 − 容器開銷
 *
 * @param {number} targetMB - 目標大小（MB）
 * @param {number} durationSec - 影片時長（秒）
 * @param {number} audioBitrateKbps - 音訊位元率（預設 128 kbps）
 */
function calcVideoBitrate(targetMB, durationSec, audioBitrateKbps = 128) {
    const totalKbps = (targetMB * 8 * 1024) / durationSec;
    const videoBitrate = totalKbps - audioBitrateKbps - 50;  // 50 kbps 給容器開銷
    return Math.max(150, Math.round(videoBitrate));           // 最低 150 kbps
}

/**
 * 懶加載 ffmpeg.wasm（第一次壓縮影片時才下載 ~30MB 引擎）
 * 使用「單執行緒版本」，不需要 SharedArrayBuffer，
 * 可在 GitHub Pages 等任何靜態主機上直接運作。
 *
 * @param {Function} onStatus - 狀態文字回呼
 */
async function ensureFFmpegLoaded(onStatus) {
    if (ffmpeg) return;  // 已載入，直接跳過

    onStatus('首次使用需下載 FFmpeg 引擎（約 30 MB），請稍候...');

    // 使用 index.html 已載入的全域 FFmpeg 物件（v0.11.x UMD 版本）
    // v0.11.x 不在建構子裡建立跨域 Worker，避免 CORS 問題
    const { createFFmpeg, fetchFile } = window.FFmpeg;
    fetchFileFn = fetchFile;

    ffmpeg = createFFmpeg({
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
        // 進度回呼：ratio 為 0~1，透過全域 progressCb 動態傳遞
        progress: ({ ratio }) => {
            if (progressCb) progressCb(Math.round(ratio * 100));
        },
    });

    await ffmpeg.load();
}

/**
 * 壓縮影片
 * 根據目標大小計算位元率，呼叫 ffmpeg.wasm 執行 H.264 編碼
 *
 * @param {File} file - 輸入影片
 * @param {number} targetMB - 目標大小（MB）
 * @param {Function} onProgress - 進度回呼（0~100）
 * @param {Function} onStatus - 狀態文字回呼
 * @returns {Blob} 壓縮後的 MP4 Blob
 */
async function compressVideo(file, targetMB, onProgress, onStatus) {
    progressCb = onProgress;  // 設定全域進度回呼

    await ensureFFmpegLoaded(onStatus);

    onStatus('分析影片時長...');
    const duration = await getVideoDuration(file);

    // 乘以 0.85 預留 15% 緩衝（ffmpeg 位元率目標有 ±10% 誤差，需足夠安全邊際）
    const safeMB = targetMB * 0.85;
    const videoBitrate = calcVideoBitrate(safeMB, duration);

    onStatus(`載入影片（時長 ${Math.round(duration)} 秒，目標視訊位元率 ${videoBitrate} kbps）...`);

    const ext = getExt(file.name);
    const inputName = `input.${ext}`;
    const outputName = 'output.mp4';

    // 將本機檔案寫入 ffmpeg 虛擬檔案系統（v0.11.x 用 FS API）
    ffmpeg.FS('writeFile', inputName, await fetchFileFn(file));

    onStatus('壓縮中...');

    // 執行 ffmpeg 壓縮（v0.11.x 用 run()，參數展開而非陣列）
    await ffmpeg.run(
        '-i', inputName,
        '-c:v', 'libx264',              // 視訊編碼：H.264
        '-b:v', `${videoBitrate}k`,     // 目標視訊位元率
        '-preset', 'fast',              // 編碼速度（fast 兼顧速度與壓縮率）
        '-c:a', 'aac',                  // 音訊編碼：AAC
        '-b:a', '128k',                 // 音訊位元率 128 kbps
        '-movflags', '+faststart',      // 讓影片支援邊下載邊播放
        outputName,
    );

    onStatus('讀取壓縮結果...');
    onProgress(98);

    // 從虛擬檔案系統讀出結果
    const data = ffmpeg.FS('readFile', outputName);

    // 清理虛擬檔案系統，釋放記憶體
    try {
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);
    } catch { /* 清理失敗不影響結果，忽略 */ }

    return new Blob([data.buffer], { type: 'video/mp4' });
}

// === PPTX 壓縮 ===

/**
 * 用 Canvas API 將單張圖片重新編碼為較低品質的 JPEG
 *
 * 原理：
 *   1. 建立 <img> 元素載入圖片
 *   2. 繪製到 <canvas>（先鋪白底，防止 PNG 透明區域轉 JPEG 後變黑）
 *   3. 用 canvas.toBlob() 輸出 JPEG，品質由 quality 參數控制
 *
 * @param {ArrayBuffer} buffer - 原始圖片的二進位資料
 * @param {number} quality - JPEG 品質 0.0~1.0
 * @returns {ArrayBuffer} 壓縮後的圖片資料
 */
function compressImageInCanvas(buffer, quality) {
    return new Promise((resolve) => {
        const blob = new Blob([buffer]);
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';                          // 白底
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(url);

            canvas.toBlob(async (result) => {
                if (result) {
                    resolve(await result.arrayBuffer());
                } else {
                    resolve(buffer);  // 轉換失敗則保留原始
                }
            }, 'image/jpeg', quality);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(buffer);  // 載入失敗則保留原始
        };

        img.src = url;
    });
}

/**
 * 壓縮 PPTX 內嵌的單支影片
 *
 * 從 ZIP 取出的影片 ArrayBuffer → ffmpeg.wasm 壓縮 → 回傳壓縮後的 ArrayBuffer
 * 目標位元率根據「此影片佔整個 PPTX 的比例」等比分配目標大小來計算
 *
 * @param {ArrayBuffer} arrayBuffer - 影片的原始二進位資料
 * @param {string} pathInZip - 在 ZIP 裡的路徑（用來取副檔名）
 * @param {number} targetMB - 這支影片的分配目標大小（MB）
 * @param {Function} onStatus - 狀態文字回呼
 * @returns {ArrayBuffer} 壓縮後的影片資料
 */
async function compressEmbeddedVideo(arrayBuffer, pathInZip, targetMB, onStatus) {
    // 確保 ffmpeg 已載入（PPTX 有影片時才觸發下載引擎）
    await ensureFFmpegLoaded(onStatus);

    const ext = pathInZip.split('.').pop().toLowerCase();
    const safeExt = ['mp4', 'mov', 'avi', 'wmv', 'mkv'].includes(ext) ? ext : 'mp4';

    // 建立臨時 Blob 取得影片時長
    const blob = new Blob([arrayBuffer], { type: `video/${safeExt}` });
    let duration;
    try {
        duration = await getVideoDuration(blob);
    } catch {
        duration = 60;  // 無法取得時長時預設 60 秒，確保不中斷流程
    }

    const videoBitrate = calcVideoBitrate(targetMB, duration);

    // 用時間戳避免多支影片同時寫入虛擬 FS 時碰撞
    const ts = Date.now();
    const inputName  = `emb_in_${ts}.${safeExt}`;
    const outputName = `emb_out_${ts}.mp4`;

    ffmpeg.FS('writeFile', inputName, new Uint8Array(arrayBuffer));

    await ffmpeg.run(
        '-i', inputName,
        '-c:v', 'libx264',
        '-b:v', `${videoBitrate}k`,
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '96k',         // 嵌入影片音訊通常不需要太高位元率
        outputName,
    );

    const data = ffmpeg.FS('readFile', outputName);

    try {
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);
    } catch { /* 清理失敗不影響結果 */ }

    return data.buffer;
}

/**
 * 壓縮 PPTX 簡報檔
 *
 * 原理：PPTX 本質上是一個 ZIP 壓縮包，裡面包含：
 *   - ppt/slides/slide*.xml  — 投影片的 XML 結構
 *   - ppt/media/image*.jpg   — 嵌入的圖片
 *   - ppt/media/media*.mp4   — 嵌入的影片（大小主因！）
 *   - [Content_Types].xml 等 — 結構描述檔案
 *
 * 作法：
 *   1. JSZip 解壓 PPTX
 *   2. 圖片 → Canvas API 重新壓縮為 JPEG（quality 0.75）
 *   3. 影片 → ffmpeg.wasm 依比例分配目標大小壓縮
 *   4. 重新打包為 ZIP，儲存為 .pptx
 *
 * @param {File} file - 輸入的 PPTX 檔案
 * @param {number} targetMB - 目標大小上限（MB）
 * @param {Function} onProgress - 進度回呼（0~100）
 * @param {Function} onStatus - 狀態文字回呼
 * @returns {Blob} 壓縮後的 PPTX Blob
 */
async function compressPptx(file, targetMB, onProgress, onStatus) {
    onStatus('解析 PPTX 結構...');
    onProgress(3);

    const zip = await JSZip.loadAsync(file);
    const newZip = new JSZip();

    const allPaths = Object.keys(zip.files);

    // 分類 ppt/media/ 裡的媒體檔案
    const imagePaths = allPaths.filter(p => {
        if (zip.files[p].dir) return false;
        const ext = p.split('.').pop().toLowerCase();
        return p.startsWith('ppt/media/') &&
               ['jpg', 'jpeg', 'png', 'bmp', 'tif', 'tiff'].includes(ext);
    });

    const videoPaths = allPaths.filter(p => {
        if (zip.files[p].dir) return false;
        const ext = p.split('.').pop().toLowerCase();
        return p.startsWith('ppt/media/') &&
               ['mp4', 'mov', 'avi', 'wmv', 'mkv'].includes(ext);
    });

    const totalMedia = imagePaths.length + videoPaths.length;
    onStatus(`找到 ${imagePaths.length} 張圖片、${videoPaths.length} 支影片，開始壓縮...`);

    let done = 0;
    const pptxOriginalSize = file.size;  // 用來等比分配影片目標大小

    for (const path of allPaths) {
        const entry = zip.files[path];
        if (entry.dir) continue;

        const content = await entry.async('arraybuffer');

        if (imagePaths.includes(path)) {
            // 圖片：Canvas 重新壓縮為 JPEG（quality 0.75）
            const compressed = await compressImageInCanvas(content, 0.75);
            newZip.file(path, compressed);
            done++;
            onProgress(5 + Math.round((done / Math.max(totalMedia, 1)) * 82));
            onStatus(`壓縮圖片 ${done}/${totalMedia}...`);

        } else if (videoPaths.includes(path)) {
            // 影片：依「此影片佔原始 PPTX 的比例」等比分配目標大小
            // 例如：70MB PPTX 目標 20MB，其中 50MB 是影片 → 該影片分配 20 × (50/70) ≈ 14.3MB
            const videoOrigMB = content.byteLength / (1024 * 1024);
            const videoTargetMB = targetMB * (content.byteLength / pptxOriginalSize) * 0.85;
            const safeTarget = Math.max(1, videoTargetMB);  // 至少給 1MB

            onStatus(`壓縮嵌入影片（${videoOrigMB.toFixed(1)} MB → 目標 ${safeTarget.toFixed(1)} MB）...`);
            progressCb = (p) => {
                // ffmpeg 進度不直接對應整體，顯示在狀態列就好
                onStatus(`壓縮嵌入影片中... ${p}%`);
            };

            const compressed = await compressEmbeddedVideo(content, path, safeTarget, onStatus);
            newZip.file(path, compressed);
            done++;
            onProgress(5 + Math.round((done / Math.max(totalMedia, 1)) * 82));

        } else {
            // XML、字型、關係描述等：直接複製，不修改
            newZip.file(path, content);
        }
    }

    onStatus('重新打包 PPTX...');
    onProgress(90);

    const result = await newZip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    onProgress(100);
    return result;
}

// === UI 控制 ===

/**
 * 更新進度條與狀態文字
 * percent 或 status 傳入 null 表示不更新該項目
 */
function updateProgress(percent = null, status = null) {
    if (percent !== null) {
        document.getElementById('progressBar').style.width = `${percent}%`;
        document.getElementById('progressPct').textContent = `${percent}%`;
    }
    if (status !== null) {
        document.getElementById('progressStatus').textContent = status;
    }
}

/** 顯示指定的卡片，隱藏其餘三張 */
function showCard(cardId) {
    for (const id of ['settingsCard', 'progressCard', 'resultCard']) {
        document.getElementById(id).hidden = (id !== cardId);
    }
}

/** 隱藏所有卡片（回到初始狀態） */
function hideAllCards() {
    for (const id of ['settingsCard', 'progressCard', 'resultCard']) {
        document.getElementById(id).hidden = true;
    }
}

/**
 * 重設 UI，讓使用者可以繼續壓下一個檔案
 * 同時釋放上一個下載連結佔用的記憶體
 */
function resetUI() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    updateProgress(0, '準備中...');
    hideAllCards();

    // 釋放 Object URL（避免記憶體洩漏）
    const dlBtn = document.getElementById('downloadBtn');
    if (dlBtn.href && dlBtn.href.startsWith('blob:')) {
        URL.revokeObjectURL(dlBtn.href);
        dlBtn.href = '';
    }
}

/**
 * 處理使用者選擇的檔案
 * 驗證格式 → 顯示檔案資訊 → 根據類型切換設定面板
 */
function handleFileSelect(file) {
    if (!file) return;

    const ext = getExt(file.name);

    if (!isVideoFile(file.name) && !isPptxFile(file.name)) {
        alert(`不支援 .${ext} 格式\n\n目前支援：MP4、MOV、AVI、PPTX`);
        return;
    }

    currentFile = file;

    // 顯示檔案資訊
    const warnHtml = file.size < 3 * 1024 * 1024
        ? '<div class="file-warning">⚠️ 檔案小於 3 MB，壓縮效果可能有限</div>'
        : '';

    document.getElementById('fileInfo').innerHTML = `
        <div class="file-name">📄 ${file.name}</div>
        <div class="file-size-text">${formatSize(file.size)}</div>
        ${warnHtml}
    `;

    // 根據檔案類型顯示對應設定（影片顯示目標大小，PPTX 顯示壓縮強度）
    const isVideo = isVideoFile(file.name);
    document.getElementById('videoSettings').hidden = !isVideo;
    document.getElementById('pptxSettings').hidden = isVideo;

    showCard('settingsCard');
}

/** 主壓縮流程（點擊「開始壓縮」時觸發） */
async function startCompress() {
    if (!currentFile) return;

    const originalSize = currentFile.size;

    // 壓縮前先檢查目標大小是否合理
    {
        const inputId = isVideoFile(currentFile.name) ? 'targetSize' : 'pptxTargetSize';
        const targetMB = parseFloat(document.getElementById(inputId).value);
        if (isNaN(targetMB) || targetMB <= 0) {
            alert('請輸入有效的目標大小');
            return;
        }
        if (originalSize <= targetMB * 1024 * 1024) {
            alert(`檔案已經小於 ${targetMB} MB，無需壓縮`);
            return;
        }
    }

    showCard('progressCard');
    updateProgress(0, '初始化...');

    try {
        let resultBlob;

        if (isVideoFile(currentFile.name)) {
            // 使用者設定 X MB → 實際壓縮目標 (X-1) MB，確保輸出不超標
            const targetMB = parseFloat(document.getElementById('targetSize').value) - 1;
            resultBlob = await compressVideo(
                currentFile, targetMB,
                (p) => updateProgress(p),           // 進度百分比
                (s) => updateProgress(null, s),     // 狀態文字
            );
        } else {
            // 使用者設定 X MB → 實際壓縮目標 (X-1) MB，確保輸出不超標
            const targetMB = parseFloat(document.getElementById('pptxTargetSize').value) - 1;
            if (isNaN(targetMB) || targetMB <= 0) {
                alert('請輸入有效的目標大小');
                showCard('settingsCard');
                return;
            }
            resultBlob = await compressPptx(
                currentFile, targetMB,
                (p) => updateProgress(p),
                (s) => updateProgress(null, s),
            );
        }

        updateProgress(100, '完成！');

        // 計算壓縮率並顯示結果
        const compressedSize = resultBlob.size;
        const savedPct = Math.round((1 - compressedSize / originalSize) * 100);

        document.getElementById('originalSize').textContent = formatSize(originalSize);

        const compressedEl = document.getElementById('compressedSize');
        compressedEl.textContent = formatSize(compressedSize);
        compressedEl.className = `size-value ${compressedSize < originalSize ? 'green' : ''}`;

        document.getElementById('savedPct').textContent =
            savedPct > 0 ? `-${savedPct}%` : '無明顯變化';

        // 設定下載連結
        const outName = currentFile.name.replace(/(\.[^.]+)$/, '_壓縮版$1');
        const blobURL = URL.createObjectURL(resultBlob);
        const dlBtn = document.getElementById('downloadBtn');
        dlBtn.href = blobURL;
        dlBtn.download = outName;

        showCard('resultCard');

    } catch (err) {
        console.error('壓縮失敗：', err);
        alert(`壓縮失敗\n\n${err.message || '未知錯誤，請開啟瀏覽器開發者工具查看詳情'}`);
        showCard('settingsCard');
    }
}

// === 初始化：綁定所有事件 ===
document.addEventListener('DOMContentLoaded', () => {
    const dropZone   = document.getElementById('dropZone');
    const fileInput  = document.getElementById('fileInput');
    const selectBtn  = document.getElementById('selectBtn');
    const compressBtn = document.getElementById('compressBtn');
    const resetBtn   = document.getElementById('resetBtn');

    // --- 拖曳上傳 ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });

    // --- 點擊整個上傳區選擇檔案（按鈕除外，避免觸發兩次） ---
    dropZone.addEventListener('click', (e) => {
        if (!e.target.closest('.btn')) fileInput.click();
    });

    // --- 選擇檔案按鈕（獨立綁定，阻止冒泡到 dropZone） ---
    selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // --- 檔案選擇變更 ---
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });

    // --- 開始壓縮 ---
    compressBtn.addEventListener('click', startCompress);

    // --- 重設按鈕（再壓一個） ---
    resetBtn.addEventListener('click', resetUI);
});
