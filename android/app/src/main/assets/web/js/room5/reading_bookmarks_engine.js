/** Deep Focus Room5 B03 — pure offline reading bookmarks; no storage writes. */
'use strict';
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else if(root) root.DeepFocusReadingBookmarks=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const SCHEMA_VERSION=1;
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const record=value=>value!==null && typeof value==='object' && !Array.isArray(value);
  const result=(code,field)=>({ok:false,errors:[{code,field}]});
  const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(value);
  const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  const integer=value=>typeof value==='number'&&Number.isSafeInteger(value);
  const hash=seed=>{
    let value=0x811c9dc5;
    for(const ch of String(seed)){value^=ch.charCodeAt(0);value=Math.imul(value,0x01000193)>>>0;}
    return value.toString(16).padStart(8,'0');
  };
  function normalize(raw){
    if(!record(raw)) return null;
    const title=text(raw.title,120);
    const totalPages=raw.totalPages;
    if(!title||!integer(totalPages)||totalPages<1||totalPages>100000) return null;
    const currentPage=integer(raw.currentPage)?Math.max(0,Math.min(totalPages,raw.currentPage)):0;
    const id=validId(raw.id)?raw.id:'read_'+hash(title+'|'+totalPages);
    if(raw.bookmarks!==undefined&&!Array.isArray(raw.bookmarks))return null;
    const bookmarks=[];
    for(const entry of raw.bookmarks||[]){
      if(!record(entry)||!integer(entry.page)||entry.page<1||entry.page>totalPages)continue;
      const label=text(entry.label,100);
      if(!label)continue;
      const idx=bookmarks.findIndex(x=>x.page===entry.page);
      const next={id:'bm_'+hash(id+'|'+entry.page),page:entry.page,label};
      if(idx>=0) bookmarks[idx]=next;
      else if(bookmarks.length<500)bookmarks.push(next);
    }
    bookmarks.sort((a,b)=>a.page-b.page);
    return {schemaVersion:1,id,title,totalPages,currentPage,bookmarks};
  }
  function validateBook(raw){
    if(!record(raw)||raw.schemaVersion!==1)return result('INVALID_SCHEMA','schemaVersion');
    const normalized=normalize(raw);
    if(!normalized)return result('INVALID_BOOK','book');
    if(JSON.stringify(raw)!==JSON.stringify(normalized))return result('NON_CANONICAL_BOOK','book');
    return {ok:true,errors:[]};
  }
  function safeBook(raw){
    if(!record(raw)||raw.schemaVersion!==1)return null;
    return normalize(raw);
  }
  function createBook(spec){
    const book=normalize(spec);
    return book?{ok:true,book}:result('INVALID_SPEC','book');
  }
  function updateProgress(raw,page,opts={}){
    const book=safeBook(raw);
    if(!book)return result('INVALID_BOOK','book');
    if(!integer(page))return result('INVALID_PAGE','page');
    const bounded=Math.max(0,Math.min(book.totalPages,page));
    const currentPage=opts&&opts.allowRegression===true?bounded:Math.max(book.currentPage,bounded);
    return {ok:true,book:{...book,currentPage}};
  }
  function addBookmark(raw,marker){
    const book=safeBook(raw);
    if(!book)return result('INVALID_BOOK','book');
    if(!record(marker)||!integer(marker.page)||marker.page<1||marker.page>book.totalPages)return result('INVALID_PAGE','page');
    const label=text(marker.label,100);
    if(!label)return result('INVALID_LABEL','label');
    const existing=book.bookmarks.filter(x=>x.page!==marker.page);
    if(existing.length>=500)return result('BOOKMARK_LIMIT','bookmarks');
    existing.push({id:'bm_'+hash(book.id+'|'+marker.page),page:marker.page,label});
    existing.sort((a,b)=>a.page-b.page);
    return {ok:true,book:{...book,bookmarks:existing}};
  }
  function removeBookmark(raw,id){
    const book=safeBook(raw);
    if(!book)return result('INVALID_BOOK','book');
    if(!validId(id)||!book.bookmarks.some(x=>x.id===id))return result('BOOKMARK_NOT_FOUND','id');
    return {ok:true,book:{...book,bookmarks:book.bookmarks.filter(x=>x.id!==id)}};
  }
  function summarizeBook(raw){
    const book=safeBook(raw);
    if(!book)return null;
    return {currentPage:book.currentPage,totalPages:book.totalPages,percentComplete:Math.round((10000*book.currentPage)/book.totalPages)/100,bookmarkCount:book.bookmarks.length};
  }
  function serialize(raw){
    const book=safeBook(raw);
    if(!book)throw new TypeError('Invalid reading book');
    return JSON.stringify(book);
  }
  function migrate(raw){
    if(!record(raw))return result('INVALID_BOOK','book');
    if(raw.schemaVersion!==0 && raw.schemaVersion!==1)return result('UNSUPPORTED_SCHEMA','schemaVersion');
    return createBook(raw);
  }
  function parse(serialized){
    if(typeof serialized!=='string'||serialized.length>500000)return result('INVALID_SERIALIZED','source');
    try{return migrate(JSON.parse(serialized));}
    catch{return result('INVALID_JSON','source');}
  }
  return Object.freeze({SCHEMA_VERSION,createBook,validateBook,updateProgress,addBookmark,removeBookmark,summarizeBook,serialize,parse,migrate});
});
