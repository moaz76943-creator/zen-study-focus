#!/usr/bin/env node
'use strict';
/* Deterministic, source-controlled, single-file developer dashboard bundle.
 * CSS/JS are pinned through SHA-256 CSP hashes. No repo write permissions or embedded tokens. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const HTML='docs/control-center/index.html';
const DIR='docs/control-center';
const SCRIPTS=['control-center.js','studio-core.js','studio.js','v3-core.js','v3-ui.js'];
const STYLES=['control-center.css','v3.css'];
const sha=x=>"'sha256-"+crypto.createHash('sha256').update(x,'utf8').digest('base64')+"'";
function read(root,file){
  const contents=fs.readFileSync(path.join(root,file),'utf8');
  if(!contents)throw Error('Empty source '+file);
  return contents;
}
function buildPortable(root=ROOT,overrideHTML){
  const raw=overrideHTML===undefined?read(root,HTML):String(overrideHTML);
  if(raw.length<1000)throw Error('Missing dashboard HTML');
  let html=raw;
  if(/<script\b[^>]*>(?![\s]*<\/script>)/i.test(''))throw Error('unreachable');
  const scripts=[...raw.matchAll(/<script\b[^>]*>/gi)];
  if(scripts.length!==SCRIPTS.length||/<script\b(?![^>]*\bsrc=["']\.\/[^"']+["'])/i.test(raw))
    throw Error('HTML may only reference the five known local scripts');
  const sheets=[...raw.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/gi)];
  if(sheets.length!==STYLES.length)throw Error('Unknown stylesheet added to the dashboard');
  const styleBlocks=[];
  for(const name of STYLES){
    const original='<link rel="stylesheet" href="./'+name+'">';
    if(!html.includes(original)||html.split(original).length!==2)
      throw Error('Missing/duplicated stylesheet '+name);
    const css=read(root,DIR+'/'+name);
    if(/<\/style|@import\b/i.test(css))throw Error('Untrusted CSS embedding boundary: '+name);
    html=html.replace(original,'<style data-bundle="'+name+'">'+css+'</style>');
    styleBlocks.push(css);
  }
  const scriptBlocks=[];
  for(const name of SCRIPTS){
    const original='<script src="./'+name+'" defer></script>';
    if(!html.includes(original)||html.split(original).length!==2)
      throw Error('Missing/duplicated local script '+name);
    const js=read(root,DIR+'/'+name);
    if(/<\/script/i.test(js))throw Error('Untrusted JS embedding boundary: '+name);
    html=html.replace(original,'');
    scriptBlocks.push('<script data-bundle="'+name+'">'+js+'</script>');
  }
  if(/<script\b/i.test(html))throw Error('Unsupported extra script source or inline executable HTML');
  if(/<link\b[^>]*\brel=["']stylesheet["']/i.test(html))
    throw Error('Unbundled stylesheet reference');
  const design=require(path.join(root,DIR,'studio-core.js')).validateConfig(
    JSON.parse(read(root,DIR+'/design-config.json')));
  const json=JSON.stringify(design);
  if(/<\/script/i.test(json))throw Error('Unsafe design JSON');
  const jsonTag='<script id="control-center-embedded-design" type="application/json">'+json+'</script>';
  const hashTokens=scriptBlocks.map(x=>sha(x.slice(x.indexOf('>')+1,-'</script>'.length)));
  const styleHashes=styleBlocks.map(sha);
  const csp=[
    "default-src 'none'",
    'script-src '+hashTokens.join(' '),
    'style-src '+styleHashes.join(' '),
    "connect-src https://api.github.com https://raw.githubusercontent.com",
    "img-src data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');
  const cspMeta=/<meta http-equiv="Content-Security-Policy" content="[^"]+">/;
  if(!cspMeta.test(html))throw Error('Original CSP meta not found');
  html=html.replace(cspMeta,'<meta http-equiv="Content-Security-Policy" content="'+csp+'">');
  if(!html.includes('</head>')||!html.includes('</body>'))throw Error('Invalid HTML structure');
  html=html.replace('</head>','  '+jsonTag+'\n</head>');
  html=html.replace('</body>','\n  '+scriptBlocks.join('\n  ')+'\n</body>');
  return html;
}
function main(argv){
  if(argv.length!==2||!['--output','--check'].includes(argv[0]))throw Error('Usage: node tools/control_center/build_portable.cjs --output PATH | --check PATH');
  const target=path.resolve(ROOT,argv[1]);
  if(!target.startsWith(ROOT+path.sep))throw Error('Output must remain inside repository');
  const html=buildPortable(ROOT);
  if(argv[0]==='--check'){
    if(fs.readFileSync(target,'utf8')!==html)throw Error('Portable bundle is stale. Regenerate and review.');
    process.stdout.write('PASS: portable dashboard matches source modules\n');
  } else {
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,html,'utf8');
    process.stdout.write('Built safe single-file dashboard: '+path.relative(ROOT,target)+'\n');
  }
}
if(require.main===module){
  try{main(process.argv.slice(2));}
  catch(e){console.error('Portable build failed:',e.message);process.exitCode=1;}
}
module.exports={buildPortable};
