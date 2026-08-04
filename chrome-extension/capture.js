// ArkRecode 角色列表擷取 — Chrome 外掛 content script（world: MAIN，跑在遊戲頁的 JS 環境）
// 攔遊戲登入回應 RoleDataContainer.Roles → 你擁有的角色，一鍵在檢視器開啟。
// 與 arkrecode-roster-capture.user.js 同一套邏輯（改動請兩邊同步）。
(function () {
  'use strict';

  const TARGET_ROUTE = 'AccountHandler.Login';
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

  function handleLoginResponse(data) {
    try {
      const roles = data?.RoleDataContainer?.Roles;
      if (!Array.isArray(roles) || !roles.length) return; // 掃所有回應，非登入的靜默略過
      if (captured) return;                                // 只處理一次
      captured = true;
      const owned = roles.map(r => ({ id: r.StaticID, lv: r.LV, star: r.Star, awaken: r.AwakenLV }))
                         .filter(x => x.id);
      const account = data?.Info?.Name || data?.PlayerInfo?.Name || null;
      const payload = {
        exportedAt: new Date().toISOString(), source: 'extension', account,
        ownedCount: owned.length, owned,
      };
      const jsonStr = JSON.stringify(payload);
      console.log('[ArkRecode Roster] 已擷取', owned.length, '隻角色', account ? `（${account}）` : '');

      const panel = document.createElement('div');
      Object.assign(panel.style, {
        position: 'fixed', top: '12px', right: '12px', zIndex: 99999,
        padding: '12px 16px', borderRadius: '10px', fontSize: '14px', color: '#fff',
        background: '#3b0764', boxShadow: '0 4px 16px rgba(0,0,0,.6)',
        display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px',
      });
      const title = document.createElement('div');
      title.textContent = `✅ 角色擷取成功：${owned.length} 隻` + (account ? `（${account}）` : '');
      title.style.fontWeight = 'bold';

      const btnStyle = { padding: '6px 12px', borderRadius: '6px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };

      const btnOpen = document.createElement('button');
      btnOpen.textContent = '🔗 直接在檢視器開啟';
      Object.assign(btnOpen.style, { ...btnStyle, background: '#7c3aed', color: '#fff' });
      btnOpen.onclick = () => window.open(VIEWER_URL + '#data=' + encodeURIComponent(jsonStr), '_blank');

      const btnDl = document.createElement('button');
      btnDl.textContent = '⬇️ 下載 JSON（備用）';
      Object.assign(btnDl.style, { ...btnStyle, background: '#3730a3', color: '#fff' });
      btnDl.onclick = () => {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const tag = account ? '_' + account : '';
        a.download = `arkrecode_roster${tag}_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        showToast('已存到瀏覽器「下載」資料夾');
      };

      const btnCopy = document.createElement('button');
      btnCopy.textContent = '📋 複製 JSON';
      Object.assign(btnCopy.style, { ...btnStyle, background: '#2563eb', color: '#fff' });
      btnCopy.onclick = () => { navigator.clipboard.writeText(jsonStr).catch(() => {}); showToast('已複製 JSON'); };

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
    } catch (_) {}
    return null;
  }

  const XHR = XMLHttpRequest.prototype;
  const origOpen = XHR.open, origSend = XHR.send;
  XHR.open = function (method, url, ...rest) { this._arkUrl = url || ''; return origOpen.call(this, method, url, ...rest); };
  XHR.send = function (body) {
    if (this._arkUrl?.includes('RouterHandler')) {
      this.addEventListener('load', function () {
        try {
          const d = extractLoginData(this.responseText);
          if (d) handleLoginResponse(d);
        } catch (_) {}
      });
    }
    return origSend.call(this, body);
  };

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    const res = await origFetch.call(this, input, init);
    if (url.includes('RouterHandler')) {
      // 掃所有 RouterHandler 回應，靠回應裡有沒有 RoleDataContainer 判斷（只有登入回應才有）
      res.clone().text().then(text => { const d = extractLoginData(text); if (d) handleLoginResponse(d); }).catch(() => {});
    }
    return res;
  };

  console.log('[ArkRecode Roster] v1.0.3 外掛已載入（frame:', location.href, '），掃描 RouterHandler 中...');
})();
