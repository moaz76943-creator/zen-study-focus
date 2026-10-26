#!/usr/bin/env node
'use strict';
// Real Chromium mobile geometry check; font scaling is browser emulation, NOT Android WebView/TalkBack.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  let chromium;
  try { ({chromium} = require('playwright')); }
  catch (_) { console.error('NOT_TESTED: Playwright is not installed'); process.exitCode = 2; return; }
  const opts = {headless:true, args:['--allow-file-access-from-files']};
  if (process.env.DF_CHROMIUM_BIN) opts.executablePath = process.env.DF_CHROMIUM_BIN;
  const browser = await chromium.launch(opts);
  const file = path.resolve(__dirname, '../android/app/src/main/assets/web/index.html');
  const url = pathToFileURL(file).href;
  const output = process.env.DF09_EVIDENCE || fs.mkdtempSync(path.join(os.tmpdir(), 'df09-mobile-'));
  fs.mkdirSync(output, {recursive:true});
  const rows = [], failures = [];
  try {
    for (const width of [320,360,393,430]) {
      for (const dir of ['ltr','rtl']) {
        for (const zoom of [100,150,200]) {
          const context = await browser.newContext({ viewport: {width,height:800}, deviceScaleFactor:1 });
          const page = await context.newPage();
          await page.route(/^https?:\/\//, r=>r.abort());
          try {
            await page.goto(url, {waitUntil:'load'});
            const detail = await page.evaluate(({dir,zoom})=>{
              document.documentElement.dir = dir;
              document.documentElement.lang = dir === 'rtl' ? 'ar' : 'en';
              document.documentElement.style.fontSize = zoom + '%';
              document.body.classList.add('timer-home','df-v22');
              const digits = document.getElementById('timerDigitsTxt');
              if (digits) digits.textContent = '09:59:59';
              const nav = document.querySelector('.bottom-nav-capsule');
              const buttons = [...nav.querySelectorAll('.bnav-btn')];
              const container = document.querySelector('.focus-hero-card .ring-center');
              const rDigits = digits.getBoundingClientRect();
              const rCenter = container.getBoundingClientRect();
              const rNav = nav.getBoundingClientRect();
              const navBoxes = buttons.map(b=>b.getBoundingClientRect());
              const active = nav.querySelector('.bnav-btn.active > span');
              const activeBox = active.getBoundingClientRect();
              const chips = [...document.querySelectorAll('.focus-hero-card .time-delta-row .delta-chip')];
              const chipBoxes = chips.map(el=>el.getBoundingClientRect());
              const hero = document.querySelector('.focus-hero-card').getBoundingClientRect();
              const goodBox = b=>b.width>0 && b.left>=-1 && b.right<=innerWidth+1;
              const out = [];
              if (buttons.length !== 7) out.push('seven-tab-count');
              if (buttons[3]?.id !== 'navTimer' || buttons[4]?.id !== 'navTraining') out.push('tab-order');
              if (!navBoxes.every(goodBox)) out.push('navigation-width');
              if (!navBoxes.every(b=>b.height>=43.5 && b.width>=40)) out.push('navigation-hit-target');
              if (!active || activeBox.width<80 || activeBox.left<rNav.left-1 || activeBox.right>rNav.right+1) out.push('active-caption');
              if (rDigits.left<rCenter.left-1 || rDigits.right>rCenter.right+1) out.push('timer-overflow');
              if (chipBoxes.length!==5 || !chipBoxes.every(b=>b.height>=43.5 && b.left>=hero.left-1 && b.right<=hero.right+1)) out.push('quick-duration-overflow');
              if (document.documentElement.scrollWidth>innerWidth+1) out.push('document-overflow');
              return {width:innerWidth,dir:getComputedStyle(document.documentElement).direction,zoom,
                tabs:buttons.length,activeCaptionWidth:activeBox.width,navWidth:rNav.width,
                timerWidth:rDigits.width,timerCenterWidth:rCenter.width,
                minChipHeight:Math.min(...chipBoxes.map(b=>b.height)),
                scrollWidth:document.documentElement.scrollWidth,issues:out};
            },{dir,zoom});
            rows.push(detail);
            if (detail.issues.length || detail.dir!==dir) failures.push(detail);
            await page.screenshot({path:path.join(output,`${width}-${dir}-${zoom}.png`),fullPage:true});
          } catch (error) { failures.push({width,dir,zoom,error:String(error)}); }
          finally { await context.close(); }
        }
      }
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(output,'matrix.json'),JSON.stringify({rows,failures},null,2));
  console.log('DF09 Chromium matrix:',rows.length,'/24 cases; FAIL:',failures.length,'; artifacts:',output);
  if(failures.length) {console.error(JSON.stringify(failures.slice(0,12),null,2));process.exitCode=1;}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
