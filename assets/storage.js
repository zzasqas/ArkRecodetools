// Safe localStorage wrapper — logs warnings on failure instead of silently failing
window.ArkStorage = (function(){
  function get(key, fallback) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch(e){ console.warn('[arkrecode storage] get', key, e); return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.warn('[arkrecode storage] set', key, e); return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(key); }
    catch(e){ console.warn('[arkrecode storage] remove', key, e); }
  }
  return { get, set, remove };
})();
