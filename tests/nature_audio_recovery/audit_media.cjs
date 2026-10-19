/* Read-only release gate. Never upgrades any recording to 'verified'.
 * Usage: node tests/nature_audio_recovery/audit_media.cjs [repo-root]
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const MEDIA = 'android/app/src/main/assets/web/';
const SHA = /^[0-9a-f]{64}$/i;
function sniff(buffer) {
  if (!buffer?.length) return 'EMPTY';
  const head = buffer.subarray(0, Math.min(buffer.length,512)).toString('utf8').trimStart();
  if (/^<!doctype html|^<html|^<\?xml|^\{\s*"(?:error|message)"/i.test(head)) return 'HTML_OR_ERROR';
  return buffer.subarray(0,4).toString('latin1') === 'OggS' ? 'OGG' : 'NOT_OGG';
}
function auditClip(root, entry, probe = true) {
  const problems=[];
  const src=entry.src;
  if (!/^sounds\/[a-z0-9_.-]+\.ogg$|^nature_audio\/[a-z0-9_.-]+\.ogg$/i.test(src||'')) problems.push('UNSAFE_LOCAL_PATH');
  let file=null, bytes=null, sha256=null, format=null;
  if (!problems.length) {
    file=path.resolve(root,MEDIA,src);
    if (!fs.existsSync(file)) problems.push('MISSING');
    else {
      bytes=fs.readFileSync(file); format=sniff(bytes);
      if (format !== 'OGG') problems.push(format);
      sha256=crypto.createHash('sha256').update(bytes).digest('hex');
      if (probe && format==='OGG') {
        const p=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_name,sample_rate,channels','-of','json',file],{encoding:'utf8',timeout:15000});
        if (p.error || p.status!==0) problems.push('FFPROBE_DECODE_OR_TOOL_ERROR');
        else { try {const streams=JSON.parse(p.stdout).streams||[]; if (!streams.some(s=>['opus','vorbis'].includes(s.codec_name))) problems.push('UNSUPPORTED_CODEC');} catch (_) {problems.push('BAD_FFPROBE_DATA');} }
      }
    }
  }
  if (!entry.verified || !entry.packaged || !entry.recording) problems.push('NOT_APPROVED');
  if (!SHA.test(entry.original_sha256||'')) problems.push('MISSING_ORIGINAL_SHA256');
  if (!SHA.test(entry.converted_sha256||'')) problems.push('MISSING_CONVERTED_SHA256');
  if (sha256 && SHA.test(entry.converted_sha256||'') && sha256.toLowerCase()!==entry.converted_sha256.toLowerCase()) problems.push('SHA256_MISMATCH');
  if (!/^https:\/\//.test(entry.source_page||'') || !entry.author || !/^https:\/\/creativecommons.org\/publicdomain\/zero\/1\.0\/|^https:\/\/creativecommons.org\/licenses\/by\/(?:3\.0|4\.0)\/?/.test(entry.license_url||'')) problems.push('PROVENANCE_INCOMPLETE');
  if (entry.license_url?.includes('/by/') && !entry.attribution) problems.push('CC_BY_ATTRIBUTION_MISSING');
  return {id:entry.id,src,sha256,bytes:bytes?.length||0,format,status:problems.length?'BLOCKED':'CANDIDATE_DESKTOP_ONLY',problems};
}
function auditCatalog(root, manifest, probe=true) {
  if (!manifest?.assets || !Array.isArray(manifest.assets)) throw new Error('Bad manifest');
  const ids=new Set(),paths=new Set(), results=[];
  for(const asset of manifest.assets) {
    const r=auditClip(root,asset,probe);
    if(ids.has(asset.id)) r.problems.push('DUPLICATE_ID');
    if(paths.has(asset.src)) r.problems.push('DUPLICATE_PATH');
    if(r.problems.length) r.status='BLOCKED';
    ids.add(asset.id);paths.add(asset.src);results.push(r);
  }
  return {ok:results.every(r=>r.status==='CANDIDATE_DESKTOP_ONLY'),results};
}
if (require.main === module) {
  const root=path.resolve(process.argv[2]||path.resolve(__dirname,'../..'));
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'media_manifest.json'),'utf8'));
  const report=auditCatalog(root,manifest);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.ok?0:1;
}
module.exports={sniff,auditClip,auditCatalog};
