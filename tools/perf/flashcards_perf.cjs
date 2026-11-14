'use strict';
// Real-browser (Chromium, real localStorage, 4x CPU throttle to approximate a mid-range phone) flashcards benchmark
// plus quota-exhaustion safety. NOT an Android WebView measurement: it is the closest reproducible stand-in without a device.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f; try { f = path.resolve(root, '.' + (q.url === '/' ? '/index.html' : decodeURIComponent(q.url.split('?')[0]))); } catch (_e) { f = null; }
    if (!f || (f !== root && !f.startsWith(root + path.sep))) { r.statusCode = 403; r.end(); return; } fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port;
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 760 } }); const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const out = { env: { browser: 'chromium ' + b.version(), cpuThrottle: '4x', note: 'not Android WebView' }, runs: [], quota: {} }; let bad = 0;
  for (const N of [1000, 5000, 10000]) {
    await p.goto(base + '/index.html'); await p.waitForTimeout(1200); await p.evaluate(() => localStorage.clear());
    await p.goto(base + '/index.html'); await p.waitForTimeout(1200);
    const r = await p.evaluate((N) => {
      const A = DFFlashcardsApp, t = {}; const tm = (k, f) => { const s = performance.now(); const v = f(); t[k] = Math.round(performance.now() - s); return v; };
      const d = A.createDeck({ name: 'Bench' }).deck;
      let csv = 'front,back,source,target,example\n'; for (let i = 0; i < N; i++) csv += `Wort${i} ${'x'.repeat(i % 12)},word ${i} meaning of it,de,en,Das ist Beispiel ${i}\n`;
      const parsed = A.parseImport(csv); const map = A.guessMapping(parsed.headers);
      const pv = tm('previewMs', () => A.previewImport(parsed, map, { deckId: d.id }));
      const res = tm('importMs', () => A.commitImport(pv, { deckId: d.id, skipDuplicates: true })); const afterCommit = A.stats().total;
      tm('searchMs', () => A.search('Wort77')); tm('queueMs', () => A.buildQueue({ mode: 'due', deckId: d.id, limit: 50 })); tm('statsMs', () => A.stats());
      const q = A.buildQueue({ mode: 'due', deckId: d.id, limit: 20 }); tm('review20Ms', () => q.forEach((id, i) => A.reviewCard(id, 3, { submissionId: 'p' + i })));
      tm('addOneMs', () => A.addCard({ deckId: d.id, frontText: 'new one', backText: 'neu' }));
      let bytes = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf('df_fc_') === 0) bytes += (k.length + localStorage.getItem(k).length) * 2; }
      return { ok: res.ok, code: res.code, total: afterCommit, imported: res.imported, storageKB: Math.round(bytes / 1024), t };
    }, N);
    const ui = await p.evaluate(async () => { switchTab('sec-notes', document.getElementById('navNotes')); document.getElementById('flashcardsEntry').click(); await new Promise((r) => setTimeout(r, 200)); const s = performance.now(); DFFlashcardsUI.show(); await new Promise((r) => setTimeout(r, 50)); const nodes = document.querySelectorAll('#sec-flashcards *').length; return { homeRenderMs: Math.round(performance.now() - s - 50), domNodes: nodes, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }; });
    const s0 = Date.now(); await p.reload(); await p.waitForFunction(() => window.DFFlashcardsApp && DFFlashcardsApp.stats().total > 0); const startupMs = Date.now() - s0;
    out.runs.push({ cards: N, ...r.t, imported: r.imported, storageKB: r.storageKB, ...ui, reloadToReadyMs: startupMs }); if (!r.ok) { out.runs[out.runs.length - 1].refused = r.code; out.runs[out.runs.length - 1].storedAfterRefusal = r.total; if (r.code !== 'STORAGE_FULL' || r.total !== 0) bad++; } else if (r.imported !== N) bad++;
  }
  // quota exhaustion: fill localStorage, then import/add must fail cleanly and keep existing data
  await p.goto(base + '/index.html'); await p.waitForTimeout(1000); await p.evaluate(() => localStorage.clear());
  out.quota = await p.evaluate(() => {
    const A = DFFlashcardsApp; const d = A.createDeck({ name: 'Q' }).deck; A.addCard({ deckId: d.id, frontText: 'keep', backText: 'keep' });
    const before = A.stats().total; let n = 0; try { for (;;) { localStorage.setItem('zz_fill_' + n, 'x'.repeat(100000)); n++; } } catch (_) { }
    for (let k = 0; k < 3; k++) { try { localStorage.removeItem('zz_fill_' + (n - 1 - k)); } catch (_) { } } // leave a little room, far less than the import needs
    let csv = 'front,back\n'; for (let i = 0; i < 8000; i++) csv += `big${i} ${'y'.repeat(60)},back ${i} ${'z'.repeat(60)}\n`;
    const parsed = A.parseImport(csv); const pv = A.previewImport(parsed, A.guessMapping(parsed.headers), { deckId: d.id }); const r = A.commitImport(pv, { deckId: d.id, skipDuplicates: true });
    const afterImport = A.stats().total; const add = A.addCard({ deckId: d.id, frontText: 'x'.repeat(2000), backText: 'y'.repeat(2000) });
    return { afterImport, before, fillKB: n * 100, importRefused: r.ok === false, importCode: r.code || '', totalAfter: A.stats().total, keptOriginal: afterImport === before, addResultOk: add.ok };
  });
  if (!out.quota.importRefused || !out.quota.keptOriginal) { bad++; console.log('QUOTA SAFETY FAIL'); }
  console.log(JSON.stringify(out, null, 1)); fs.mkdirSync('perf-out', { recursive: true }); fs.writeFileSync('perf-out/flashcards_perf.json', JSON.stringify(out, null, 1));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
