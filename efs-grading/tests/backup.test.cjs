const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'../backup.js'),'utf8');
function setup(raw){
 const dom=new JSDOM('<button id="backup"></button><p id="status"></p>',{runScripts:'outside-only',url:'https://efs.test'});
 const w=dom.window;let clicked=0;let exportedBlob=null;
 w.HTMLAnchorElement.prototype.click=function(){clicked++;};
 w.URL.createObjectURL=(blob)=>{exportedBlob=blob;return 'blob:test';};w.URL.revokeObjectURL=()=>{};
 if(raw!==undefined)w.localStorage.setItem('efs_grading_v2',raw);
 w.eval(script);
 return {dom,w,clicked:()=>clicked,exported:()=>exportedBlob};
}
test('full backup includes version keys and grading results',async()=>{
 const state={versions:{'001':{questions:[{number:1,key:'A',type:'mc',points:1}]}},results:[{student:'HS1',score:1}]};
 const ctx=setup(JSON.stringify(state));
 ctx.w.document.getElementById('backup').click();
 assert.equal(ctx.clicked(),1);
 assert.match(ctx.w.document.getElementById('status').textContent,/mã đề và kết quả/);
 const payload=JSON.parse(await ctx.exported().text());
 assert.equal(payload.format,'efs-grading-backup');
 assert.equal(payload.schemaVersion,1);
 assert.equal(payload.storageKey,'efs_grading_v2');
 assert.deepEqual(payload.data,state);
 assert.deepEqual(JSON.parse(ctx.w.localStorage.getItem('efs_grading_v2')),state);
 ctx.dom.window.close();
});
test('missing or malformed local data cannot create backup',()=>{
 for(const raw of [undefined,'not-json',JSON.stringify({versions:{},results:'invalid'})]){
  const ctx=setup(raw);ctx.w.document.getElementById('backup').click();
  assert.equal(ctx.clicked(),0);
  assert.match(ctx.w.document.getElementById('status').textContent,/Không sao lưu được/);
  ctx.dom.window.close();
 }
});
