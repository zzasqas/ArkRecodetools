// 機制查表頁面邏輯
const D = window.MECHANICS;
const EL = { fire: ['火', 'var(--fire)'], water: ['水', 'var(--water)'], wood: ['木', 'var(--wood)'], light: ['光', 'var(--light)'], dark: ['暗', 'var(--dark)'] };
const USED = new Set([...D.skills.flatMap((s) => [...s.t, ...s.b]), ...D.bonds.flatMap((e) => e.t), ...D.sets.flatMap((e) => e.t)]);
const CATC = Object.fromEntries(D.cats.map(([c], i) => [c, `var(--c${i})`]));
const STK = {}; // 狀態名 → buff／debuff／mark（從標籤推：該招有哪個大類）
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem('lookup.' + k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem('lookup.' + k, JSON.stringify(v)); } catch {} };
const S = { sel: new Set(), q: '', scope: load('scope', 'skill'), tab: 'unit', els: new Set(), cls: new Set(), stars: new Set(), common: load('common', true), open: new Set(), fold: new Set(load('fold', [])), page: 1 };
const PAGE = 40;

// 每招純文字（搜尋用）
for (const s of D.skills) s.plain = (s.n + ' ' + s.st.join(' ') + ' ' + s.d.replace(/⟦\w\|/g, '').replace(/⟧/g, '').replace(/^\w:/gm, '')).toLowerCase();
for (const s of D.skills) for (const n of s.st) STK[n] ??= s.t.some((k) => k.startsWith('負面狀態')) && !s.t.some((k) => k.startsWith('正面狀態')) ? 'debuff' : s.t.some((k) => k.startsWith('正面狀態')) && !s.t.some((k) => k.startsWith('負面狀態')) ? 'buff' : '';
const byUnit = {};
for (const s of D.skills) (byUnit[s.u] ??= []).push(s);

const has = (rec, k) => k.startsWith('st:') ? rec.st.includes(k.slice(3)) : rec.t.includes(k) || (rec.b ?? []).includes(k);
const unitPass = (id) => {
  const u = D.units[id];
  return (!S.els.size || S.els.has(u.el)) && (!S.cls.size || S.cls.has(u.cls)) && (!S.stars.size || S.stars.has(u.star)) && (!S.common || u.common);
};
const qOk = (txt) => !S.q || txt.includes(S.q);
// 一隻角色在條件 sel 下：符合就回傳要顯示的技能，否則 null
function unitHits(id, sel) {
  const sk = byUnit[id] ?? [], u = D.units[id], uq = !S.q || u.n.toLowerCase().includes(S.q);
  const keys = [...sel];
  if (!keys.length) { const shown = uq ? sk : sk.filter((s) => qOk(s.plain)); return shown.length ? shown : null; }
  if (S.scope === 'skill') {
    const hit = sk.filter((s) => keys.every((k) => has(s, k)) && (uq || qOk(s.plain)));
    return hit.length ? hit : null;
  }
  if (!keys.every((k) => sk.some((s) => has(s, k)))) return null;
  const hit = sk.filter((s) => keys.some((k) => has(s, k)));
  return uq || hit.some((s) => qOk(s.plain)) ? hit : null;
}
const entPass = (e, sel) => [...sel].every((k) => has(e, k)) && qOk((e.n + ' ' + (e.en ?? '') + ' ' + e.ab + ' ' + e.st.join(' ')).toLowerCase());
const unitsMatching = (sel) => Object.keys(D.units).filter((id) => unitPass(id) && unitHits(id, sel));
const countFor = (sel) => S.tab === 'unit' ? unitsMatching(sel).length : (S.tab === 'bond' ? D.bonds : D.sets).filter((e) => (S.tab !== 'bond' || !S.cls.size || S.cls.has(e.cls) || e.cls === '通用') && entPass(e, sel)).length;

