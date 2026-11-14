'use strict';
// Real-browser checks (Chromium via Playwright). Run: npx playwright install chromium && node tools/browser_checks/run.cjs
// Covers: layout overflow (320/360px, large font, en/ar/de), corrupted storage boot, local-day in other
// time zones, developer wording in the UI, sound tiles. Exit code 1 on any problem.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const web = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(web, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(web) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
const problems = [];
const fail = (m) => { problems.push(m); console.log('FAIL', m); };

async function layout(b, base) {
  for (const lang of ['en', 'ar', 'de']) for (const w of [320, 360]) for (const scale of [1, 1.5]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 640 } }); const p = await ctx.newPage();
    await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(([l, s]) => { try { applyLanguage(l); } catch (_) {} document.documentElement.style.fontSize = (16 * s) + 'px'; }, [lang, scale]);
    const secs = await p.evaluate(() => [...new Set([...document.querySelectorAll('[id^="sec-"]')].map((n) => n.id))]);
    for (const sec of secs) {
      const bad = await p.evaluate((id) => {
        try { switchTab(id, document.querySelector('[onclick*="' + id + '"]')); } catch (_) {}
        const cur = document.getElementById(id); if (!cur || getComputedStyle(cur).display === 'none') return [];
        const vw = document.documentElement.clientWidth; const out = [];
        cur.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
          const st = getComputedStyle(el); if (st.position === 'fixed' || st.visibility === 'hidden' || st.display === 'none') return;
          if (r.right > vw + 1 || r.left < -1) {
            let a = el, clipped = false; while (a && a !== cur) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { clipped = true; break; } a = a.parentElement; }
            if (!clipped) out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' < ' + (el.parentElement && (el.parentElement.id ? '#' + el.parentElement.id : el.parentElement.tagName.toLowerCase() + '.' + String(el.parentElement.className).trim().split(/\s+/)[0]))) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
          }
        });
        return out.slice(0, 3);
      }, sec);
      if (bad.length) fail(`layout ${lang} ${w}px x${scale} ${sec}: ${bad.join(', ')}`);
    }
    await ctx.close();
  }
}

async function flows(b, base) {
  // End-to-end: create a task with a hostile title, reload, confirm it persisted and rendered as inert text;
  // switch language, reload, confirm the choice and text direction persisted; no page errors.
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
  await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
  const evil = '<img src=x onerror="window.__pwned=1"> "q" & \'s\'';
  await p.evaluate((t) => { document.getElementById('inpNewTask').value = t; createNewTask(); }, evil);
  await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    try { switchTab('sec-tasks', document.querySelector('[onclick*="sec-tasks"]')); } catch (_) {}
    return { pwned: !!window.__pwned, injected: !!document.querySelector('#sec-tasks img[src="x"]'),
      found: document.body.innerText.includes('<img src=x'), saved: tasksList.some((t) => t.title.startsWith('<img')) };
  });
  if (r.pwned || r.injected) fail('flows: hostile task title executed/injected');
  if (!r.saved) fail('flows: task did not survive reload');
  if (!r.found) fail('flows: hostile title not shown as literal text');
  await p.evaluate(() => applyLanguage('ar')); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(1500);
  const dir = await p.evaluate(() => ({ lang: cfg.lang, dir: document.documentElement.dir }));
  if (dir.lang !== 'ar' || dir.dir !== 'rtl') fail('flows: language/direction not restored: ' + JSON.stringify(dir));
  const san = await p.evaluate(() => dfSanitizeHtmlFragment('<p onclick="x()">Hi</p><scr<script>ipt>bad()</script><a href="java\nscript:alert(1)">a</a><img src=x onerror=alert(1)><b>ok</b>'));
  const reparsed = await p.evaluate((h) => { const t = document.createElement('template'); t.innerHTML = h; return { scripts: t.content.querySelectorAll('script,iframe,object,embed').length, handlers: [...t.content.querySelectorAll('*')].filter((e) => [...e.attributes].some((a) => /^on/i.test(a.name) || /^\s*(javascript|data):/i.test(a.value.replace(/[\s\u0000-\u001f]+/g, '')))).length, ok: !!t.content.querySelector('b') }; }, san);
  if (reparsed.scripts || reparsed.handlers || !reparsed.ok) fail('flows: sanitizer output unsafe or too aggressive: ' + san);
  if (errs.length) fail('flows: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

async function offline(b, base) {
  // The app promises 100% offline: boot it, open every section, and fail on any request that leaves localhost.
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage(); const out = [];
  p.on('request', (r) => { const u = r.url(); if (!/^(http:\/\/localhost|data:|blob:|about:)/.test(u)) out.push(u.slice(0, 100)); });
  await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
  const secs = await p.evaluate(() => [...new Set([...document.querySelectorAll('[id^="sec-"]')].map((n) => n.id))]);
  for (const id of secs) { await p.evaluate((i) => { try { switchTab(i, document.querySelector('[onclick*="' + i + '"]')); } catch (_) {} }, id); await p.waitForTimeout(150); }
  if (out.length) fail('offline: external requests: ' + [...new Set(out)].slice(0, 5).join(', '));
  await ctx.close();
}

async function timerFlow(b, base) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)));
  await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
  const st = [];
  st.push(await p.evaluate(() => timerRunning));
  await p.evaluate(() => toggleTimerPlay()); await p.waitForTimeout(1300);
  st.push(await p.evaluate(() => timerRunning));
  await p.evaluate(() => toggleTimerPlay()); await p.waitForTimeout(300);
  st.push(await p.evaluate(() => timerRunning));
  await p.evaluate(() => { try { resetTimerNow(); } catch (_) {} });
  if (st.join() !== 'false,true,false') fail('timer: unexpected running states ' + st.join());
  if (errs.length) fail('timer: page errors: ' + errs.slice(0, 3).join(' | '));
  await ctx.close();
}

