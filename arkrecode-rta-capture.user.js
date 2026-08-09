// ==UserScript==
// @name         ArkRecode RTA 紀錄擷取
// @namespace    https://github.com/zzasqas/ArkRecodetools
// @version      1.0.3
// @description  登入後自動擷取 RTA 對戰紀錄，下載 JSON 供分析用。不碰帳號密碼，只讀遊戲已回傳的資料。
// @author       zzasqas
// @match        https://game-arkre-labs.ecchi.xxx/*
// @match        https://www.ero-labs.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // @grant none → 直接跑在頁面 context，window 就是真實 window，不需要 unsafeWindow
  const _w = window;

  const ROUTER_URL = 'https://game-arkre-labs.ecchi.xxx/Router/RouterHandler.ashx';
  const LOGIN_ROUTE = 'AccountHandler.Login';
  let captured = false;

  // ── UI 工具 ────────────────────────────────────────────────────
  function toast(msg, ok = true) {
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: 99999,
      padding: '10px 16px', borderRadius: '8px', fontSize: '14px',
      color: '#fff', background: ok ? '#16a34a' : '#dc2626',
      boxShadow: '0 4px 12px rgba(0,0,0,.4)', maxWidth: '340px',
    });
    document.body?.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function showPanel(playerName, myCuid, logs) {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: 'userscript',
      account: playerName,
      cuid: myCuid,
      matchCount: logs.length,
      logs,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    console.log(`[RTA Capture] 擷取成功：${logs.length} 場，玩家 ${playerName}（${myCuid}）`);

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: 99999,
      padding: '12px 16px', borderRadius: '10px', fontSize: '14px',
      color: '#fff', background: '#1e1b4b',
      boxShadow: '0 4px 16px rgba(0,0,0,.6)',
      display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '230px',
    });

    const title = document.createElement('div');
    title.textContent = `✅ RTA 擷取成功：${logs.length} 場`;
    title.style.fontWeight = 'bold';

    const sub = document.createElement('div');
    sub.textContent = `玩家：${playerName}（#${myCuid}）`;
    sub.style.fontSize = '12px';
    sub.style.color = '#a5b4fc';

    const btn = (text, bg, fn) => {
      const b = document.createElement('button');
      b.textContent = text;
      Object.assign(b.style, {
        padding: '6px 12px', borderRadius: '6px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
        background: bg, color: '#fff',
      });
      b.onclick = fn;
      return b;
    };

    const btnDl = btn('⬇️ 下載 JSON', '#3730a3', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([jsonStr], { type: 'application/json' }));
      a.download = `rta_${playerName}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      toast('已下載');
    });

    const btnCopy = btn('📋 複製 JSON', '#2563eb', () => {
      if (typeof GM_setClipboard !== 'undefined') GM_setClipboard(jsonStr);
      else navigator.clipboard.writeText(jsonStr).catch(() => {});
      toast('已複製');
    });

    const btnClose = btn('✕ 關閉', '#374151', () => panel.remove());

    panel.append(title, sub, btnDl, btnCopy, btnClose);
    document.body?.appendChild(panel);
  }

  // ── 登入後呼叫 QueryRTALog ──────────────────────────────────────
  function fetchRtaLog(aid, sessionId, playerName, myCuid) {
    const payload = JSON.stringify({
      route: 'RTARankBattleHandler.QueryRTALog',
      data: { AID: aid, SessionID: sessionId },
    });

    // 用頁面自己的 fetch（腳本跑在 game-arkre-labs.ecchi.xxx iframe 裡，同源，不需要 CORS）
    fetch(ROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: payload,
    })
    .then(r => r.text())
    .then(text => {
      try {
        const json = JSON.parse(text);
        const logs = json?.Logs ?? [];
        if (!logs.length) { toast('RTA 紀錄為空', false); return; }
        showPanel(playerName, myCuid, logs);
      } catch (e) {
        toast('QueryRTALog 解析失敗：' + e.message, false);
        console.log('[RTA Capture] 原始回應：', text?.slice(0, 200));
      }
    })
    .catch(e => {
      toast('QueryRTALog 請求失敗', false);
      console.log('[RTA Capture] 請求錯誤：', e);
    });
  }

  // ── 從登入回應取出需要的欄位 ────────────────────────────────────
  function handleLoginResponse(data) {
    if (captured) return;
    captured = true;

    const aid        = data?.Info?._id?.$oid;
    const sessionId  = data?.SessionID;
    const playerName = data?.Info?.Name ?? 'unknown';
    const myCuid     = String(data?.Info?.CUID ?? data?.PlayerInfo?.CUID ?? '');

    if (!aid || !sessionId) {
      console.log('[RTA Capture] 找不到 AID/SessionID，data keys:', Object.keys(data || {}));
      toast('找不到 AID / SessionID，請重新登入', false);
      captured = false;
      return;
    }

    toast('✅ 已登入，正在撈 RTA 紀錄…');
    fetchRtaLog(aid, sessionId, playerName, myCuid);
  }

  // ── 解析回應，找登入資料 ────────────────────────────────────────
  function extractLogin(text) {
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        const entry = json.find(r => r?.route === LOGIN_ROUTE || r?.Route === LOGIN_ROUTE);
        return entry?.data ?? entry?.Data ?? null;
      }
      if (json?.RoleDataContainer) return json;
      if (json?.data?.RoleDataContainer) return json.data;
      if (json?.Data?.RoleDataContainer) return json.Data;
    } catch (_) {}
    return null;
  }

  // ── 攔截 XHR ───────────────────────────────────────────────────
  const XHR = _w.XMLHttpRequest.prototype;
  const origOpen = XHR.open, origSend = XHR.send;
  XHR.open = function (method, url, ...rest) {
    this._url = url || '';
    return origOpen.call(this, method, url, ...rest);
  };
  XHR.send = function (body) {
    if (this._url?.includes('RouterHandler')) {
      this.addEventListener('load', function () {
        console.log('[RTA Capture] XHR 攔到 RouterHandler，前50字：', this.responseText?.slice(0, 50));
        const d = extractLogin(this.responseText);
        if (d) handleLoginResponse(d);
      });
    }
    return origSend.call(this, body);
  };

  // ── 攔截 fetch ─────────────────────────────────────────────────
  const origFetch = _w.fetch;
  _w.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    const res = await origFetch.call(this, input, init);
    if (url.includes('RouterHandler')) {
      res.clone().text().then(text => {
        console.log('[RTA Capture] fetch 攔到 RouterHandler，前50字：', text.slice(0, 50));
        const d = extractLogin(text);
        if (d) handleLoginResponse(d);
      }).catch(() => {});
    }
    return res;
  };

  console.log('[RTA Capture] v1.0.3 已載入，等待登入回應…');
})();
