// Import is now a dedicated page, independent of map and Leaflet interactions.
$('importBtn').onclick=()=>{window.location.assign('import.html')};
async function resumeImport(){
  const key='ancestral-atlas-pending-import-v1';
  let item=null;
  try{const raw=sessionStorage.getItem(key);if(raw){item=JSON.parse(raw);sessionStorage.removeItem(key)}}catch{}
  if(!item||typeof item.text!=='string'||!item.name)return;
  try{
    openModal();
    await readFile({name:item.name,text:async()=>item.text});
    if(pending.length){
      const linkCount=pending.reduce((sum,p)=>sum+(p.parentIds?.length||0),0);
      const gedcom=/\.(ged|gedcom)$/i.test(item.name);
      $('status').textContent=gedcom
        ?`Loaded ${pending.length} people and ${linkCount} parent–child links. Choose generation 0, then “Use this family tree”.${linkCount===0?' ⚠ No family links were found in this export.':''}`
        :`Loaded ${pending.length} people from ${item.name}. Review the settings, then choose “Use this family tree”.`;
    }
  }catch(e){openModal();$('status').textContent='Import could not be resumed: '+e.message}
}
// Wait for every relationship-extension script to finish loading before decoding GEDCOM.
if(document.readyState==='complete')resumeImport();
else window.addEventListener('load',resumeImport,{once:true});
