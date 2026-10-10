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
   if(status){status.className='notice';status.textContent='Đã tạo bản sao lưu mã đề và kết quả. Bảo quản file an toàn vì chứa dữ liệu học sinh. Bản sao lưu không chứa file ảnh gốc.';}
  }catch(e){if(status){status.className='error';status.textContent='Không sao lưu được: '+e.message;}}
 });
 const rollbackButton=document.getElementById('rollback');if(rollbackButton)rollbackButton.addEventListener('click',()=>{try{if(!confirm('Quay về dữ liệu trước lần khôi phục gần nhất?'))return;EFSWorkflow.rollback(localStorage);location.reload();}catch(e){const status=document.getElementById('status');status.className='error';status.textContent=e.message;}});
 const restoreButton=document.getElementById('restore');
 if(restoreButton)restoreButton.addEventListener('click',async()=>{const status=document.getElementById('status');try{const file=document.getElementById('restoreFile').files[0];if(!file)throw Error('Chọn bản sao lưu JSON.');if(file.size>20*1024*1024)throw Error('Bản sao lưu tối đa 20 MB.');const raw=await file.text();const payload=JSON.parse(raw);EFSWorkflow.validateState(payload.data);if(!confirm('Khôi phục sẽ thay dữ liệu tại trình duyệt này. Dữ liệu hiện tại được giữ trong bản trước khôi phục. Tiếp tục?'))return;EFSWorkflow.restore(localStorage,raw);location.reload();}catch(e){status.className='error';status.textContent='Không khôi phục được: '+e.message;}});
})();
