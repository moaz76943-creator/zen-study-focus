'use strict';
/* DF4-001/004: source-level regression guards; NOT Android/WebView visual QA. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../');
const web=path.join(root,'android/app/src/main/assets/web');
const app=fs.readFileSync(path.join(web,'app.js'),'utf8');
const css=fs.readFileSync(path.join(web,'design_recovery/white_premium_recovery10.css'),'utf8');

function renderIsolated(lang,cat){
  const begin=app.indexOf('function renderSoundsStudio() {');
  const end=app.indexOf('/* ========================================================',begin);
  assert.ok(begin>=0 && end>begin,'real nature renderer must be located');
  const functionBody=app.slice(begin,end);
  const nodes=[];
  const container={innerHTML:'',appendChild(el){nodes.push(el)}};
  const document={
    getElementById:id=>id==='soundsGridBox'?container:null,
    createElement:tag=>({tagName:tag.toUpperCase(),attributes:{},setAttribute(k,v){this.attributes[k]=v},textContent:'',innerHTML:''})
  };
  const catalog=[{id:'forest',cat:'forest',cls:'sbg-forest',vol:.65,src:'sounds/forest.ogg'},
    {id:'wind',cat:'forest',cls:'sbg-wind',vol:.55,src:'sounds/wind.ogg'},
    {id:'earth',cat:'warm',cls:'sbg-earth',vol:.5,src:'sounds/earth.ogg'}];
  const localesMatch=app.match(/const NATURE_EMPTY_MESSAGES = Object\.freeze\(([\s\S]*?)\);/);
  assert.ok(localesMatch,'real renderer must have a localized safe empty state');
  const messages=Function('return ('+localesMatch[1]+')')();
  const volumesMatch=app.match(/const NATURE_VOLUME_LABELS = Object\.freeze\(([\s\S]*?)\);/);
  assert.ok(volumesMatch,'localized nature volume labels must exist');
  const volumes=Function('return ('+volumesMatch[1]+')')();
  const render=Function('document','SOUNDS_DATA','NATURE_APPROVED_FOR_PLAYBACK','soundCat','L','activePlayers','cfg','NATURE_EMPTY_MESSAGES','NATURE_VOLUME_LABELS',
    'escapeHtmlText','toWest','toggleSoundTile','setTileVolume',
    functionBody+';return renderSoundsStudio;')(document,catalog,new Set(['forest','wind']),cat,
      ()=>({sounds:{forest:'Forest',wind:'Wind'}}),{},{lang},messages,volumes,s=>s,s=>s,()=>{},()=>{});
  render();
  return {nodes,messages,volumes};
}
test('unapproved warm category shows a translated, accessible empty state instead of a blank screen',()=>{
  for(const lang of ['ar','en','de','fa','ur']){
    const {nodes,messages}=renderIsolated(lang,'warm');
    assert.equal(nodes.length,1);
    assert.equal(nodes[0].tagName,'P');
    assert.equal(nodes[0].attributes.role,'status');
    assert.equal(nodes[0].className,'sounds-empty-state');
    assert.equal(nodes[0].textContent,messages[lang]);
    assert.ok(nodes[0].textContent.length>15);
  }
});
test('no missing or unapproved recording is silently activated',()=>{
  const {nodes}=renderIsolated('en','all');
  assert.equal(nodes.length,2);
  assert.ok(nodes.every(x=>x.className.includes('sound-Rich-tile')));
});
test('nature volume labels and slider accessibility are translated with the selected locale',()=>{
  for(const lang of ['ar','en','de','fr','es','ja','fa','ur']){
    const {nodes,volumes}=renderIsolated(lang,'forest');
    assert.equal(nodes.length,2);
    assert.ok(typeof volumes[lang]==='string'&&volumes[lang].length>0);
    assert.ok(nodes[0].innerHTML.includes(volumes[lang]));
    assert.ok(nodes[0].innerHTML.includes('aria-label="'+volumes[lang]+': Forest"'));
  }
});
test('unapproved-category empty state spans the grid and remains readable at narrow widths',()=>{
  assert.match(css,/\.sounds-empty-state\s*\{[^}]*grid-column\s*:\s*1\s*\/\s*-1/s);
  assert.match(css,/\.sounds-empty-state\s*\{[^}]*overflow-wrap\s*:\s*anywhere/s);
});
test('nature feedback styles are locally bundled with opt-in White Premium, no remote dependencies',()=>{
  const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
  assert.match(html,/href="design_recovery\/white_premium_recovery10\.css"/);
  assert.doesNotMatch(css,/@import\s+url\(\s*['"]?https?:/i);
});
