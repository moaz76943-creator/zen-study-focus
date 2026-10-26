'use strict';
// Current v21 startup/offline contract, adapted from historical performance PR #29.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {auditStartup}=require('./startup_assets.cjs');
const web=path.resolve(__dirname,'../../android/app/src/main/assets/web');

test('current offline startup has real packaged JS and CSS; no network dependencies',()=>{
  const report=auditStartup(web);
  assert.ok(report.scripts>=20,'expected actual local app startup scripts');
  assert.ok(report.styles>=3,'expected actual local stylesheets');
  assert.deepEqual(report.remote,[]);
  assert.deepEqual(report.unsafe,[]);
  assert.deepEqual(report.missing,[]);
});

test('offline audit reports missing files, external resources and traversal without fetching them',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-offline-audit-'));
  try {
    fs.writeFileSync(path.join(tmp,'ok.js'),'/*local*/');
    fs.writeFileSync(path.join(tmp,'index.html'),
      '<script src="ok.js?v=1"></script>'+
      '<script src="https://cdn.example.org/app.js"></script>'+
      '<script src="../outside.js"></script>'+
      '<script src="missing.js"></script>'+
      '<link rel="stylesheet" href="//cdn.example.org/style.css">');
    const r=auditStartup(tmp);
    assert.equal(r.scripts,4);
    assert.equal(r.styles,1);
    assert.deepEqual(r.missing,['missing.js']);
    assert.deepEqual(r.unsafe,['../outside.js']);
    assert.deepEqual(r.remote,['https://cdn.example.org/app.js','//cdn.example.org/style.css']);
  } finally {fs.rmSync(tmp,{force:true,recursive:true});}
});

test('directories never pass as packaged startup files',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-offline-dir-'));
  try {
    fs.mkdirSync(path.join(tmp,'js'));
    fs.writeFileSync(path.join(tmp,'index.html'),'<script src="js"></script>');
    assert.deepEqual(auditStartup(tmp).missing,['js']);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});


test('inline styles and recursive local CSS imports audit every fetched URL',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-offline-css-'));
  try{
    for(const name of ['styles','shared','images'])fs.mkdirSync(path.join(tmp,name));
    fs.writeFileSync(path.join(tmp,'images','bg.png'),'fixture');
    fs.writeFileSync(path.join(tmp,'index.html'),
      '<style>.hero{background:url("images/bg.png")}.bad{background:url(https://cdn.example.test/hero.jpg)}</style>'+
      '<link rel="stylesheet" href="styles/main.css">');
    fs.writeFileSync(path.join(tmp,'styles','main.css'),
      '@import "../shared/colors.css";@import url("https://fonts.example.test/font.css");'+
      '.absent{background:url("./missing.woff2")}'+
      '.safe{background:url(data:image/png;base64,AAAA)}');
    fs.writeFileSync(path.join(tmp,'shared','colors.css'),
      '.escape{background:url("../../outside.svg")} .gradient{fill:url(#gradient)}');
    const result=auditStartup(tmp);
    assert.equal(result.styles,1);
    assert.deepEqual(result.remote,
      ['https://cdn.example.test/hero.jpg','https://fonts.example.test/font.css']);
    assert.deepEqual(result.missing,['styles/missing.woff2']);
    assert.deepEqual(result.unsafe,['../../outside.svg']);
    for(const asset of ['images/bg.png','styles/main.css','shared/colors.css'])
      assert.ok(result.local.includes(asset),'Expected bundled asset '+asset);
  }finally{fs.rmSync(tmp,{force:true,recursive:true});}
});

test('relative CSS assets inside package are accepted, fragment and data URLs need no file',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'df-offline-css-valid-'));
  try{
    fs.mkdirSync(path.join(tmp,'css'));
    fs.mkdirSync(path.join(tmp,'assets'));
    fs.writeFileSync(path.join(tmp,'assets','icon.svg'),'<svg></svg>');
    fs.writeFileSync(path.join(tmp,'index.html'),
      '<link rel="stylesheet" href="css/main.css?version=1">');
    fs.writeFileSync(path.join(tmp,'css','main.css'),
      '@import "../other.css";.a{mask:url("../assets/icon.svg#glyph")}');
    fs.writeFileSync(path.join(tmp,'other.css'),
      '.b{background:url(data:image/png;base64,AAAA)}.c{fill:url(#local)}');
    const result=auditStartup(tmp);
    assert.deepEqual(result.remote,[]);
    assert.deepEqual(result.missing,[]);
    assert.deepEqual(result.unsafe,[]);
    assert.ok(result.local.includes('assets/icon.svg'));
    assert.ok(result.local.includes('other.css'));
  }finally{fs.rmSync(tmp,{force:true,recursive:true});}
});
