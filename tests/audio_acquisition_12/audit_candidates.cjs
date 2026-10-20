'use strict';
// Recovery-12: forensic read-only candidate gate; never flips approval or changes audio.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'audio_candidates/recovery12');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const hex=/^[a-f0-9]{64}$/i;
function sniff(b) {
 if(!b||!b.length)return 'EMPTY';
 const h=b.subarray(0,512).toString('utf8').trimStart();
 if(/^(<!doctype html|<html|<\?xml|\{\s*"(?:error|message)")/i.test(h))return 'HTML_OR_ERROR';
 return b.length>=27&&b.subarray(0,4).toString('latin1')==='OggS'?'OGG':'INVALID';
}
function provenance(a) {
 const issues=[];
 if(a.filename!==a.id+'.ogg'||!/^[a-z0-9_]+\.ogg$/.test(a.filename||''))issues.push('INVALID_NAME');
 if(!a.credited_author||!a.source_page||!a.upstream_ledger||!a.upstream_credits||!a.git_blob_sha1)issues.push('SOURCE_INCOMPLETE');
 if(!hex.test(a.sha256||''))issues.push('SHA256_MISSING');
 if(a.license_claim!=='CC0-1.0'||a.license_url!=='https://creativecommons.org/publicdomain/zero/1.0/')issues.push('LICENSE_NOT_ACCEPTED');
 if(!a.independently_verified_original_page)issues.push('LICENSE_PAGE_UNVERIFIED');
 if(!hex.test(a.original_sha256||''))issues.push('ORIGINAL_SHA256_UNKNOWN');
 if(a.human_listening!=='PASS')issues.push('LISTENING_NOT_TESTED');
 if(a.android_decode!=='PASS')issues.push('ANDROID_WEBVIEW_NOT_TESTED');
 if(a.approved_for_runtime!==false)issues.push('UNAUTHORIZED_APPROVAL');
 return issues;
}
function calculate(pcm) {
 if(pcm.length<16000||pcm.length%4)return null;
 const samples=pcm.length/4;let max=0,energy=0,clipped=0,jumps=0,prev=0;
 for(let i=0;i<samples;i++){
  const n=pcm.readFloatLE(4*i);
  if(!Number.isFinite(n))return null;
  max=Math.max(max,Math.abs(n));energy+=n*n;
  if(Math.abs(n)>=0.999)clipped++;
  if(i&&Math.abs(n-prev)>0.6)jumps++;
  prev=n;
 }
 const db=(x)=>x>0?Number((20*Math.log10(x)).toFixed(2)):null;
 return {samples,peak_dbfs:db(max),rms_dbfs:db(Math.sqrt(energy/samples)),clipped_samples:clipped,
  sample_jumps_over_0_6:jumps,loop_edge_discontinuity:Number(Math.abs(pcm.readFloatLE(0)-prev).toFixed(6))};
}
function inspect(a,options={}) {
 const issues=provenance(a),integrity=[],warnings=[];
 if(!/^[a-z0-9_]+\.ogg$/.test(a.filename||''))return {id:a.id,issues,integrity:['INVALID_FILENAME']};
 const fn=path.join(folder,a.filename);
 if(!fs.existsSync(fn))return {id:a.id,issues,integrity:['MISSING']};
 const b=fs.readFileSync(fn),hash=crypto.createHash('sha256').update(b).digest('hex'),kind=sniff(b);
 if(kind!=='OGG')integrity.push('INVALID_AUDIO_HEADER_'+kind);
 if(b.length<4096)integrity.push('TOO_SMALL');
 if(hash!==a.sha256)integrity.push('SHA256_MISMATCH');
 let probe=null,signal=null;
 if(options.decode!==false&&kind==='OGG') {
  const p=cp.spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,sample_rate,channels','-of','json',fn],{encoding:'utf8',timeout:15000});
  if(p.error||p.status!==0)integrity.push('FFPROBE_FAILED');
  else try {
   probe=JSON.parse(p.stdout);
   const aud=(probe.streams||[]).find(s=>s.codec_type==='audio');
   if(!aud||!['vorbis','opus'].includes(aud.codec_name))integrity.push('UNSUPPORTED_CODEC');
   if(!aud||!Number(aud.sample_rate)||!Number(aud.channels))integrity.push('BAD_AUDIO_PARAMETERS');
   if(!(Number(probe.format?.duration)>=5))integrity.push('DURATION_UNDER_5_SECONDS');
  }catch(_){integrity.push('PROBE_BAD_JSON');}
  const q=cp.spawnSync('ffmpeg',['-nostdin','-v','error','-i',fn,'-map','0:a:0','-ac','1','-ar','16000','-f','f32le','pipe:1'],{timeout:30000,maxBuffer:8000000});
  if(q.error||q.status!==0)integrity.push('FULL_DECODE_FAILED');
  else {
   signal=calculate(q.stdout);
   if(!signal)integrity.push('INVALID_PCM');
   else {
    if(signal.clipped_samples)warnings.push('CLIPPING_REVIEW');
    if(signal.sample_jumps_over_0_6)warnings.push('IMPULSIVE_TRANSIENTS_REVIEW');
    if(signal.loop_edge_discontinuity>0.1)warnings.push('LOOP_EDGE_CLICK_REVIEW');
    if(signal.peak_dbfs!==null&&signal.peak_dbfs>-1)warnings.push('HIGH_PEAK_REVIEW');
   }
  }
 }
 return {id:a.id,bytes:b.length,sha256:hash,header:kind,probe,signal,issues,integrity,warnings,
  integrity_pass:integrity.length===0,
  release_ready:issues.length===0&&integrity.length===0&&a.approved_for_runtime===true};
}
function audit(options={}) {
 const ids=new Set(),out=[];
 for(const a of manifest.files){
  const r=inspect(a,options);
  if(ids.has(a.id))r.integrity.push('DUPLICATE_ID');
  ids.add(a.id);out.push(r);
 }
 return {base_sha:manifest.origin_head,mode:'QUARANTINE_NOT_ACTIVATED',entries:out,
  integrity_ok:out.every(r=>r.integrity.length===0),release_ok:out.every(r=>r.release_ready)};
}
if(require.main===module){
 const result=audit({decode:true}),s=JSON.stringify(result,null,2)+'\n';
 fs.writeFileSync(path.join(folder,'qa_report.json'),s);process.stdout.write(s);
 if(process.argv.includes('--integrity')&&!result.integrity_ok)process.exitCode=1;
 if(process.argv.includes('--release')&&!result.release_ok)process.exitCode=1;
}
module.exports={sniff,provenance,calculate,inspect,audit};