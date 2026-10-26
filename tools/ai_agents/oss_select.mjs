import {writeFileSync,appendFileSync} from 'node:fs';
import {eligibleForRole,ROLES,TARGET,buildAgentTask} from './oss_policy.mjs';
const role=process.env.AGENT_ROLE;
if(!ROLES[role]||process.env.GITHUB_REPOSITORY!=='moaz76943-creator/zen-study-focus')throw Error('Unrecognized role or repo');
const token=process.env.GH_TOKEN; if(!token)throw Error('Missing GitHub token');
async function api(path){
 const resp=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+path,{signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
 if(!resp.ok)throw Error('GitHub returned '+resp.status);
 return resp.json();
}
const requested=(process.env.REQUESTED_ISSUE||'').trim();
if(requested&&!/^[1-9][0-9]{0,6}$/.test(requested))throw Error('Invalid issue ID');
const issues=requested?[await api('/issues/'+requested)]:await api('/issues?state=open&labels=agent-ready%2Cagent-safe&per_page=100&sort=created&direction=asc');
let chosen=null,branch='';
for(const i of issues){
 if(!eligibleForRole(i,role))continue;
 const b='agent-oss/'+role+'/issue-'+i.number;
 const v=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/git/ref/heads/'+b,{signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'}});
 if(v.status!==404){if(!v.ok)throw Error('Cannot verify issue branch lock');continue;}
 chosen=i;branch=b;break;
}
if(!process.env.GITHUB_OUTPUT||!process.env.RUNNER_TEMP)throw Error('Missing runner paths');
if(!chosen){
 appendFileSync(process.env.GITHUB_OUTPUT,'ready=false\n');
 console.log(role+': no eligible unlocked issue');
}else{
 const task=buildAgentTask(role,chosen);
 writeFileSync(process.env.RUNNER_TEMP+'/df-oss-task.txt',task,{mode:0o600});
 appendFileSync(process.env.GITHUB_OUTPUT,'ready=true\nnumber='+chosen.number+'\nbranch='+branch+'\ntest='+ROLES[role].test+'\n');
 console.log(role+': selected issue #'+chosen.number+' target '+TARGET);
}
