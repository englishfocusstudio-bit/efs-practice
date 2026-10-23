'use strict';
(function(){
 const button=document.getElementById('backup');
 if(!button)return;
 button.addEventListener('click',()=>{
  const status=document.getElementById('status');
  try{
   const raw=localStorage.getItem('efs_grading_v2');
   if(!raw)throw Error('Chưa có dữ liệu đã lưu để sao lưu.');
   const data=JSON.parse(raw);
   if(!data||typeof data.versions!=='object'||data.versions===null||Array.isArray(data.versions)||!Array.isArray(data.results))throw Error('Dữ liệu lưu không hợp lệ.');
   const payload=JSON.stringify({format:'efs-grading-backup',schemaVersion:1,exportedAt:new Date().toISOString(),storageKey:'efs_grading_v2',data},null,2);
   const url=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='EFS_Grading_Backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   if(status){status.className='notice';status.textContent='Đã tạo bản sao lưu mã đề và kết quả. Bảo quản file an toàn vì chứa dữ liệu học sinh. Chưa hỗ trợ nhập khôi phục.';}
  }catch(e){if(status){status.className='error';status.textContent='Không sao lưu được: '+e.message;}}
 });
})();
