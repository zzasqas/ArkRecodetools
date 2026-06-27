// 每日代管服務推廣彈窗 — 共用於 index / battle-recorder / equip-optimizer
(function(){
  var COUNT_KEY = 'arkrecode_daikan_close_count';
  var TS_KEY    = 'arkrecode_daikan_popup_closed';
  var SIX_DAYS  = 6 * 24 * 60 * 60 * 1000;

  function shouldShow() {
    var count = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10);
    if (count < 3) return true;                          // 前三次每次都跳
    var ts = localStorage.getItem(TS_KEY);
    return !ts || (Date.now() - Number(ts)) > SIX_DAYS; // 第三次起，6天冷卻
  }

  function injectCSS() {
    var s = document.createElement('style');
    s.textContent = [
      '#daikan-popup{position:fixed;bottom:24px;left:24px;width:320px;',
      'background:#0D1424;border:1px solid rgba(251,191,36,.35);border-radius:16px;',
      'box-shadow:0 16px 48px rgba(0,0,0,.65),0 0 0 1px rgba(251,191,36,.07);',
      'z-index:9999;padding:20px 20px 15px;',
      'opacity:0;transform:translateY(12px);',
      'transition:opacity .4s ease,transform .4s ease;pointer-events:none;}',
      '#daikan-popup.show{opacity:1;transform:translateY(0);pointer-events:auto;}',
      '#daikan-popup .dp-close{position:absolute;top:10px;right:12px;background:none;border:none;',
      'color:#64748B;font-size:17px;cursor:pointer;line-height:1;padding:2px 5px;',
      'border-radius:4px;transition:color .15s;}',
      '#daikan-popup .dp-close:hover{color:#F87171;}',
      '#daikan-popup .dp-badge{font-size:11px;font-weight:700;letter-spacing:.08em;color:#FBBF24;margin-bottom:8px;}',
      '#daikan-popup .dp-body{font-size:13px;color:#94A3B8;line-height:1.65;margin-bottom:10px;}',
      '#daikan-popup .dp-body strong{color:#E2E8F0;}',
      '#daikan-popup .dp-price{display:inline-block;margin-bottom:12px;padding:5px 12px;',
      'border-radius:7px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);',
      'font-size:13px;font-weight:700;color:#FCD34D;}',
      '#daikan-popup .dp-btns{display:flex;gap:8px;}',
      '#daikan-popup .dp-btn-main{flex:1;padding:9px 0;border-radius:8px;',
      'background:linear-gradient(135deg,#D97706,#FBBF24);color:#1a1000;',
      'font-size:13px;font-weight:700;border:none;cursor:pointer;',
      'text-decoration:none;display:flex;align-items:center;justify-content:center;transition:filter .2s;}',
      '#daikan-popup .dp-btn-main:hover{filter:brightness(1.1);}',
      '#daikan-popup .dp-btn-discord{flex:1;padding:9px 0;border-radius:8px;',
      'background:rgba(88,101,242,.15);border:1px solid rgba(88,101,242,.35);',
      'color:#A5B4FC;font-size:13px;font-weight:700;cursor:pointer;',
      'text-decoration:none;display:flex;align-items:center;justify-content:center;transition:background .2s;}',
      '#daikan-popup .dp-btn-discord:hover{background:rgba(88,101,242,.28);}',
      '#daikan-popup .dp-disclaimer{font-size:11px;color:#475569;margin-top:9px;text-align:center;}',
      '@media(max-width:480px){',
      '#daikan-popup{left:10px;right:10px;width:auto;bottom:14px;}}'
    ].join('');
    document.head.appendChild(s);
  }

  function injectHTML() {
    var el = document.createElement('div');
    el.id = 'daikan-popup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '每日代管服務推廣');
    el.innerHTML = [
      '<button class="dp-close" onclick="closeDaikanPopup()" aria-label="關閉">×</button>',
      '<div class="dp-badge">🤖 每日代管服務</div>',
      '<div class="dp-body">',
      '  早上八點爬起來買商店體力、糾結今天該刷哪個討伐……<br>',
      '  上班開不了遊戲，眼睜睜看體力爆掉？😩<br><br>',
      '  <strong>交給每日代管</strong> —— 你上線只要專心打對戰跟團戰，雜事我們自動完成。',
      '</div>',
      '<div class="dp-price">🔖 試用優惠 $99/月（原價 $169，限 9 月底前）</div>',
      '<div class="dp-btns">',
      '  <a class="dp-btn-main" href="./daikan.html">了解詳情</a>',
      '  <a class="dp-btn-discord" href="https://discord.com/users/11464856zzas" target="_blank" rel="noopener">Discord 聯絡</a>',
      '</div>',
      '<div class="dp-disclaimer">已穩定運行半年 · 代管服務，非保證不封號</div>'
    ].join('');
    document.body.appendChild(el);
  }

  window.closeDaikanPopup = function() {
    var p = document.getElementById('daikan-popup');
    if (p) p.classList.remove('show');
    var count = parseInt(localStorage.getItem(COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(COUNT_KEY, String(count));
    if (count >= 3) localStorage.setItem(TS_KEY, String(Date.now()));
  };

  function init() {
    if (!shouldShow()) return;
    injectCSS();
    injectHTML();
    // 3.5 ~ 5 秒隨機淡入，避免多頁同時看起來「卡死的時鐘」
    var delay = 1200;
    setTimeout(function(){
      var p = document.getElementById('daikan-popup');
      if (p) p.classList.add('show');
    }, delay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