async function corruption(b, base) {
  const keys = ['cfg', 'tasks', 'notes'].flatMap((k) => [`zen_fortress_${k}_v21`, `zen_fortress_${k}_v21_mirror`]);
  const bads = ['{not json', 'null', '[]', '{"payload":1,"sig":"x","ts":1}', '\u0000\u0001', 'x'.repeat(200000), '{"payload":{"__proto__":{"polluted":1}},"sig":"a","ts":1}'];
  for (const key of keys) for (const bad of bads) {
    const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 80)));
    await p.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem('__seed')) { localStorage.setItem(k, v); sessionStorage.setItem('__seed', '1'); } } catch (_) {} }, [key, bad]);
    await p.goto(base + '/index.html'); await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({ ui: document.body.innerText.length > 100, polluted: ({}).polluted === 1 }));
    if (errs.length || !r.ui || r.polluted) fail(`corrupt ${key} <- ${JSON.stringify(bad.slice(0, 16))}: errs=${errs[0] || ''} ui=${r.ui} polluted=${r.polluted}`);
    await ctx.close();
  }
}

async function timezones(b, base) {
  for (const [tz, want] of [['Asia/Amman', '2026-11-14'], ['America/Los_Angeles', '2026-11-13'], ['Pacific/Kiritimati', '2026-11-14']]) {
    const ctx = await b.newContext({ timezoneId: tz }); const p = await ctx.newPage();
    await p.addInitScript(() => { const T = Date.parse('2026-11-13T23:30:00Z'); const RD = Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(T); else super(...a); } static now() { return T; } } window.Date = FD; });
    await p.goto(base + '/index.html'); await p.waitForTimeout(1200);
    const got = await p.evaluate(() => localDateISO());
    if (got !== want) fail(`timezone ${tz}: local day ${got}, expected ${want}`);
    await ctx.close();
  }
}

async function devText(b, base) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await ctx.newPage();
  await p.goto(base + '/index.html'); await p.waitForTimeout(1800);
  const hits = await p.evaluate(() => {
    const re = /audit|dogfood|pillar|\bM\d{3,}\b|\d+\/100|\bQA\b|\bdebug\b|TODO|lorem|flawless|fail-closed|zero-trust|sovereign|fortress/i; const out = [];
    document.querySelectorAll('[id^="sec-"]').forEach((cur) => {
      try { switchTab(cur.id, document.querySelector('[onclick*="' + cur.id + '"]')); } catch (_) {}
      const w = document.createTreeWalker(cur, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; const t = n.nodeValue.trim(); if (!t || !re.test(t)) continue; const el = n.parentElement; if (getComputedStyle(el).display === 'none' || !el.getBoundingClientRect().width) continue; out.push(cur.id + ': ' + t.slice(0, 60)); }
    });
    return out;
  });
  hits.forEach((h) => fail('developer wording visible: ' + h));
  await ctx.close();
}

async function sounds(b, base) {
  const ctx = await b.newContext(); const p = await ctx.newPage(); const reqs = [];
  p.on('request', (r) => { if (/\.ogg/.test(r.url())) reqs.push(path.basename(r.url())); });
  await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
  const ids = await p.evaluate(() => { renderSoundsStudio(); return [...document.querySelectorAll('[data-sound-toggle]')].map((n) => n.getAttribute('data-sound-toggle')); });
  if (ids.length < 5) fail('sound tiles: ' + ids.length);
  for (const id of ids) { await p.evaluate((i) => toggleSoundTile(i), id); await p.waitForTimeout(150); await p.evaluate((i) => toggleSoundTile(i), id); }
  const missing = await p.evaluate(() => SOUNDS_DATA.filter((s) => !s.src).map((s) => s.id));
  if (missing.length) fail('sound without src: ' + missing);
  if (new Set(reqs).size < ids.length) fail('sound files fetched: ' + [...new Set(reqs)] + ' for ' + ids);
  await ctx.close();
}

