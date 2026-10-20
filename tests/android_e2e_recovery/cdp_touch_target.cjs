'use strict';
// Strict input geometry and test dependencies for disposable Android/CDP E2E.
// A positive element width is NOT proof it can receive a physical touch.
function validateTouchTarget(info){
 if(!info?.present)throw new Error('UI_TARGET_MISSING: '+String(info?.selector||'unknown'));
 const {width,height,x,y,viewportWidth,viewportHeight}=info;
 if(![width,height,x,y,viewportWidth,viewportHeight].every(Number.isFinite)||
    viewportWidth<=0||viewportHeight<=0)throw new Error('UI_INVALID_GEOMETRY: '+String(info.selector||'unknown'));
 if(width<=0||height<=0)throw new Error('UI_ZERO_SIZE: '+String(info.selector||'unknown'));
 if(x<0||y<0||x>=viewportWidth||y>=viewportHeight)
   throw new Error('UI_TARGET_OUTSIDE_VIEWPORT: '+String(info.selector||'unknown')+
     ' center='+x+','+y+' viewport='+viewportWidth+'x'+viewportHeight);
 if(info.hitWithin!==true)
   throw new Error('UI_TARGET_OCCLUDED: '+String(info.selector||'unknown')+
     ' intercepted by '+String(info.hit||'unknown'));
 return {x,y};
}
function missingPrerequisites(results,required){
 if(!(results instanceof Map)||!Array.isArray(required))throw new TypeError('Expected test results Map and required case IDs');
 return required.filter(id=>results.get(id)?.status!=='PASS');
}
function classifyFailure(error){
 const message=String(error?.message||error);
 if(message.startsWith('DEPENDENCY_NOT_TESTED:'))return 'BLOCKED';
 if(/^(TRANSPORT:|TEST_PROTOCOL:)/.test(message))return 'FAIL_TEST_TRANSPORT';
 if(error?.code==='ERR_ASSERTION'||/^(UI_|APP_RUNTIME:)/.test(message))return 'FAIL_APP';
 return 'FAIL_TEST_INFRA';
}
function selectCases(value,known){
 if(!value||!value.trim())return null;
 const ids=value.split(',').map(x=>x.trim());
 if(ids.some(id=>!known.includes(id)))throw new Error('Unknown Android case selection');
 if(new Set(ids).size!==ids.length)throw new Error('Duplicate Android case selection');
 return new Set(ids);
}
module.exports={validateTouchTarget,missingPrerequisites,classifyFailure,selectCases};
