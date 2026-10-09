(function(root){'use strict';
function normalize(s){return String(s??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();}
function parseAnswers(text){const answers={},conflicts=[];const re=/(?:^|[\n\r\t ;,])(?:câu\s*|question\s*)?(\d{1,3})\s*[).:\-]?\s*([^\n\r;]+?)(?=(?:\s+(?:câu\s*|question\s*)?\d{1,3}\s*[).:\-]?\s*[A-D]\b)|[\n\r;]|$)/gi;let m;while((m=re.exec(text))){const n=Number(m[1]),v=m[2].trim();if(!n||!v)continue;if(Object.hasOwn(answers,n)&&normalize(answers[n])!==normalize(v))conflicts.push(n);answers[n]=v;}return {answers,conflicts:[...new Set(conflicts)]};}
function detectExamCode(text,codes){
 const canonical=s=>String(s).normalize('NFKC').trim().toUpperCase();
 const source=String(text).normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
 const re=/\b(?:ma[ \t]*(?:so[ \t]*)?de(?:[ \t]*thi)?|exam[ \t]*code|test[ \t]*code|paper[ \t]*code|version[ \t]*code)[ \t]*(?:[:#=–-][ \t]*)?[([{]?[ \t]*([a-z0-9][^\s\])},;:]*)/gi;
 const found=[];let m;while((m=re.exec(source)))found.push(canonical(m[1]));
 const observed=[...new Set(found)];
 if(observed.length>1)return {status:'conflict',observed,code:null};
 if(observed.length===1){const matches=codes.filter(c=>canonical(c)===observed[0]);if(matches.length===1)return {status:'matched',observed,code:matches[0]};return {status:matches.length?'conflict':'unknown',observed,code:null};}
 if(codes.length===1)return {status:'single',observed,code:codes[0]};
 return {status:'missing',observed,code:null};
}
function validateKey(rows){if(!rows.length)throw Error('Cần ít nhất một câu có đáp án.');const seen=new Set();return rows.map(r=>{const n=Number(r.number),points=Number(r.points),type=r.type;if(!Number.isInteger(n)||n<1||n>200||seen.has(n))throw Error('Số câu phải từ 1–200 và không trùng.');seen.add(n);if(!['mc','short','written'].includes(type)||!Number.isFinite(points)||points<=0||points>100)throw Error('Kiểm tra loại câu và điểm từng câu.');const key=String(r.key||'').trim();if(!key)throw Error('Câu '+n+' chưa có đáp án hoặc barem.');if(type==='short'&&key.split('|').some(k=>!k.trim()))throw Error('Câu '+n+' có đáp án tương đương trống.');if(type==='mc'&&!/^[A-D]$/i.test(key))throw Error('Câu '+n+' cần một đáp án A, B, C hoặc D.');return {number:n,type,points,key};});}
function grade(rows,answers,manual={}){rows=validateKey(rows);let score=0,max=0;const items=rows.map(q=>{max+=q.points;const answer=String(answers[q.number]??'').trim();let earned=null;if(q.type==='written'){if(Object.hasOwn(manual,q.number)&&manual[q.number]!==''&&manual[q.number]!==null){earned=Number(manual[q.number]);if(!Number.isFinite(earned)||earned<0||earned>q.points)throw Error('Điểm câu '+q.number+' phải từ 0 đến '+q.points);}}else earned=q.key.split('|').some(k=>normalize(k)===normalize(answer))?q.points:0;if(earned!==null)score+=earned;return {...q,answer,earned};});return {items,score:Math.round(score*100)/100,max:Math.round(max*100)/100,complete:items.every(x=>x.earned!==null)};}
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
const api={normalize,parseAnswers,detectExamCode,validateKey,grade,csvCell};if(typeof module!=='undefined')module.exports=api;root.EFSCore=api;})(globalThis);
