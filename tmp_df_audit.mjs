// Empirical UI audit: all tabs render, console/page errors, Sounds tab order, spatial collapse.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import pw from 'playwright';
const { chromium } = pw;

const web = path.resolve('android/app/src/main/assets/web');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(web, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(web) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = 'http://localhost:' + server.address().port;

const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + String(e.message).slice(0, 160)));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });

await p.goto(base + '/index.html');
await p.waitForTimeout(2000);

// 1. All 7 tabs render + errors
const secs = await p.evaluate(() => [...document.querySelectorAll('.screen-section')].map(s => s.id));
console.log('SECTIONS:', secs.join(','));
for (const id of secs) {
  const r = await p.evaluate((sid) => {
    try { switchTab(sid, null); } catch (e) { return { err: String(e).slice(0, 200) }; }
    const el = document.getElementById(sid);
    const vis = getComputedStyle(el).display !== 'none';
    const btns = el.querySelectorAll('button').length;
    const canvases = el.querySelectorAll('canvas').length;
    return { vis, btns, canvases, text: el.innerText.length };
  }, id);
  console.log('TAB', id, JSON.stringify(r));
}

// 2. Sounds tab order + spatial collapse
await p.evaluate(() => switchTab('sec-sounds', null));
await p.waitForTimeout(600);
const sounds = await p.evaluate(() => {
  const sec = document.getElementById('sec-sounds');
  const kids = [...sec.children].map(c => ({ sel: c.id || c.className, order: getComputedStyle(c).order, top: Math.round(c.getBoundingClientRect().top), h: Math.round(c.getBoundingClientRect().height) }));
  const grid = document.getElementById('soundsGridBox');
  const tiles = grid ? grid.querySelectorAll('.sound-Rich-tile').length : 0;
  const toggle = document.getElementById('dfSpatialCollapseToggle');
  const body = document.getElementById('dfSpatialBody');
  return { kids, tiles, hasToggle: !!toggle, bodyDisplay: body ? getComputedStyle(body).display : 'missing', collapsedFlag: window.__dfSpatialCollapsed === true };
});
console.log('SOUNDS_ORDER', JSON.stringify(sounds, null, 1));

// collapse toggle behavior
const t1 = await p.evaluate(() => {
  const btn = document.getElementById('dfSpatialCollapseToggle');
  if (!btn) return 'no-toggle';
  btn.click();
  const body = document.getElementById('dfSpatialBody');
  return { afterExpand: getComputedStyle(body).display, flag: window.__dfSpatialCollapsed, aria: btn.getAttribute('aria-expanded'), label: btn.textContent };
});
console.log('SPATIAL_EXPAND', JSON.stringify(t1));
const t2 = await p.evaluate(() => {
  const btn = document.getElementById('dfSpatialCollapseToggle');
  btn.click();
  const body = document.getElementById('dfSpatialBody');
  return { afterCollapse: getComputedStyle(body).display, flag: window.__dfSpatialCollapsed, aria: btn.getAttribute('aria-expanded'), label: btn.textContent };
});
console.log('SPATIAL_COLLAPSE', JSON.stringify(t2));

// 3. dfOpenSpatialAudioStudio flow
const t3 = await p.evaluate(() => {
  window.__dfSpatialCollapsed = true; // simulate collapsed session state
  const r = dfOpenSpatialAudioStudio();
  const body = document.getElementById('dfSpatialBody');
  return { ret: r, bodyDisplay: body ? getComputedStyle(body).display : 'missing', flag: window.__dfSpatialCollapsed };
});
console.log('OPEN_SPATIAL_STUDIO', JSON.stringify(t3));

// 4. Dead-button scan: click every button in every tab, look for errors + no-ops
await p.evaluate(() => { window.__clickErrs = []; window.addEventListener('error', e => window.__clickErrs.push(String(e.message).slice(0, 120))); });
for (const id of secs) {
  await p.evaluate((sid) => switchTab(sid, null), id);
  await p.waitForTimeout(300);
  const info = await p.evaluate((sid) => {
    const sec = document.getElementById(sid);
    const out = [];
    sec.querySelectorAll('button').forEach((btn, i) => {
      const before = document.body.innerHTML.length;
      let err = null;
      try { btn.click(); } catch (e) { err = String(e).slice(0, 120); }
      out.push({ i, txt: (btn.textContent || '').trim().slice(0, 30), err, id: btn.id || null, onclick: btn.getAttribute('onclick') || null });
    });
    return out.filter(x => x.err);
  }, id);
  if (info.length) console.log('DEAD/ERR', id, JSON.stringify(info));
}
console.log('CLICK_ERRORS', JSON.stringify(await p.evaluate(() => window.__clickErrs || [])));

console.log('PAGE_ERRORS', JSON.stringify(errs.slice(0, 20)));
await b.close();
server.close();
