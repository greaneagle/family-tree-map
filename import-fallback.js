(function(){
  const input=$('file'),choice=document.querySelector('.file-choice'),drop=$('drop');
  // Use the browser's actual file input rather than an invisible input overlay.
  if(choice&&input){choice.parentNode.insertBefore(input,choice);choice.remove()}
  const note=document.createElement('p');note.className='native-file-note';note.textContent='Tap the native Choose File control above. If your phone blocks it, use the paste option below.';
  input.after(note);
  const paste=document.createElement('details');paste.className='paste-import';
  paste.innerHTML='<summary>File picker not opening? Paste your family tree</summary><div class="paste-inner"><p>Open your CSV or GEDCOM file in a text editor, copy its contents, and paste them here. This bypasses the phone file picker completely.</p><textarea id="pasteData" placeholder="name,generation,location,branch\nJane Smith,0,London,Scottish\n..." spellcheck="false"></textarea><button type="button" class="btn primary" id="pasteImport">Import pasted data</button><div class="paste-result" id="pasteResult" role="status"></div></div>';
  drop.after(paste);
  $('pasteImport').onclick=async()=>{
    const raw=$('pasteData').value.trim();
    if(!raw){$('pasteResult').textContent='Paste CSV or GEDCOM text first.';return}
    const isGed=/^0\s+@[^@]+@\s+INDI\b/m.test(raw)||/^0\s+HEAD\b/m.test(raw);
    $('pasteResult').textContent='Reading pasted '+(isGed?'GEDCOM':'CSV')+'…';
    await readFile({name:isGed?'pasted.ged':'pasted.csv',text:async()=>raw});
    $('pasteResult').textContent=pending.length?`${pending.length} people loaded. Choose “Use this family tree” below.`:$('status').textContent;
  };
  const originalOpen=$('importBtn').onclick;
  $('importBtn').onclick=()=>{originalOpen();paste.open=false;$('pasteResult').textContent=''};
})();
