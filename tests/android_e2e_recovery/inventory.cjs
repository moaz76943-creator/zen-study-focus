'use strict';
/* Read-only source inventory. Static discovery ≠ Android interaction verification. */
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../android/app/src/main/assets/web');
const HTML = path.join(ROOT, 'index.html');
const EVENTS = ['click','change','input','submit','keydown','touchstart','pointerdown'];
const TAGS = /<(button|a|input|select|textarea|summary|details|div|span|article|label)\b([^>]*)>/gim;
function attr(tag, key) {
  const m = [...tag.matchAll(/([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gim)]
    .find(x => x[1].toLowerCase() === key.toLowerCase());
  return m ? (m[2] ?? m[3] ?? '') : '';
}
function ownerAt(html, index) {
  const prefix = html.slice(0, index);
  const sections = [...prefix.matchAll(/<main\b[^>]*\bid=["']([^"']+)["']/gim)];
  const modals = [...prefix.matchAll(/<div\b[^>]*\bclass=["'][^"']*\bmodal-overlay\b[^"']*["'][^>]*\bid=["']([^"']+)["']/gim)];
  const latestSection = sections.at(-1);
  const latestModal = modals.at(-1);
  // This owner is an approximate source location, not a DOM ancestry proof.
  if (latestModal && (!latestSection || latestModal.index > latestSection.index)) return latestModal[1];
  return latestSection ? latestSection[1] : 'shell';
}
function expected(handler, tag) {
  const h = (handler || '').toLowerCase();
  if (/switchtab|openquicktrainingfromnav/.test(h)) return 'navigate and render selected section';
  if (/open.*modal|openlanguage|opennote/.test(h)) return 'dialog opens and receives accessible focus';
  if (/closemodal|nscloseeditor/.test(h)) return 'dialog closes without unintended data mutation';
  if (/save|create|addquickexercise/.test(h)) return 'mutated data persists after process restart';
  if (/delete|remove/.test(h)) return 'confirmation/undo protects data';
  if (/copy|export|download|share/.test(h)) return 'Android clipboard or document/share outcome confirmed';
  if (/toggle|start|stop|play|pause|skip|reset|selecttimermode/.test(h)) return 'actual state/audio/timer outcome visible';
  if (/filter|search|sort|change/.test(h)) return 'visible list/chart updates correctly';
  if (tag === 'input' || tag === 'textarea') return 'typed text retained and accessible';
  return 'REVIEW: specify observable postcondition';
}
function inventory(html, scripts = {}) {
  const controls = [];
  for (const m of html.matchAll(TAGS)) {
    const tag = m[1].toLowerCase(), source = m[0], at = m.index;
    const handlers = EVENTS.map(e=>[e, attr(source,'on'+e)]).filter(x=>x[1]);
    const clickable = tag === 'button' || tag === 'a' ||
      attr(source,'role') === 'button' || handlers.some(([e])=>e==='click');
    const input = ['input','textarea','select'].includes(tag);
    if (!clickable && !input && !handlers.length) continue;
    const id = attr(source,'id'), label = attr(source,'aria-label') ||
      attr(source,'title') || attr(source,'placeholder') || attr(source,'data-i18n') ||
      attr(source,'data-qt') || '';
    const line = html.slice(0, at).split('\n').length;
    const handler = handlers.map(([e,h])=>e+':'+h).join('; ');
    controls.push({source:'index.html',line,tag,id:id||null,owner:ownerAt(html,at),
      accessibleHint:label||null,handlers,expected:expected(handler,tag),
      androidStatus:'NOT_TESTED',testIds:[]});
  }
  const dynamic = [];
  for (const [file, content] of Object.entries(scripts)) {
    for (const m of content.matchAll(/\baddEventListener\s*\(\s*['"](click|submit|change|input|keydown)['"]/g)) {
      const line=content.slice(0,m.index).split('\n').length;
      dynamic.push({source:file,line,event:m[1],expected:'REVIEW: dynamic event requires real Android dispatch',
        androidStatus:'NOT_TESTED',testIds:[]});
    }
  }
  return {controls,dynamic};
}
function readAll(root=ROOT) {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts={};
  const missing=[];
  for(const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gim)){
    const filename=m[1], disk=path.resolve(root,filename);
    if(!disk.startsWith(root+path.sep) || !fs.existsSync(disk)){
      missing.push(filename);continue;
    }
    scripts[filename]=fs.readFileSync(disk,'utf8');
  }
  return {html,scripts,missing};
}
function build(root=ROOT) {
  const src=readAll(root), scan=inventory(src.html,src.scripts);
  const groups={};
  for(const x of scan.controls)groups[x.owner]=(groups[x.owner]||0)+1;
  const report={suite:'DEEP-FOCUS-RECOVERY-14',kind:'STATIC_SOURCE_INVENTORY',
    androidE2EPassed:0,androidE2EStatus:'NOT_TESTED',sourceRoot:'android/app/src/main/assets/web',
    totals:{staticControls:scan.controls.length,dynamicEventListeners:scan.dynamic.length,
      referencedScripts:Object.keys(src.scripts).length,missingScripts:src.missing.length},
    groups,missingScripts:src.missing,...scan};
  return report;
}
if (require.main === module) {
  const data=build();
  process.stdout.write(JSON.stringify(data,null,2)+'\n');
  if(data.missingScripts.length)process.exitCode=1;
}
module.exports={attr,ownerAt,expected,inventory,readAll,build};
