// ==UserScript==
// @name         ArkRecode 裝備自動擷取
// @namespace    https://github.com/zzasqas/ArkRecodetools
// @version      1.1.0
// @description  攔截遊戲登入 API，捕獲裝備資料後提供下載 JSON 與一鍵複製功能
// @author       zzasqas
// @match        https://game-arkre-labs.ecchi.xxx/*
// @grant        GM_setClipboard
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // 只攔截登入這支 API
  const TARGET_ROUTE = 'AccountHandler.Login';

  // ─── 通知 UI ────────────────────────────────────────────────
  function showToast(msg, ok = true, duration = 4000) {
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: 99999,
      padding: '10px 16px', borderRadius: '8px', fontSize: '14px',
      color: '#fff', background: ok ? '#16a34a' : '#dc2626',
      boxShadow: '0 4px 12px rgba(0,0,0,.4)', transition: 'opacity .4s',
      maxWidth: '340px', wordBreak: 'break-all',
    });
    document.body?.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, duration);
    return el;
  }

  // ─── 主處理邏輯 ─────────────────────────────────────────────
  function handleLoginResponse(data) {
    try {
      const datas = data?.EquipmentContainer?.Datas;
      if (!Array.isArray(datas)) {
        console.warn('[ArkRecode Capture] 找不到 EquipmentContainer.Datas，實際資料：', data);
        return;
      }

      const count   = datas.length;
      const jsonStr = JSON.stringify(datas);
      console.log('[ArkRecode Capture] 裝備已擷取', count, '件，資料預覽：', datas.slice(0, 2));

      // ── 顯示操作按鈕面板 ──────────────────────────────────────
      const panel = document.createElement('div');
      Object.assign(panel.style, {
        position: 'fixed', top: '12px', right: '12px', zIndex: 99999,
        padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
        color: '#fff', background: '#1e3a5f',
        boxShadow: '0 4px 16px rgba(0,0,0,.6)',
        display: 'flex', flexDirection: 'column', gap: '8px',
        minWidth: '220px',
      });

      const title = document.createElement('div');
      title.textContent = `✅ 裝備擷取成功：${count} 件`;
      title.style.fontWeight = 'bold';

      const btnStyle = {
        padding: '6px 12px', borderRadius: '6px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
      };

      // 下載 JSON 按鈕
      const btnDl = document.createElement('button');
      btnDl.textContent = '⬇️ 下載裝備 JSON';
      Object.assign(btnDl.style, { ...btnStyle, background: '#2563eb', color: '#fff' });
      btnDl.onclick = () => {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `arkrecode_equips_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('已下載，請至配裝計算器匯入');
      };

      // 複製到剪貼簿按鈕
      const btnCopy = document.createElement('button');
      btnCopy.textContent = '📋 複製 JSON 到剪貼簿';
      Object.assign(btnCopy.style, { ...btnStyle, background: '#7c3aed', color: '#fff' });
      btnCopy.onclick = () => {
        if (typeof GM_setClipboard !== 'undefined') {
          GM_setClipboard(jsonStr);
        } else {
          navigator.clipboard.writeText(jsonStr).catch(() => {});
        }
        showToast('已複製！可直接貼入配裝計算器');
      };

      // 關閉按鈕
      const btnClose = document.createElement('button');
      btnClose.textContent = '✕ 關閉';
      Object.assign(btnClose.style, { ...btnStyle, background: '#4b5563', color: '#ccc' });
      btnClose.onclick = () => panel.remove();

      panel.append(title, btnDl, btnCopy, btnClose);
      document.body?.appendChild(panel);

    } catch (e) {
      console.error('[ArkRecode Capture] 處理失敗', e);
      showToast('❌ 裝備擷取失敗：' + e.message, false);
    }
  }

  // ─── 解析回應文字，找出目標 route 的資料 ────────────────────
  // 遊戲可能一次回傳多個 route 的結果（陣列格式），也可能是單一物件
  function extractLoginData(text) {
    try {
      const json = JSON.parse(text);
      // 情況一：陣列，每個元素有 route 欄位
      if (Array.isArray(json)) {
        const entry = json.find(r => r?.route === TARGET_ROUTE || r?.Route === TARGET_ROUTE);
        return entry?.data ?? entry?.Data ?? null;
      }
      // 情況二：單一物件，直接含帳號資料
      if (json?.EquipmentContainer) return json;
      // 情況三：物件包了一層 data/Data
      if (json?.data?.EquipmentContainer) return json.data;
      if (json?.Data?.EquipmentContainer) return json.Data;
    } catch (_) { /* 非 JSON，略過 */ }
    return null;
  }

  // ─── 攔截 XMLHttpRequest ─────────────────────────────────────
  const XHR = XMLHttpRequest.prototype;
  const origOpen = XHR.open;
  const origSend = XHR.send;

  XHR.open = function (method, url, ...rest) {
    this._arkUrl = url || '';
    return origOpen.call(this, method, url, ...rest);
  };

  XHR.send = function (body) {
    // 只監聽指向 RouterHandler 的請求
    if (this._arkUrl?.includes('RouterHandler')) {
      this.addEventListener('load', function () {
        try {
          // 確認送出的 body 包含目標 route（快速過濾，避免解析無關請求）
          const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
          if (!bodyStr?.includes(TARGET_ROUTE)) return;

          const loginData = extractLoginData(this.responseText);
          if (loginData) handleLoginResponse(loginData);
        } catch (_) {}
      });
    }
    return origSend.call(this, body);
  };

  // ─── 攔截 fetch（部分環境用 fetch 而非 XHR）──────────────────
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url     = typeof input === 'string' ? input : input?.url ?? '';
    const bodyStr = init?.body ?? '';

    const res = await origFetch.call(this, input, init);

    if (url.includes('RouterHandler') && String(bodyStr).includes(TARGET_ROUTE)) {
      const clone = res.clone();
      clone.text().then(text => {
        const loginData = extractLoginData(text);
        if (loginData) handleLoginResponse(loginData);
      }).catch(() => {});
    }

    return res;
  };

  console.log('[ArkRecode Capture] v1.0.0 已載入，等待登入...');
})();
