(function(){
  var lang = localStorage.getItem('arkrecode_lang') || 'zh';

  function setLang(l) {
    lang = l;
    localStorage.setItem('arkrecode_lang', l);
    document.querySelectorAll('[data-lang]').forEach(function(el){
      el.style.display = (el.getAttribute('data-lang') === l) ? '' : 'none';
    });
    document.querySelectorAll('.arkrecode-header .lang-btn').forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-l') === l);
    });
    window.dispatchEvent(new CustomEvent('arkrecode-lang', { detail: l }));
  }

  function injectHeader() {
    var div = document.createElement('div');
    div.innerHTML = [
      '<nav class="arkrecode-header">',
      '  <a class="logo-link" href="./index.html">',
      '    <span class="logo-icon">⚔</span>',
      '    <div>',
      '      <div class="logo-text">ArkRecode Tools</div>',
      '      <div class="logo-sub">Ark Re:Code 工具集</div>',
      '    </div>',
      '  </a>',
      '  <div class="header-right">',
      '    <button class="lang-btn' + (lang==='zh'?' active':'') + '" data-l="zh" onclick="window._arkLang(\'zh\')">中文</button>',
      '    <button class="lang-btn' + (lang==='en'?' active':'') + '" data-l="en" onclick="window._arkLang(\'en\')">EN</button>',
      '  </div>',
      '</nav>'
    ].join('');
    document.body.insertBefore(div.firstElementChild, document.body.firstChild);
  }

  window._arkLang = setLang;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      injectHeader();
      setLang(lang);
    });
  } else {
    injectHeader();
    setLang(lang);
  }
})();
