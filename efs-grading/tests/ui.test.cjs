const {JSDOM}=require('jsdom'),fs=require('fs'),a=require('node:assert/strict');
const base=require('node:path').resolve(__dirname,'..')+'/';
const dom=new JSDOM(fs.readFileSync(base+'index.html','utf8'),{runScripts:'outside-only',url:'https://efs.test/efs-grading/'}),w=dom.window;
w.structuredClone=structuredClone;w.confirm=()=>true;w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
w.eval(fs.readFileSync(base+'core.js','utf8'));w.eval(fs.readFileSync(base+'app.js','utf8'));const $=id=>w.document.getElementById(id);
$('title').value='Unit 2';$('keyText').value='1 A\n2 B\n3 school';$('buildKey').click();a.equal($('keyRows').children.length,3);$('saveKey').click();a.equal($('step2').hidden,false);
$('student').value='HS-001';$('recognized').value='1 A\n2 C\n3 school';$('toReview').click();a.match($('status').textContent,/đối chiếu/i);$('checked').checked=true;$('toReview').click();a.equal($('step3').hidden,false);a.match($('score').textContent,/6.67/);
$('saveResult').click();a.match($('status').textContent,/Xác nhận/);$('approved').checked=true;$('saveResult').click();a.equal($('results').children.length,1);a.match($('results').textContent,/HS-001/);a.equal(JSON.parse(w.localStorage.getItem('efs_grading_v2')).results.length,1);
$('nextStudent').click();a.equal($('recognized').value,'');a.equal($('student').value,'');
$('student').value='HS-002';$('recognized').value='1 A\n1 B';$('checked').checked=true;$('toReview').click();a.match($('status').textContent,/nhiều câu trả lời/);
$('recognized').value='1 A\n2 B\n3 school';$('checked').checked=true;$('toReview').click();$('recognized').dispatchEvent(new w.Event('input'));$('approved').checked=true;$('saveResult').click();a.match($('status').textContent,/Chưa có bài/);
// Real TXT extraction through the application read pipeline, not a mocked grade.
$('files').files;Object.defineProperty($('files'),'files',{configurable:true,value:[{name:'submission.txt',size:30,type:'text/plain',text:async()=> '1 A\n2 B\n3 school'}]});
(async()=>{await $('readSubmission').onclick();a.equal($('recognized').value,'1 A\n2 B\n3 school');a.equal($('checked').checked,false);console.log('PASS: three-step DOM flow, TXT extraction, review gates, persistence, conflict and stale-draft rejection');w.close();})().catch(e=>{console.error(e);process.exitCode=1});
