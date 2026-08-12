const pptxgen = require("pptxgenjs");
const path = require("path");

// 圖片路徑
const IMG_DIR = "C:/Users/SF514/.claude/image-cache/c6b72b13-1a4d-4f49-aaf2-e54e83409d25";
const img1 = path.join(IMG_DIR, "12.png"); // 上傳畫面（乾淨版）
const img2 = path.join(IMG_DIR, "13.png"); // 上傳畫面（標註版）
const img3 = path.join(IMG_DIR, "14.png"); // 壓縮進度
const img4 = path.join(IMG_DIR, "15.png"); // 壓縮完成

// 色盤
const C = {
  navy:    "1A2E4A",   // 深海軍藍（主色／暗底）
  blue:    "2E86C1",   // 亮藍（強調色）
  lightBg: "EAF4FB",   // 淺藍底（內容頁）
  white:   "FFFFFF",
  dark:    "1A2E4A",
  mid:     "2C3E50",   // 副標題文字
  muted:   "6B8EAD",   // 淡色說明文字
  accent:  "F39C12",   // 金黃（重點強調）
};

const makeShadow = () => ({
  type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12
});

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title  = "SlimDrop 使用說明";
pres.author = "TengRip";

// ─────────────────────────────────────────────
// 第 1 頁：封面
// ─────────────────────────────────────────────
{
  let sl = pres.addSlide();
  sl.background = { color: C.navy };

  // 左側亮藍裝飾條
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.25, h: 5.625,
    fill: { color: C.blue }, line: { color: C.blue }
  });

  // 右下角裝飾三角形（用矩形+透明度模擬層次感）
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 7.5, y: 3.5, w: 2.5, h: 2.125,
    fill: { color: C.blue, transparency: 80 }, line: { color: C.blue, transparency: 80 }
  });

  // 告別附件超載！
  sl.addText("告別附件超載！", {
    x: 0.6, y: 0.7, w: 9, h: 0.85,
    fontSize: 14, color: C.accent, bold: true, fontFace: "Calibri",
    margin: 0
  });

  // 主標題
  sl.addText("SlimDrop 檔案\n一鍵瘦身工具", {
    x: 0.6, y: 1.35, w: 8.8, h: 2.1,
    fontSize: 42, color: C.white, bold: true, fontFace: "Calibri",
    margin: 0
  });

  // 副標題
  sl.addText("專為 OA 系統 20MB 限制打造，零安裝、絕對安全的極速解決方案", {
    x: 0.6, y: 3.5, w: 8.5, h: 0.55,
    fontSize: 15, color: C.muted, fontFace: "Calibri", margin: 0
  });

  // 分隔線
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 4.2, w: 3, h: 0.04,
    fill: { color: C.blue }, line: { color: C.blue }
  });

  // 提案人
  sl.addText("提案人：（填入您的單位與姓名）", {
    x: 0.6, y: 4.35, w: 6, h: 0.4,
    fontSize: 12, color: C.muted, fontFace: "Calibri", margin: 0
  });

  // 網址
  sl.addText("https://slim-drop.vercel.app", {
    x: 0.6, y: 4.9, w: 5, h: 0.35,
    fontSize: 11, color: C.blue, fontFace: "Calibri", margin: 0
  });
}

