// Import is now a dedicated page, independent of map and Leaflet interactions.
$('importBtn').onclick=()=>{window.location.assign('import.html')};
(async function resumeImport(){
  const key='ancestral-atlas-pending-import-v1';
  let item=null;
  try{const raw=sessionStorage.getItem(key);if(raw){item=JSON.parse(raw);sessionStorage.removeItem(key)}}catch{}
  if(!item||typeof item.text!=='string'||!item.name)return;
  try{
    openModal();
    await readFile({name:item.name,text:async()=>item.text});
    $('status').textContent=pending.length?`Loaded ${pending.length} relatives from ${item.name}. Review the settings, then choose “Use this family tree”.`:$('status').textContent;
  }catch(e){openModal();$('status').textContent='Import could not be resumed: '+e.message}
})();
