'use strict';
// Runtime UI string inventory: loads the real app in Chromium, switches language, visits every section and modal,
// and collects every user-visible string (text nodes, placeholder, aria-label, title, alt, button value).
// Usage: node tools/i18n/runtime_inventory.cjs [lang ...]   -> i18n-out/inventory_<lang>.json
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const SECTIONS = ['sec-timer', 'sec-tasks', 'sec-calendar', 'sec-notes', 'sec-sounds', 'sec-analytics', 'sec-flashcards'];
async function collect(p) {
  return p.evaluate(() => {
    const out = new Map();
    const vis = (el) => { if (!el) return false; const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const add = (kind, txt, el) => { txt = (txt || '').replace(/\s+/g, ' ').trim(); if (!txt || !/\p{L}/u.test(txt)) return; const k = kind + '\u0001' + txt; if (!out.has(k)) out.set(k, { kind, text: txt, where: (el.closest('[id]') || {}).id || '' }); };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { const el = n.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(el.tagName)) continue; if (el.isContentEditable) continue; if (vis(el)) add('text', n.nodeValue, el); }
    document.querySelectorAll('[placeholder],[aria-label],[title],[alt],input[type=button],input[type=submit]').forEach((el) => {
      if (!vis(el) && !el.closest('.modal-overlay.open')) return;
      ['placeholder', 'aria-label', 'title', 'alt'].forEach((a) => { if (el.hasAttribute(a)) add(a, el.getAttribute(a), el); });
      if (el.tagName === 'INPUT' && /button|submit/.test(el.type)) add('value', el.value, el);
    });
    return [...out.values()];
  });
}
(async () => {
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['en'];
  const srv = http.createServer((q, r) => { const f = path.join(root, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); r.end(d); } }); });
  await new Promise((r) => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port;
  const b = await chromium.launch(); fs.mkdirSync('i18n-out', { recursive: true });
  for (const lang of langs) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 860 } }); const p = await ctx.newPage(); p.on('dialog', (d) => d.dismiss());
    await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
    await p.evaluate((l) => { try { applyLanguage(l); } catch (_) {} }, lang); await p.waitForTimeout(400);
    const all = new Map(); const push = (arr, screen) => arr.forEach((x) => { const k = x.kind + '\u0001' + x.text; if (!all.has(k)) all.set(k, { ...x, screens: [screen] }); else if (!all.get(k).screens.includes(screen)) all.get(k).screens.push(screen); });
    for (const s of SECTIONS) {
      await p.evaluate((s) => { try { const nav = { 'sec-timer': 'navTimer', 'sec-tasks': 'navTasks', 'sec-calendar': 'navCalendar', 'sec-notes': 'navNotes', 'sec-sounds': 'navSounds', 'sec-analytics': 'navAnalytics' }[s]; if (s === 'sec-flashcards') { switchTab('sec-notes', document.getElementById('navNotes')); document.getElementById('flashcardsEntry').click(); } else switchTab(s, document.getElementById(nav)); } catch (_) {} }, s);
      await p.waitForTimeout(350); push(await collect(p), s);
    }
    const modals = await p.evaluate(() => [...document.querySelectorAll('.modal-overlay[id]')].map((m) => m.id));
    for (const m of modals) {
      await p.evaluate((m) => { document.querySelectorAll('.modal-overlay.open').forEach((x) => x.classList.remove('open')); document.getElementById(m).classList.add('open'); }, m);
      await p.waitForTimeout(200); push(await collect(p), 'modal:' + m);
      await p.evaluate((m) => document.getElementById(m).classList.remove('open'), m);
    }
    const items = [...all.values()];
    fs.writeFileSync(`i18n-out/inventory_${lang}.json`, JSON.stringify(items, null, 1));
    console.log(lang, 'strings:', items.length);
    await ctx.close();
  }
  await b.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(2); });
