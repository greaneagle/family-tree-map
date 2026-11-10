(function(){
  const fileInput=$('file'),drop=$('drop');
  if(!fileInput||!drop)return;
  const choice=document.createElement('label');
  choice.className='file-choice';
  choice.innerHTML='<strong>📁 Choose a family tree file</strong><span>CSV, GED or GEDCOM · tap anywhere here</span>';
  fileInput.parentNode.insertBefore(choice,fileInput);
  choice.appendChild(fileInput);
  fileInput.setAttribute('aria-label','Choose CSV or GEDCOM file from your device');
  const feedback=document.createElement('p');
  feedback.className='file-status';
  feedback.id='fileFeedback';
  feedback.setAttribute('role','status');
  choice.after(feedback);
  fileInput.addEventListener('change',()=>{
    const selected=fileInput.files&&fileInput.files[0];
    feedback.textContent=selected?'Selected: '+selected.name:'No file selected.';
  });
  const previousOpen=$('importBtn').onclick;
  $('importBtn').onclick=()=>{previousOpen();feedback.textContent='';};
  // Older Android WebViews lack File.text(). Preserve the same local import workflow.
  if(typeof File!=='undefined'&&!File.prototype.text){
    File.prototype.text=function(){return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error);reader.readAsText(this);
    })};
  }
})();