// ─────────────────────────────────────────────
// 第 2 頁：核心優勢
// ─────────────────────────────────────────────
{
  let sl = pres.addSlide();
  sl.background = { color: C.lightBg };

  // 頂部色帶
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.85,
    fill: { color: C.navy }, line: { color: C.navy }
  });
  sl.addText("打通提案最後一哩路，省下無效工時", {
    x: 0.4, y: 0.05, w: 9.2, h: 0.75,
    fontSize: 22, color: C.white, bold: true, fontFace: "Calibri",
    valign: "middle", margin: 0
  });

  // 副標
  sl.addText("為什麼要用 SlimDrop？", {
    x: 0.4, y: 0.95, w: 9, h: 0.4,
    fontSize: 13, color: C.muted, fontFace: "Calibri", margin: 0
  });

  // 三張卡片
  const cards = [
    {
      icon: "🚀",
      title: "純網頁免安裝",
      body: "開啟瀏覽器即用，不佔電腦空間，\n跨部門皆可無痛導入。"
    },
    {
      icon: "🛡️",
      title: "企業級資安防護",
      body: "獨家技術！所有運算皆於「本機瀏覽器」完成，\n機密公文、提案簡報絕不上傳雲端，\n100% 保障公司資訊安全。"
    },
    {
      icon: "🎯",
      title: "智慧一鍵壓縮",
      body: "完美支援 PPTX、MP4、MOV、AVI，\n徹底消滅手動拆解檔案的冗長作業。"
    }
  ];

  const cardW = 2.8, cardH = 3.3, cardY = 1.5, gap = 0.3;
  const startX = (10 - (cardW * 3 + gap * 2)) / 2;

  cards.forEach((card, i) => {
    const cx = startX + i * (cardW + gap);

    // 卡片底
    sl.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cardY, w: cardW, h: cardH,
      fill: { color: C.white }, line: { color: "D0E8F5", width: 1 },
      shadow: makeShadow()
    });

    // 頂色條
    sl.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cardY, w: cardW, h: 0.08,
      fill: { color: C.blue }, line: { color: C.blue }
    });

    // icon
    sl.addText(card.icon, {
      x: cx, y: cardY + 0.25, w: cardW, h: 0.65,
      fontSize: 32, align: "center", margin: 0
    });

    // 標題
    sl.addText(card.title, {
      x: cx + 0.15, y: cardY + 1.0, w: cardW - 0.3, h: 0.45,
      fontSize: 16, color: C.navy, bold: true, fontFace: "Calibri",
      align: "center", margin: 0
    });

    // 內文
    sl.addText(card.body, {
      x: cx + 0.15, y: cardY + 1.55, w: cardW - 0.3, h: 1.55,
      fontSize: 12, color: C.mid, fontFace: "Calibri",
      align: "center", valign: "top", margin: 0
    });
  });
}

// ─────────────────────────────────────────────
// 第 3 頁：步驟一
// ─────────────────────────────────────────────
{
  let sl = pres.addSlide();
  sl.background = { color: C.white };

  // 頂色帶
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.85,
    fill: { color: C.navy }, line: { color: C.navy }
  });
  sl.addText("第一步：拖曳上傳，無腦設定", {
    x: 0.4, y: 0.05, w: 9.2, h: 0.75,
    fontSize: 22, color: C.white, bold: true, fontFace: "Calibri",
    valign: "middle", margin: 0
  });

  // 步驟標籤
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 0.95, w: 1.5, h: 0.35,
    fill: { color: C.blue }, line: { color: C.blue }
  });
  sl.addText("操作步驟 1 / 3", {
    x: 0.35, y: 0.95, w: 1.5, h: 0.35,
    fontSize: 10, color: C.white, bold: true, fontFace: "Calibri",
    align: "center", valign: "middle", margin: 0
  });

  // 左側：兩張截圖（上下排列）
  sl.addImage({ path: img1, x: 0.3, y: 1.45, w: 4.7, h: 1.9 });
  sl.addImage({ path: img2, x: 0.3, y: 3.5,  w: 4.7, h: 1.9 });

  // 右側文字
  const items = [
    { num: "①", title: "拖曳即上傳", body: "將過大的簡報或影片檔直接拖曳或點選加入。" },
    { num: "②", title: "資訊全透明", body: "立即顯示原始檔案大小（如實測案例高達 69.7 MB，遠超系統限制）。" },
    { num: "③", title: "精準控管", body: "預設目標為符合 OA 規範的「20 MB」，亦可依需求自訂。確認後點擊「開始壓縮」即可啟動。" },
  ];

  items.forEach((item, i) => {
    const ty = 1.4 + i * 1.35;

    // 數字圓圈
    sl.addShape(pres.shapes.OVAL, {
      x: 5.35, y: ty + 0.03, w: 0.38, h: 0.38,
      fill: { color: C.blue }, line: { color: C.blue }
    });
    sl.addText(item.num, {
      x: 5.35, y: ty + 0.03, w: 0.38, h: 0.38,
      fontSize: 12, color: C.white, bold: true, align: "center", valign: "middle", margin: 0
    });

    // 標題
    sl.addText(item.title, {
      x: 5.85, y: ty, w: 3.8, h: 0.42,
      fontSize: 15, color: C.navy, bold: true, fontFace: "Calibri", margin: 0
    });

    // 內文
    sl.addText(item.body, {
      x: 5.85, y: ty + 0.42, w: 3.8, h: 0.8,
      fontSize: 12, color: C.mid, fontFace: "Calibri", margin: 0
    });
  });
}

