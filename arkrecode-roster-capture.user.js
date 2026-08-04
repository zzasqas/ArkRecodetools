// ==UserScript==
// @name         ArkRecode 角色列表擷取
// @namespace    https://github.com/zzasqas/ArkRecodetools
// @version      1.0.3
// @description  攔截遊戲登入 API，擷取你擁有的角色清單，下載 JSON 給角色列表檢視器用
// @author       zzasqas
// @match        https://game-arkre-labs.ecchi.xxx/*
// @match        https://www.ero-labs.com/*
// @grant        GM_setClipboard
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const TARGET_ROUTE = 'AccountHandler.Login';
  // 檢視器網址（線上版）：擷取後可一鍵把資料帶過去，免下載免選檔
  const VIEWER_URL = 'https://zzasqas.github.io/ArkRecodetools/roster-viewer.html';
  let captured = false; // 只處理一次（登入回應）

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

  // ─── 主處理邏輯：從登入回應取出擁有的角色 ─────────────────────
  function handleLoginResponse(data) {
    try {
      // 這款遊戲擁有角色在 RoleDataContainer.Roles，每筆有 StaticID(H###)/LV/Star/AwakenLV
      const roles = data?.RoleDataContainer?.Roles;
      if (!Array.isArray(roles) || !roles.length) return; // 掃所有回應，非登入的靜默略過
      if (captured) return;                                // 只處理一次
      captured = true;

      const owned = roles.map(r => ({
        id: r.StaticID, lv: r.LV, star: r.Star, awaken: r.AwakenLV,
      })).filter(x => x.id);

      const account = data?.Info?.Name || data?.PlayerInfo?.Name || null;
      const payload = {
        exportedAt: new Date().toISOString(),
        source: 'userscript',
        account,
        ownedCount: owned.length,
        owned,
      };
      const jsonStr = JSON.stringify(payload);
      console.log('[ArkRecode Roster] 已擷取', owned.length, '隻角色', account ? `（${account}）` : '');

      const panel = document.createElement('div');
      Object.assign(panel.style, {
        position: 'fixed', top: '12px', right: '12px', zIndex: 99999,
        padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
        color: '#fff', background: '#3b0764',
        boxShadow: '0 4px 16px rgba(0,0,0,.6)',
        display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px',
      });
      const title = document.createElement('div');
      title.textContent = `✅ 角色擷取成功：${owned.length} 隻` + (account ? `（${account}）` : '');
      title.style.fontWeight = 'bold';

      const btnStyle = {
        padding: '6px 12px', borderRadius: '6px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
      };

      // 最簡：一鍵把資料帶進檢視器（免下載、免選檔）
      const btnOpen = document.createElement('button');
      btnOpen.textContent = '🔗 直接在檢視器開啟';
      Object.assign(btnOpen.style, { ...btnStyle, background: '#7c3aed', color: '#fff' });
      btnOpen.onclick = () => {
        window.open(VIEWER_URL + '#data=' + encodeURIComponent(jsonStr), '_blank');
      };

      // 備用：下載 JSON（想存檔／離線／本地版時用）
      const btnDl = document.createElement('button');
      btnDl.textContent = '⬇️ 下載 JSON（備用）';
      Object.assign(btnDl.style, { ...btnStyle, background: '#3730a3', color: '#fff' });
      btnDl.onclick = () => {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const tag = account ? '_' + account : '';
        a.download = `arkrecode_roster${tag}_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('已存到瀏覽器「下載」資料夾');
      };

      const btnCopy = document.createElement('button');
      btnCopy.textContent = '📋 複製 JSON';
      Object.assign(btnCopy.style, { ...btnStyle, background: '#2563eb', color: '#fff' });
      btnCopy.onclick = () => {
        if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(jsonStr);
        else navigator.clipboard.writeText(jsonStr).catch(() => {});
        showToast('已複製 JSON');
      };

      const btnClose = document.createElement('button');
      btnClose.textContent = '✕ 關閉';
      Object.assign(btnClose.style, { ...btnStyle, background: '#4b5563', color: '#ccc' });
      btnClose.onclick = () => panel.remove();

      panel.append(title, btnOpen, btnDl, btnCopy, btnClose);
      document.body?.appendChild(panel);
    } catch (e) {
      console.error('[ArkRecode Roster] 處理失敗', e);
      showToast('❌ 角色擷取失敗：' + e.message, false);
    }
  }

  // ─── 解析回應文字，找出登入 route 的資料 ──────────────────────
  function extractLoginData(text) {
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        const entry = json.find(r => r?.route === TARGET_ROUTE || r?.Route === TARGET_ROUTE);
        return entry?.data ?? entry?.Data ?? null;
      }
      if (json?.RoleDataContainer) return json;
      if (json?.data?.RoleDataContainer) return json.data;
      if (json?.Data?.RoleDataContainer) return json.Data;
    } catch (_) { /* 非 JSON */ }
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
    if (this._arkUrl?.includes('RouterHandler')) {
      this.addEventListener('load', function () {
        try {
          const loginData = extractLoginData(this.responseText);
          if (loginData) handleLoginResponse(loginData);
        } catch (_) {}
      });
    }
    return origSend.call(this, body);
  };

  // ─── 攔截 fetch ──────────────────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url     = typeof input === 'string' ? input : input?.url ?? '';
    const res = await origFetch.call(this, input, init);
    if (url.includes('RouterHandler')) {
      res.clone().text().then(text => {
        const loginData = extractLoginData(text);
        if (loginData) handleLoginResponse(loginData);
      }).catch(() => {});
    }
    return res;
  };

  console.log('[ArkRecode Roster] v1.0.3 已載入（frame:', location.href, '），掃描 RouterHandler 中...');
})();
