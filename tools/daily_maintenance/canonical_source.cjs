'use strict';
// Source-only canonical candidate verification; never deploys, writes app data or merges.
const SHA=/^[a-f0-9]{40}$/i;
const CANONICAL_PR=138;
const CANONICAL_REF='integration/master-recovery-20261021';
function verifyCanonicalPr(pr,repo,ref,checkedSha){
 if(!pr||pr.number!==CANONICAL_PR)throw Error('Missing canonical PR #138');
 if(pr.state!=='open')throw Error('Canonical PR is not open');
 if(ref!==CANONICAL_REF||pr.head?.ref!==ref)throw Error('Canonical PR branch/ref mismatch');
 if(!repo||pr.head?.repo?.full_name!==repo)throw Error('Canonical PR head repository mismatch');
 if(!SHA.test(pr.head?.sha||''))throw Error('Canonical PR SHA invalid');
 if(checkedSha!==undefined&&checkedSha!==pr.head.sha)throw Error('Canonical PR head advanced: checked source SHA mismatch');
 return pr.head.sha;
}
module.exports={CANONICAL_PR,CANONICAL_REF,verifyCanonicalPr};