// ─────────────────────────────────────────────
// 第 4 頁：步驟二
// ─────────────────────────────────────────────
{
  let sl = pres.addSlide();
  sl.background = { color: C.white };

  // 頂色帶
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.85,
    fill: { color: C.navy }, line: { color: C.navy }
  });
  sl.addText("第二步：進度透明，防呆機制", {
    x: 0.4, y: 0.05, w: 9.2, h: 0.75,
    fontSize: 22, color: C.white, bold: true, fontFace: "Calibri",
    valign: "middle", margin: 0
  });

  // 步驟標籤
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 0.95, w: 1.5, h: 0.35,
    fill: { color: C.blue }, line: { color: C.blue }
  });
  sl.addText("操作步驟 2 / 3", {
    x: 0.35, y: 0.95, w: 1.5, h: 0.35,
    fontSize: 10, color: C.white, bold: true, fontFace: "Calibri",
    align: "center", valign: "middle", margin: 0
  });

  // 左側截圖（置中垂直）
  sl.addImage({ path: img3, x: 0.3, y: 1.4, w: 5.0, h: 2.8 });

  // 右側文字
  const items2 = [
    { num: "④", title: "即時進度追蹤", body: "清楚顯示壓縮進度百分比，大檔案（如影音）處理狀態一目了然，只需耐心等候。" },
    { num: "⑤", title: "彈性取消防呆", body: "若發現誤傳檔案，或臨時需中止操作，隨時可點擊「放棄」按鈕取消，靈活不卡關。" },
  ];

  items2.forEach((item, i) => {
    const ty = 1.6 + i * 1.7;

    sl.addShape(pres.shapes.OVAL, {
      x: 5.7, y: ty + 0.03, w: 0.38, h: 0.38,
      fill: { color: C.blue }, line: { color: C.blue }
    });
    sl.addText(item.num, {
      x: 5.7, y: ty + 0.03, w: 0.38, h: 0.38,
      fontSize: 12, color: C.white, bold: true, align: "center", valign: "middle", margin: 0
    });

    sl.addText(item.title, {
      x: 6.2, y: ty, w: 3.5, h: 0.42,
      fontSize: 15, color: C.navy, bold: true, fontFace: "Calibri", margin: 0
    });

    sl.addText(item.body, {
      x: 6.2, y: ty + 0.42, w: 3.5, h: 1.1,
      fontSize: 12, color: C.mid, fontFace: "Calibri", margin: 0
    });
  });
}

