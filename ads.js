// 讀取 ads-config.js 的設定，只有 CLIENT_ID 跟對應版位 slot ID 都有值時才插入
// <ins class="adsbygoogle">；沒有值的版位維持空白 <div>，不會佔版面也不會出現空框。
(function () {
  const clientId = window.ADSENSE_CLIENT_ID || "";
  const slots = window.AD_SLOTS || {};
  if (!clientId) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);

  document.querySelectorAll(".ad-slot").forEach((el) => {
    const slotName = el.dataset.adSlot;
    const slotId = slots[slotName];
    if (!slotId) return;

    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", clientId);
    ins.setAttribute("data-ad-slot", slotId);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    el.appendChild(ins);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense 腳本還沒載入完成時 push 可能失敗，靜默忽略。
    }
  });
})();