// ───── 畫面 ─────
const $ = (id) => document.getElementById(id);
const chipHTML = (k, opts = {}) => {
  if (k.startsWith('st:')) { const n = k.slice(3); return `<span class="chip st ${STK[n] ?? ''} ${S.sel.has(k) ? 'on' : ''}" data-k="${esc(k)}" title="依這個狀態篩選">${esc(n)}</span>`; }
  const [c, s] = k.split('|');
  return `<span class="chip ${S.sel.has(k) ? 'on' : ''} ${opts.burn ? 'burnt' : ''} ${opts.zero ? 'zero' : ''}" style="--cc:${CATC[c]}" data-k="${esc(k)}" title="${esc(c)}${opts.burn ? '（魂燃時才有）' : ''}">${esc(s)}${opts.n !== undefined ? ` <span class="k">${opts.n}</span>` : ''}</span>`;
};
function renderFilters() {
  $('els').innerHTML = Object.entries(EL).map(([k, [n, c]]) => `<button class="pill ${S.els.has(k) ? 'on' : ''}" data-el="${k}"><span class="eldot" style="background:${c}"></span> ${n}</button>`).join('');
  const clsList = [...new Set(Object.values(D.units).map((u) => u.cls).filter(Boolean))];
  $('clss').innerHTML = clsList.map((c) => `<button class="pill ${S.cls.has(c) ? 'on' : ''}" data-cls="${c}">${c}</button>`).join('');
  $('stars').innerHTML = [5, 4, 3].map((s) => `<button class="pill ${S.stars.has(s) ? 'on' : ''}" data-star="${s}">★${s}</button>`).join('');
  $('common').checked = S.common;
  [...$('scope').children].forEach((b) => b.classList.toggle('on', b.dataset.v === S.scope));
}
function renderCats() {
  $('cats').innerHTML = D.cats.map(([c, all]) => {
    const subs = all.filter((s) => USED.has(`${c}|${s}`));
    const items = subs.map((s) => { const k = `${c}|${s}`, n = S.sel.has(k) ? null : countFor(new Set([...S.sel, k])); return chipHTML(k, { n: n ?? undefined, zero: n === 0 }); }).join('');
    return `<div class="cat ${S.fold.has(c) ? 'fold' : ''}" style="--cc:${CATC[c]}"><h3 data-fold="${esc(c)}">${esc(c)} <span class="n">${subs.length}</span></h3><div class="row">${items}</div></div>`;
  }).join('');
}
function renderSel() {
  $('selbar').innerHTML = S.sel.size ? [...S.sel].map((k) => chipHTML(k)).join('') : '<span class="hint" style="margin:0">點右邊或下方的標籤加入條件</span>';
}
function descHTML(d) {
  let s = esc(d);
  for (let i = 0; i < 4; i++) s = s.replace(/⟦(\w)\|([^⟦⟧]*)⟧/g, (_, t, x) => `<span class="t-${t}">${x}</span>`);
  return s.split('\n').map((l) => { const m = l.match(/^(\w):(.*)$/); return m ? `<p class="${m[1]}">${m[2]}</p>` : `<p>${l}</p>`; }).join('');
}
// 標籤依大類順序排；「技能類型」不做成色塊，放在技能名旁邊當小字（每招都有，做成色塊太吵）
const ORD = Object.fromEntries(D.cats.flatMap(([c, subs], i) => subs.map((s, j) => [`${c}|${s}`, i * 100 + j])));
const byOrd = (a, b) => (ORD[a] ?? 0) - (ORD[b] ?? 0);
function skillHTML(s) {
  const isType = (k) => k.startsWith('技能類型|') && k !== '技能類型|無視抗性';
  const ty = s.t.filter(isType).sort(byOrd).map((k) => `<span class="ty ${S.sel.has(k) ? 'on' : ''}" data-k="${esc(k)}">${esc(k.split('|')[1])}</span>`).join('');
  const tags = [...s.t.filter((k) => !isType(k)).sort(byOrd).map((k) => chipHTML(k)), ...[...s.b].sort(byOrd).map((k) => chipHTML(k, { burn: true })), ...s.st.map((n) => chipHTML('st:' + n))].join('');
  const key = s.s, open = S.open.has(key);
  return `<div class="sk"><div class="top"><span class="slot ${s.t.includes('技能類型|被動') ? 'p' : ''}">S${s.slot}</span><span class="nm">${esc(s.n)}</span>${ty}
    ${s.d ? `<button class="more" data-open="${esc(key)}">${open ? '收合說明 ▴' : '說明 ▾'}</button>` : ''}</div>
    ${tags ? `<div class="tags">${tags}</div>` : ''}${open ? `<div class="desc">${descHTML(s.d)}</div>` : ''}</div>`;
}
function unitCard(id, hits) {
  const u = D.units[id], [eln, elc] = EL[u.el] ?? ['', 'var(--line)'];
  return `<div class="card"><div class="hd"><div class="av" style="--elc:${elc}">${u.ic ? `<img src="${esc(u.ic)}" alt="" loading="lazy" data-fb="${esc(u.n[0])}">` : esc(u.n[0])}</div>
    <div><div class="name">${esc(u.n)}</div><div class="meta">${eln}・${esc(u.cls ?? '')}・★${u.star}　${id}</div></div>
    <span style="flex:1"></span>${u.common ? '<span class="badge">常用</span>' : ''}</div>${hits.map(skillHTML).join('')}</div>`;
}
const entCard = (e, kind) => `<div class="card"><div class="hd"><div><div class="name">${esc(e.n)}</div><div class="meta">${kind === 'bond' ? `${esc(e.cls)}　${esc(e.en)}` : `${e.pc} 件套`}</div></div></div>
  <div class="ab">${esc(e.ab)}<div class="tags">${[...e.t.map((k) => chipHTML(k)), ...e.st.map((n) => chipHTML('st:' + n))].join('')}</div></div></div>`;
