(function(){
 const button=document.createElement('button');button.id='downloadOffline';button.className='btn';button.type='button';button.innerHTML='↓ <span>Offline HTML</span>';
 $('importBtn').before(button);
 const pack=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 button.onclick=async()=>{
   if(!people.length){alert('Please import a family tree first.');return}
   if(!confirm(`Download a view-only HTML containing ${people.length} family records? Anyone you send this file to can read the embedded information, including details about living relatives.`))return;
   button.disabled=true;const previous=button.innerHTML;button.textContent='Preparing…';
   try{
     const [pageResult,worldResult]=await Promise.all([fetch('offline-viewer.html',{cache:'no-store'}),fetch('world-110m.json',{cache:'force-cache'})]);
     if(!pageResult.ok||!worldResult.ok)throw Error('The offline map resources could not be loaded. Please try again while connected to the internet.');
     const [template,topology]=await Promise.all([pageResult.text(),worldResult.json()]);
     if(!template.includes('__FAMILY_DATA__')||!topology.objects?.countries)throw Error('The offline map template is incomplete.');
     const options={theme:settings.theme,branchColors:settings.branchColors,branch:$('branch').value,search:$('search').value,center:map.getCenter(),zoom:map.getZoom()};
     const html=template.replace('__FAMILY_DATA__',pack(people)).replace('__TOPOLOGY__',pack(topology)).replace('__OPTIONS__',pack(options));
     const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
     const date=new Date().toISOString().slice(0,10);link.download=`ancestral-atlas-offline-${date}.html`;link.href=url;link.style.display='none';document.body.appendChild(link);link.click();link.remove();
     setTimeout(()=>URL.revokeObjectURL(url),30000);
     button.textContent='✓ Downloaded';setTimeout(()=>{button.innerHTML=previous},2500);
   }catch(error){alert('Could not create offline HTML: '+error.message);button.innerHTML=previous}
   finally{button.disabled=false}
 };
})();
