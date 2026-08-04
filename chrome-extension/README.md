# ArkRecode 角色列表擷取（Chrome 外掛）

在網頁版遊戲（`game-arkre-labs.ecchi.xxx`）登入時，攔登入回應裡的 `RoleDataContainer.Roles`，
擷取你擁有的角色，一鍵在角色列表檢視器開啟。純前端、不碰帳密/token、零特殊權限。

- `manifest.json` — MV3；content script `world: MAIN`、`run_at: document_start`、只匹配遊戲網域
- `capture.js` — 攔截 + 面板邏輯（與 `../arkrecode-roster-capture.user.js` 同一套，改動兩邊同步）
- `icon16/48/128.png` — 圖示

## 本機測試（Load unpacked，免上架）

1. Chrome 開 `chrome://extensions`
2. 右上角開「開發人員模式 / Developer mode」
3. 點「載入未封裝項目 / Load unpacked」→ 選這個 `chrome-extension` 資料夾
4. 用瀏覽器開遊戲登入 → 右上角應跳出擷取面板

## 上架 Chrome Web Store（給一般人裝）

1. **一次性**：到 https://chrome.google.com/webstore/devconsole 用 Google 帳號註冊開發者，
   付一次性 **US$5** 註冊費。
2. **打包**：把「資料夾內容」壓成 zip（`manifest.json` 要在 zip 根目錄，不是包一層資料夾）。
3. Dashboard →「New item」→ 上傳 zip。
4. 填 Store listing：說明、分類、語言、**至少 1 張截圖**（1280×800 或 640×400）、
   隱私（single purpose、host 權限說明、資料用途宣告：不收集/不販售資料）。
5. 送審。單一網域匹配、無遠端程式碼，通常審得快。
6. 發布可選 **Public / Unlisted / Private**。小眾工具建議 **Unlisted**（只有拿到連結的人裝得到，
   不進商店搜尋、審查通常較單純）。

> 注意：因為只注入成人遊戲網域（`ecchi.xxx`），Public 上架可能觸發成熟內容審查；
> Unlisted 分發較單純。Chrome 不允許自架安裝（企業版除外），所以要給一般人裝就得走商店。