function renderList() {
  const units = unitsMatching(S.sel);
  const bonds = D.bonds.filter((e) => (!S.cls.size || S.cls.has(e.cls) || e.cls === '通用') && entPass(e, S.sel));
  const sets = D.sets.filter((e) => entPass(e, S.sel));
  $('tabs').innerHTML = [['unit', '角色', units.length], ['bond', '羈絆', bonds.length], ['set', '套裝', sets.length]].map(([k, n, c]) => `<button class="${S.tab === k ? 'on' : ''}" data-tab="${k}">${n}<span class="cnt">${c}</span></button>`).join('');
  const list = S.tab === 'unit' ? units : S.tab === 'bond' ? bonds : sets;
  $('hint').textContent = S.sel.size ? `${S.scope === 'skill' ? '同一招同時有' : '同一角色身上都有'}：${[...S.sel].map((k) => k.startsWith('st:') ? k.slice(3) : k.split('|')[1]).join('、')}` : '沒選條件：列出全部。點標籤篩選，可以同時選多個。';
  const shown = list.slice(0, S.page * PAGE);
  $('list').innerHTML = !list.length ? '<div class="empty">沒有符合的結果</div>' : S.tab === 'unit' ? shown.map((id) => unitCard(id, unitHits(id, S.sel))).join('') : shown.map((e) => entCard(e, S.tab)).join('');
  $('pager').innerHTML = list.length > shown.length ? `<button id="moreBtn">再顯示 ${Math.min(PAGE, list.length - shown.length)} 筆（共 ${list.length}）</button>` : '';
}
function render() { renderFilters(); renderSel(); renderCats(); renderList(); }

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-k],[data-el],[data-cls],[data-star],[data-tab],[data-open],[data-fold],#moreBtn,#clear,#theme,#togg,#scope button');
  if (!t) return;
  const d = t.dataset;
  if (d.k) { S.sel.has(d.k) ? S.sel.delete(d.k) : S.sel.add(d.k); S.page = 1; }
  else if (d.el) { S.els.has(d.el) ? S.els.delete(d.el) : S.els.add(d.el); S.page = 1; }
  else if (d.cls) { S.cls.has(d.cls) ? S.cls.delete(d.cls) : S.cls.add(d.cls); S.page = 1; }
  else if (d.star) { const n = +d.star; S.stars.has(n) ? S.stars.delete(n) : S.stars.add(n); S.page = 1; }
  else if (d.tab) { S.tab = d.tab; S.page = 1; }
  else if (d.open) { S.open.has(d.open) ? S.open.delete(d.open) : S.open.add(d.open); return renderList(); }
  else if (d.fold) { S.fold.has(d.fold) ? S.fold.delete(d.fold) : S.fold.add(d.fold); save('fold', [...S.fold]); return renderCats(); }
  else if (t.id === 'moreBtn') { S.page++; return renderList(); }
  else if (t.id === 'clear') { S.sel.clear(); S.page = 1; }
  else if (t.id === 'togg') { $('aside').classList.toggle('closed'); return; }
  else if (t.id === 'theme') {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark'; save('theme', document.documentElement.dataset.theme); return;
  } else if (d.v) { S.scope = d.v; save('scope', S.scope); S.page = 1; }
  render();
});
let qT;
$('q').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value.trim().toLowerCase(); S.page = 1; render(); }, 150); });
$('common').addEventListener('change', (e) => { S.common = e.target.checked; save('common', S.common); S.page = 1; render(); });
const th = load('theme', null); if (th) document.documentElement.dataset.theme = th;
if (matchMedia('(max-width: 860px)').matches) $('aside').classList.add('closed');
$('sub').textContent = `角色 ${Object.keys(D.units).length}・技能 ${D.skills.length}・羈絆 ${D.bonds.length}・套裝 ${D.sets.length}　最後更新 ${D.at}（之後上市的新角色可能還沒收錄）`;
render();
// 圖示載不到就換成名字首字（不用 inline onerror，CSP 才能擋 inline script）
document.addEventListener('error', (e) => { const t = e.target; if (t.tagName === 'IMG' && t.dataset.fb) t.replaceWith(document.createTextNode(t.dataset.fb)); }, true);