async function flashcards(b, base) {
  // Real UI flow through clicks and typing: first card, duplicate warning, study + rating, search (Arabic, diacritics),
  // hostile text stays inert, restart persistence, backup round trip, layout at 320px/1.5x in en+ar, speech stops on tab change.
  for (const lang of ['en', 'ar']) {
    const ctx = await b.newContext({ viewport: { width: 320, height: 700 } }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)));
    p.on('dialog', (d) => d.accept());
    await p.goto(base + '/index.html'); await p.waitForTimeout(1500);
    await p.evaluate((l) => { try { applyLanguage(l); } catch (_) {} document.documentElement.style.fontSize = '24px'; }, lang);
    await p.evaluate(() => { switchTab('sec-notes', document.getElementById('navNotes')); });
    await p.click('#flashcardsEntry'); await p.waitForTimeout(300);
    const empty = await p.evaluate(() => ({ active: document.getElementById('sec-flashcards').classList.contains('active'), addFirst: !!document.querySelector('#sec-flashcards .fc-empty .fc-btn.primary') }));
    if (!empty.active || !empty.addFirst) fail(`flashcards ${lang}: entry/empty state broken ${JSON.stringify(empty)}`);
    await p.click('#sec-flashcards .fc-empty .fc-btn.primary'); await p.waitForTimeout(150);
    const evil = '<img src=x onerror="window.__fc=1"> Haus';
    await p.evaluate(() => { document.querySelector('#sec-flashcards .fc-more').open = true; });
    await p.fill('#fcFront', evil); await p.fill('#fcBack', 'كِتاب & "house"'); await p.fill('#fcSrc', 'de-DE'); await p.fill('#fcTgt', 'ar');
    await p.click('#sec-flashcards .fc-row .fc-btn.primary'); await p.waitForTimeout(250);
    // duplicate warning
    await p.fill('#fcFront', evil); await p.fill('#fcBack', 'x');
    await p.click('#sec-flashcards .fc-row .fc-btn.primary'); await p.waitForTimeout(150);
    const dup = await p.evaluate(() => (document.querySelector('#sec-flashcards .fc-warn') || {}).textContent || '');
    if (!dup) fail(`flashcards ${lang}: no duplicate warning`);
    const st = await p.evaluate(() => ({ total: DFFlashcardsApp.stats().total, pwned: !!window.__fc, injected: !!document.querySelector('#sec-flashcards img') }));
    if (st.total !== 1 || st.pwned || st.injected) fail(`flashcards ${lang}: add/inert text broken ${JSON.stringify(st)}`);
    // study: reveal then rate Good
    await p.evaluate(() => { DFFlashcardsUI.show(); }); await p.waitForTimeout(100);
    await p.click('#sec-flashcards .fc-quick .fc-btn.primary'); await p.waitForTimeout(100);
    await p.click('#sec-flashcards .fc-modes .fc-btn.primary'); await p.waitForTimeout(150);
    await p.click('#sec-flashcards .fc-btn.primary.big'); await p.waitForTimeout(100);
    const over = await p.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll('#sec-flashcards *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.className || e.tagName); });
    if (over.length) fail(`flashcards ${lang}: overflow in study view ${over.join(',')}`);
    await p.click('#sec-flashcards .fc-btn.rate.r3'); await p.waitForTimeout(200);
    const after = await p.evaluate(() => { const s = DFFlashcardsApp.stats(); const c = DFFlashcardsApp.search('').items[0]; return { reviewed: s.reviewedToday, st: c.st, digits: /^[0-9]+$/.test(document.querySelector('#sec-flashcards .fc-stat strong') ? document.querySelector('#sec-flashcards .fc-stat strong').textContent : '0') }; });
    if (after.reviewed !== 1 || after.st !== 'learning') fail(`flashcards ${lang}: rating not recorded ${JSON.stringify(after)}`);
    // search: Arabic with and without diacritics
    const found = await p.evaluate(() => [DFFlashcardsApp.search('كتاب').total, DFFlashcardsApp.search('كِتاب').total, DFFlashcardsApp.search('zzz').total]);
    if (found[0] !== 1 || found[1] !== 1 || found[2] !== 0) fail(`flashcards ${lang}: search ${found}`);
    // persistence across reload and backup round trip
    await p.reload(); await p.waitForTimeout(1500);
    const persisted = await p.evaluate(() => { const c = DFFlashcardsApp.search('').items[0]; return { total: DFFlashcardsApp.stats().total, reps: c && c.reps, front: c && c.frontText }; });
    if (persisted.total !== 1 || persisted.reps !== 1 || !persisted.front.startsWith('<img')) fail(`flashcards ${lang}: not persisted ${JSON.stringify(persisted)}`);
    const rt = await p.evaluate(() => { const snap = JSON.parse(JSON.stringify(DFFlashcardsApp.exportSnapshot())); const env = buildSovereignBackupEnvelopeObject(); const inBundle = JSON.parse(env.bundle).flashcardsV2; DFFlashcardsApp.deleteCard(snap.cards[0].id); const r = DFFlashcardsApp.importSnapshot(inBundle, { mode: 'replace' }); return { inBundle: !!inBundle && inBundle.cards.length === 1, restored: r.ok, total: DFFlashcardsApp.stats().total }; });
    if (!rt.inBundle || !rt.restored || rt.total !== 1) fail(`flashcards ${lang}: ZEN21 backup does not carry flashcards ${JSON.stringify(rt)}`);
    // balanced directive: multiple choice, mistakes repeat, timer not duplicated
    await p.evaluate(() => { for (const [f, b] of [['one', 'uno'], ['two', 'dos'], ['three', 'tres'], ['four', 'cuatro']]) DFFlashcardsApp.addCard({ deckId: DFFlashcardsApp.listDecks()[0].id, frontText: f, backText: b }); DFFlashcardsApp.setPrefs({ defaultMode: 'choice', textSize: 'large' }); });
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { const t = document.getElementById('sec-flashcards'); if (!t.classList.contains('active')) { switchTab('sec-notes', document.getElementById('navNotes')); document.getElementById('flashcardsEntry').click(); } });
    await p.waitForTimeout(400);
    const t0 = await p.evaluate(() => ({ studied: typeof timerActiveMs === 'number' ? timerActiveMs : 0 }));
    await p.click('#sec-flashcards .fc-quick .fc-btn.primary'); await p.waitForTimeout(100);
    await p.click('#sec-flashcards .fc-modes .fc-btn.primary'); await p.waitForTimeout(250);
    const mc = await p.evaluate(() => ({ n: document.querySelectorAll('#sec-flashcards .fc-choices button').length, scale: getComputedStyle(document.getElementById('sec-flashcards')).getPropertyValue('--fc-scale') }));
    if (mc.n < 2 || mc.n > 4) fail(`flashcards ${lang}: multiple choice not rendered ${JSON.stringify(mc)}`);
    await p.click('#sec-flashcards .fc-choices button'); await p.waitForTimeout(150);
    if (!(await p.$('#sec-flashcards .fc-btn.rate.r1'))) fail(`flashcards ${lang}: no rating after choice`);
    await p.click('#sec-flashcards .fc-btn.rate.r1'); await p.waitForTimeout(200);
    const t1 = await p.evaluate(() => ({ studied: typeof timerActiveMs === 'number' ? timerActiveMs : 0 }));
    if (t1.studied - t0.studied > 5000) fail(`flashcards ${lang}: flashcards touched the timer accounting ${JSON.stringify([t0, t1])}`);
    await p.evaluate(() => DFFlashcardsUI.leave());
    // leaving the section stops speech
    const stopCalled = await p.evaluate(() => { let n = 0; window.ZenNative = Object.assign(window.ZenNative || {}, { ttsInit: () => '{"ok":true,"status":"ready"}', ttsStop: () => { n++; return '{"ok":true}'; }, ttsSpeak: () => '{"ok":true}' }); DFFlashcardsUI.show(); switchTab('sec-timer', document.getElementById('navTimer')); return n; });
    if (stopCalled < 1) fail(`flashcards ${lang}: speech not stopped when leaving the section`);
    if (lang === 'ar') { const dir = await p.evaluate(() => { switchTab('sec-flashcards', document.getElementById('navNotes')); return document.getElementById('sec-flashcards').getAttribute('dir'); }); if (dir !== 'rtl') fail('flashcards ar: section is not RTL'); }
    if (errs.length) fail(`flashcards ${lang}: page errors ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = 'http://localhost:' + server.address().port;
  const b = await chromium.launch();
  const only = process.argv[2];
  for (const [name, fn] of Object.entries({ layout, corruption, timezones, devText, sounds, flows, offline, timerFlow, flashcards })) {
    if (only && only !== name) continue;
    const before = problems.length; await fn(b, base); console.log(name, problems.length === before ? 'OK' : 'FAILED');
  }
  await b.close(); server.close();
  process.exit(problems.length ? 1 : 0);
})();
