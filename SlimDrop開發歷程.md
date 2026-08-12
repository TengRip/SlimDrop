# SlimDrop 開發歷程

**最後更新：2026-04-23**

---

## 專案背景

公司提案系統上傳限制 20 MB，影片和簡報常常超過。
目標：做一個**免安裝、不上傳、任何電腦都能用**的瀏覽器壓縮工具。

---

## 方案選擇過程

| 方案 | 說明 | 決定 |
|------|------|------|
| 方案 A：雲端 Web App | Flask + ffmpeg，部署雲端 | 有隱私疑慮、有流量成本 |
| 方案 B：純瀏覽器 | ffmpeg.wasm + JSZip，完全本機處理 | ✅ **採用** |
| 方案 C：LINE Bot | Python Bot，有 50 MB 上限 + 費用風險 | 備選 |
| 方案 D：公司內網 | 需要長期開機的伺服器 | 暫不考慮 |

**選擇方案 B 的理由**：永久免費、無大小限制、檔案不離開裝置、只需分享網址。

---

## 專案結構

```
SlimDrop/
├── index.html              — 頁面結構
├── style.css               — 介面樣式
├── app.js                  — 壓縮邏輯（ffmpeg.wasm + JSZip）
├── vercel.json             — Vercel 部署設定（COOP/COEP 標頭）
├── coi-serviceworker.js    — 補上 COOP/COEP 標頭（GitHub Pages 備用）
├── server.js               — 本地開發伺服器（設定 COOP/COEP 標頭）
└── 歷程.md                 — 本文件
```

---

## 技術架構

### 影片壓縮（MP4 / MOV / AVI）
- 引擎：`@ffmpeg/ffmpeg@0.11.6` + `@ffmpeg/core@0.11.0`（由 CDN 載入）
- 流程：計算目標位元率 → ffmpeg H.264 編碼 → 輸出 MP4
- 緩衝：目標大小 × 0.85（預留 15% 緩衝，補償 ffmpeg 位元率誤差）

### PPTX 壓縮
- 引擎：`JSZip`（解/打包）+ Canvas API（圖片壓縮）+ ffmpeg.wasm（嵌入影片）
- 流程：解壓 PPTX → 圖片重新編碼為 JPEG（quality 0.75）→ 嵌入影片依比例壓縮 → 重新打包

### PPTX 嵌入影片的預算計算
```
此影片目標大小 = 目標大小 × (此影片原始大小 / PPTX 原始大小) × 0.85
```

---

## 開發過程遇到的問題與解法

### 問題 1：PPTX 只壓縮圖片，嵌入影片未處理
- **現象**：69.7 MB → 64.9 MB，只減少 7%
- **原因**：初版只壓縮 `ppt/media/` 內的圖片，影片完全略過
- **解法**：新增 `compressEmbeddedVideo()`，偵測 PPTX 內的 mp4/mov 並用 ffmpeg 壓縮

### 問題 2：`Failed to construct 'Worker'` — CORS 錯誤
- **原因**：`@ffmpeg/ffmpeg@0.12.x` 在建構子就用跨域 CDN URL 建立 Worker，瀏覽器擋住
- **解法**：降版至 `@ffmpeg/ffmpeg@0.11.x`，此版本無此問題

### 問題 3：`SharedArrayBuffer is not defined`
- **原因**：ffmpeg.wasm 需要 `SharedArrayBuffer`，瀏覽器只在有 COOP + COEP 標頭時才開放
- **嘗試**：加 `coi-serviceworker` → 因 Ctrl+Shift+R 硬重整繞過 Service Worker 而失效
- **解法**：建立 `server.js`，設定 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: credentialless`

### 問題 4：設定 20 MB 但輸出 20.6 MB
- **原因**：ffmpeg 位元率目標有 ±10% 誤差，舊緩衝 7~10% 不夠
- **解法**：緩衝調整為 15%（`targetMB * 0.85`）

### 問題 5：設定 20 MB 仍輸出 20.1 MB
- **解法**：使用者輸入 X MB，程式碼自動改用 (X-1) MB 作為壓縮目標

---

## 部署到 GitHub Pages

### 部署流程

```bash
# 1. 初始化 Git
cd "D:/Claude Code Project/SlimDrop"
git init
git add .
git commit -m "init: SlimDrop 初版"

# 2. 建立 GitHub Repo 並推上去（需先執行 gh auth login）
gh repo create SlimDrop --public --source=. --remote=origin --push

