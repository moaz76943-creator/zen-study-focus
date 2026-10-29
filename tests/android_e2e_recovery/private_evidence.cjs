'use strict';
// Linux/Android QA evidence only. Pin directory operations to an open descriptor
// so a path replacement cannot redirect an artifact write into another folder.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const C=fs.constants;

function validateDirectory(directory,create){
 const absolute=path.resolve(directory),parts=absolute.split(path.sep).filter(Boolean);
 let current=path.parse(absolute).root;
 for(let index=0;index<parts.length;index++){
  current=path.join(current,parts[index]);
  let stat;
  try{stat=fs.lstatSync(current);}catch(error){
   if(error.code!=='ENOENT'||!create)throw error;
   fs.mkdirSync(current,{mode:0o700});stat=fs.lstatSync(current);
  }
  const leaf=index===parts.length-1;
  const owner=stat.uid===process.getuid();
  const stickyAncestor=!leaf&&(stat.mode&0o1000)!==0;
  if(!stat.isDirectory()||stat.isSymbolicLink()||
     (leaf?!owner:!owner&&stat.uid!==0)||((stat.mode&0o022)!==0&&!stickyAncestor))
   throw Error('Unsafe evidence directory');
 }
 return fs.lstatSync(absolute);
}

function createEvidenceDirectory(requested,prefix='df-qa-evidence-'){
 const directory=requested?path.resolve(requested):fs.mkdtempSync(path.join(os.tmpdir(),prefix));
 const initial=validateDirectory(directory,true);
 const descriptor=fs.openSync(directory,C.O_RDONLY|C.O_DIRECTORY|C.O_NOFOLLOW);
 const pinned=fs.fstatSync(descriptor);
 const anchor='/proc/self/fd/'+descriptor;
 const unchanged=()=>{
  const current=validateDirectory(directory,false);
  if(current.dev!==pinned.dev||current.ino!==pinned.ino)throw Error('Evidence directory changed');
 };
 try{
  if(initial.dev!==pinned.dev||initial.ino!==pinned.ino)throw Error('Evidence directory changed');
  fs.statSync(anchor); // Fail closed where Linux descriptor paths are unavailable.
  unchanged();
 }catch(error){fs.closeSync(descriptor);throw error;}
 function rejectUnsafeTarget(target){
  try{if(!fs.lstatSync(target).isFile())throw Error('Unsafe evidence output');}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 return {
  path:directory,
  close(){fs.closeSync(descriptor);},
  write(name,data){
   if(typeof name!=='string'||!name||name==='.'||name==='..'||path.basename(name)!==name||name.includes('\\'))
    throw Error('Unsafe evidence filename');
   unchanged();
   const target=path.join(anchor,name);
   rejectUnsafeTarget(target);
   const temporary=path.join(anchor,'.df-evidence-'+randomBytes(16).toString('hex'));
   let file;
   try{
    file=fs.openSync(temporary,C.O_WRONLY|C.O_CREAT|C.O_EXCL|C.O_NOFOLLOW,0o600);
    // writeSync accepts only an already-open descriptor. Keeping the path out
    // of this API also makes the pinned-directory guarantee explicit to SAST.
    const bytes=typeof data==='string'?Buffer.from(data,'utf8'):
     ArrayBuffer.isView(data)?Buffer.from(data.buffer,data.byteOffset,data.byteLength):null;
    if(!bytes)throw TypeError('Evidence data must be a string or byte view');
    for(let offset=0;offset<bytes.length;){
     const written=fs.writeSync(file,bytes,offset,bytes.length-offset,null);
     if(!Number.isInteger(written)||written<=0||written>bytes.length-offset)
      throw Error('Evidence write stalled');
     offset+=written;
    }
    fs.fsyncSync(file);fs.closeSync(file);file=undefined;
    unchanged();rejectUnsafeTarget(target);
    // rename replaces the directory entry, never follows a target symlink.
    fs.renameSync(temporary,target);
   }finally{
    if(file!==undefined)fs.closeSync(file);
    try{fs.unlinkSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}
   }
  }
 };
}

function createEvidenceReport(requested,defaultName,prefix){
 const directory=createEvidenceDirectory(requested?path.dirname(path.resolve(requested)):undefined,prefix);
 const name=requested?path.basename(requested):defaultName;
 return {path:path.join(directory.path,name),write:data=>directory.write(name,data),close:()=>directory.close()};
}

module.exports={createEvidenceDirectory,createEvidenceReport};