// ─────────────────────────────────────────────
// 第 5 頁：步驟三
// ─────────────────────────────────────────────
{
  let sl = pres.addSlide();
  sl.background = { color: C.white };

  // 頂色帶
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.85,
    fill: { color: C.navy }, line: { color: C.navy }
  });
  sl.addText("第三步：驚人壓縮率，無縫下載", {
    x: 0.4, y: 0.05, w: 9.2, h: 0.75,
    fontSize: 22, color: C.white, bold: true, fontFace: "Calibri",
    valign: "middle", margin: 0
  });

  // 步驟標籤
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.35, y: 0.95, w: 1.5, h: 0.35,
    fill: { color: C.blue }, line: { color: C.blue }
  });
  sl.addText("操作步驟 3 / 3", {
    x: 0.35, y: 0.95, w: 1.5, h: 0.35,
    fontSize: 10, color: C.white, bold: true, fontFace: "Calibri",
    align: "center", valign: "middle", margin: 0
  });

  // 左側截圖
  sl.addImage({ path: img4, x: 0.3, y: 1.4, w: 5.0, h: 2.8 });

  // 實測成果大字
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 5.6, y: 1.4, w: 4.1, h: 1.1,
    fill: { color: C.lightBg }, line: { color: "D0E8F5", width: 1 },
    shadow: makeShadow()
  });
  sl.addText([
    { text: "69.7 MB", options: { color: C.muted, fontSize: 16, bold: false } },
    { text: "  →  ", options: { color: C.navy, fontSize: 18 } },
    { text: "19.7 MB", options: { color: "27AE60", fontSize: 20, bold: true } },
    { text: "  ( -72%！)", options: { color: C.accent, fontSize: 16, bold: true } },
  ], {
    x: 5.6, y: 1.4, w: 4.1, h: 1.1,
    align: "center", valign: "middle", margin: 0
  });

  const items3 = [
    { num: "⑥", title: "有感瘦身成效", body: "實測從 69.7 MB 縮減至 19.7 MB，容量大減 72%！完美跨越 20MB 系統門檻。" },
    { num: "⑦", title: "防混淆自動命名", body: "點擊「下載壓縮版」，系統自動於原檔名加上備註，絕不覆蓋您的原始心血檔案。" },
    { num: "⑧", title: "極速連發", body: "點擊「再壓一個」即可無縫處理下一份文件，效率極大化。" },
  ];

  items3.forEach((item, i) => {
    const ty = 2.65 + i * 1.0;

    sl.addShape(pres.shapes.OVAL, {
      x: 5.7, y: ty + 0.03, w: 0.35, h: 0.35,
      fill: { color: C.blue }, line: { color: C.blue }
    });
    sl.addText(item.num, {
      x: 5.7, y: ty + 0.03, w: 0.35, h: 0.35,
      fontSize: 11, color: C.white, bold: true, align: "center", valign: "middle", margin: 0
    });

    sl.addText(item.title, {
      x: 6.15, y: ty, w: 3.6, h: 0.38,
      fontSize: 14, color: C.navy, bold: true, fontFace: "Calibri", margin: 0
    });

    sl.addText(item.body, {
      x: 6.15, y: ty + 0.38, w: 3.6, h: 0.55,
      fontSize: 11, color: C.mid, fontFace: "Calibri", margin: 0
    });
  });
}

// ─────────────────────────────────────────────
// 第 6 頁：封底
// ─────────────────────────────────────────────
{
  let sl = pres.addSlide();
  sl.background = { color: C.navy };

  // 左側裝飾條
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.25, h: 5.625,
    fill: { color: C.blue }, line: { color: C.blue }
  });

  // 右下裝飾
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 7.5, y: 3.5, w: 2.5, h: 2.125,
    fill: { color: C.blue, transparency: 80 }, line: { color: C.blue, transparency: 80 }
  });

  // 主標題
  sl.addText("把寶貴的時間，\n留給更有價值的核心業務！", {
    x: 0.6, y: 0.8, w: 8.8, h: 2.2,
    fontSize: 36, color: C.white, bold: true, fontFace: "Calibri", margin: 0
  });

  // 分隔線
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 3.15, w: 4, h: 0.04,
    fill: { color: C.blue }, line: { color: C.blue }
  });

  // 副標題
  sl.addText("拒絕再為「縮減檔案」耗費心神。\nSlimDrop 讓每一份精心製作的提案，都能輕鬆、安全、快速地送達。", {
    x: 0.6, y: 3.3, w: 8.5, h: 1.0,
    fontSize: 13, color: C.muted, fontFace: "Calibri", margin: 0
  });

  // 網址 callout
  sl.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 4.45, w: 3.8, h: 0.5,
    fill: { color: C.blue }, line: { color: C.blue }
  });
  sl.addText("立即使用 → https://slim-drop.vercel.app", {
    x: 0.6, y: 4.45, w: 3.8, h: 0.5,
    fontSize: 12, color: C.white, bold: true, fontFace: "Calibri",
    align: "center", valign: "middle", margin: 0
  });
}

// 輸出
pres.writeFile({ fileName: "D:/Claude Code Project/SlimDrop/SlimDrop使用說明.pptx" })
  .then(() => console.log("✅ 完成：SlimDrop使用說明.pptx"))
  .catch(e => console.error("❌ 失敗：", e));