# 3. 啟用 GitHub Pages（注意 branch 名稱是 master）
gh api repos/TengRip/SlimDrop/pages --method POST --field source[branch]=master --field "source[path]=/"
```

### GitHub Pages 的 COOP/COEP 標頭問題

GitHub Pages 是靜態托管，**無法自訂 HTTP 標頭**，但 ffmpeg.wasm 需要 `SharedArrayBuffer`，而瀏覽器只在頁面帶有 COOP + COEP 標頭時才開放此 API。

**解法：加入 `coi-serviceworker.js`**

Service Worker 在瀏覽器背景攔截所有請求，在回應上動態注入 COOP/COEP 標頭，讓 GitHub Pages 也能使用 `SharedArrayBuffer`。

### 問題 6：CDN script 載入失敗（`window.FFmpeg is undefined` / `JSZip is not defined`）
- **原因**：`<script src="...">` 預設用 no-cors 模式載入，Service Worker 拿到的是不透明（opaque）回應，無法讀取 body 並注入標頭，腳本因此載入失敗
- **解法**：CDN script 標籤加上 `crossorigin="anonymous"`，改為 CORS 模式載入，SW 才能正常處理

---

## 改用 Vercel 部署（公司擋 github.io）

公司網路封鎖 `github.io`，同仁無法開啟 GitHub Pages 網址。
測試後確認 `vercel.app` 可正常存取，改用 Vercel 部署。

### Vercel 的優點
- 支援在 `vercel.json` 直接設定 HTTP 標頭，不需要 `coi-serviceworker` 繞道
- `crossorigin="anonymous"` 也不再需要，程式碼更乾淨

### vercel.json 設定

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```

### 部署指令

```bash
npm i -g vercel   # 第一次需安裝
vercel            # 首次部署（互動式設定）
vercel --prod     # 後續更新
```

---

## 新增功能：壓縮中途放棄按鈕

### 問題 7：壓縮影片需時數分鐘，無法中途取消
- **解法**：在進度卡片加入「放棄」按鈕
  - 影片：呼叫 `ffmpeg.exit()` 強制終止 wasm，並重置實例讓下次重新載入
  - PPTX：在每個媒體檔處理前檢查取消旗標，有旗標就拋出錯誤中斷循環

### 問題 8：按放棄後跳出「壓縮失敗，未知錯誤」
- **原因**：放棄後拋出的錯誤被 `catch` 區塊攔截，顯示成一般錯誤訊息
- **解法**：`catch` 區塊先判斷 `cancelled` 旗標，若為放棄則靜默回到設定畫面，不跳錯誤視窗

### 問題 9：手機瀏覽器（尤其 App 內建瀏覽器）出現 `SharedArrayBuffer is not defined`
- **原因**：App 內建瀏覽器（LINE、微信等）即使有 COOP/COEP 標頭也不支援 `SharedArrayBuffer`，無法使用多執行緒版 ffmpeg core
- **解法**：自動偵測環境，有 `SharedArrayBuffer` 就用多執行緒版（快），沒有就改載單執行緒版 `@ffmpeg/core-st@0.11.0`（慢一點但相容所有瀏覽器）

```javascript
corePath: typeof SharedArrayBuffer !== 'undefined'
    ? 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
    : 'https://unpkg.com/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js',
```

---

## 最終狀態

- ✅ 影片壓縮：可用，測試 38 MB → 17 MB
- ✅ PPTX 含嵌入影片：可用，測試 69.7 MB → 19.x MB（-71%）
- ✅ 目標大小保證不超標：輸入 X MB → 實際壓到 (X-1) MB
- ✅ 壓縮中可按「放棄」回到設定畫面
- ✅ 部署到 Vercel，公開網址：`https://slim-drop.vercel.app`
- ✅ 免安裝、不上傳、任何電腦的瀏覽器都能直接使用

---

## 本地開發啟動方式

```bash
cd "D:/Claude Code Project/SlimDrop"
node server.js
# 瀏覽器開啟 http://localhost:8080
```

---

## 技術備注

| 項目 | 說明 |
|------|------|
| GitHub 帳號 | TengRip |
| GitHub Repo | https://github.com/TengRip/SlimDrop（備份用） |
| 正式網址（Vercel） | https://slim-drop.vercel.app |
| ffmpeg.wasm 版本 | @ffmpeg/ffmpeg@0.11.6 + @ffmpeg/core@0.11.0 |
| JSZip 版本 | 3.10.1 |
| COOP/COEP 解法 | vercel.json 直接設定標頭 |
