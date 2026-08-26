// AdSense 設定集中管理，比照 maozhidao/roadguard-web 的做法：
// CLIENT_ID 沒填時，ads.js 完全不會插入任何廣告相關標籤（安全預設，不會出現空白廣告框）。
// AdSense 審核通過、建好廣告單元後，只要把這兩個值填進來即可上線，不用改其他檔案。
window.ADSENSE_CLIENT_ID = "";
window.AD_SLOTS = {
  top: "",
  bottom: "",
};
