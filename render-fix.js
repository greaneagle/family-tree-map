// The original inline UI registered the first render function by reference.
// Retire those listeners, then always resolve the newest renderer dynamically.
map.off('zoomend',oldRender);
map.on('zoomend',()=>render());
for(const id of ['search','branch','genRange','clusterToggle','sizeToggle']){
  const original=$(id),replacement=original.cloneNode(true);
  replacement.value=original.value;
  if(original.type==='checkbox')replacement.checked=original.checked;
  original.replaceWith(replacement);
  replacement.addEventListener(id==='search'||id==='genRange'?'input':'change',()=>render());
}
// Keep each family side in a single colour family; vary only lightness by age.
shadedBranch=function(person){
  const hex=branchColor(person.branch);
  const generation=Math.max(0,Math.min(12,Number(person.generation)||0));
  const lightening=Math.min(.38,generation*.035);
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  return '#'+rgb.map(c=>Math.round(c+(255-c)*lightening).toString(16).padStart(2,'0')).join('');
};
render();
