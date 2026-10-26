'use strict';
// DF-PARALLEL-08: source-metadata checks. This is NOT media-byte/licence certification.
const test=require('node:test');
const assert=require('node:assert/strict');
const manifest=require('../../tools/nature_audio/commons_intake.json');

test('20 requested slots remain separate from 14 replacement candidates',()=>{
  assert.equal(manifest.required_slots.length,20);
  assert.equal(manifest.items.length,20);
  assert.equal(manifest.replacement_candidates.length,14);
  assert.equal(manifest.sources_verified_for_distribution,false);
  assert.equal(new Set(manifest.required_slots.map(x=>x.slot_id)).size,20);
  const entries=[...manifest.items,...manifest.replacement_candidates];
  assert.equal(new Set(entries.map(x=>x.id)).size,entries.length);
  for(const slot of manifest.required_slots) {
    const id=slot.replacement_candidate_id||slot.candidate_id;
    assert.ok(id,'missing selected original for '+slot.slot_id);
    const entry=entries.find(x=>x.id===id);
    assert.ok(entry,'unknown recording for '+slot.slot_id);
  }
});
test('every candidate is quarantined and cannot silently become approved',()=>{
  for(const item of [...manifest.items,...manifest.replacement_candidates]) {
    assert.equal(item.approved_for_runtime,false,item.id);
    assert.equal(item.ready,false,item.id);
    assert.equal(item.human_audio_review,'NOT_TESTED',item.id);
    assert.equal(item.status,'QUARANTINED_NOT_APPROVED',item.id);
    assert.equal(item.synthetic,false,item.id);
    assert.equal(item.contains_music,false,item.id);
    assert.match(item.source_sha256,/^[a-f0-9]{64}$/,item.id);
    assert.match(item.license_evidence,/^https:\/\//,item.id);
    assert.ok(['CC0-1.0','PD-author'].includes(item.license),item.id);
  }
});
test('requested slots never reuse the same selected source digest',()=>{
  const entries=[...manifest.items,...manifest.replacement_candidates];
  const digests=manifest.required_slots.map(slot=>{
    const id=slot.replacement_candidate_id||slot.candidate_id;
    return entries.find(entry=>entry.id===id).source_sha256;
  });
  assert.equal(new Set(digests).size,20);
});
