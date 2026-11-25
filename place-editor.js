// Correct ambiguous geocoding without re-importing the family tree.
let placeEditorPerson=null,placeEditorResult=null,placeEditorMarker=null;

const placeEditor=document.createElement('div');
placeEditor.className='place-editor-modal';placeEditor.id='placeEditor';
placeEditor.innerHTML=`<section class="place-editor-card" role="dialog" aria-modal="true" aria-labelledby="placeEditorTitle">
 <div class="place-editor-head"><div><span class="eyebrow">Correct a map location</span><h2 id="placeEditorTitle">Find the right place</h2></div><button type="button" id="placeEditorClose" aria-label="Close">✕</button></div>
 <p class="place-editor-help">The historical name will stay unchanged. Search for the modern place that should position it on the map; adding a region or country helps distinguish shared names.</p>
 <form id="placeSearchForm"><label for="placeSearchInput">Place search</label><div class="place-search-row"><input id="placeSearchInput" autocomplete="off" placeholder="Town, region, country"><button type="submit">Search</button></div></form>
 <div id="placeSearchStatus" class="place-search-status" role="status"></div><div id="placeSearchResults" class="place-search-results"></div>
 <div id="placeEditorChoice" class="place-editor-choice" hidden><span>Selected location</span><b id="placeEditorChoiceName"></b><button type="button" id="placeEditorApply">Use this location</button></div>
 <div id="placeEditorScope" class="place-editor-scope" hidden></div>
 <small class="place-search-credit">Search results © OpenStreetMap contributors</small>
</section>`;
document.body.appendChild(placeEditor);

function placeIdentity(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function historicalPlaceKey(person){return placeIdentity(person.fullLocation||person.location)}
function closePlaceEditor(){
 placeEditor.classList.remove('open');placeEditorPerson=null;placeEditorResult=null;
 if(placeEditorMarker){map.removeLayer(placeEditorMarker);placeEditorMarker=null}
}
function openPlaceEditor(person){
 placeEditorPerson=person;placeEditorResult=null;$('placeSearchResults').innerHTML='';$('placeEditorChoice').hidden=true;$('placeEditorScope').hidden=true;
 $('placeSearchStatus').textContent=person.mapFullLocation?`Currently mapped to: ${person.mapFullLocation}`:'';
 $('placeSearchInput').value=person.mapFullLocation||person.fullLocation||person.location||'';
 placeEditor.classList.add('open');setTimeout(()=>$('placeSearchInput').focus(),0);
}

$('placeEditorClose').onclick=closePlaceEditor;
placeEditor.onclick=event=>{if(event.target===placeEditor)closePlaceEditor()};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&placeEditor.classList.contains('open'))closePlaceEditor()});

$('placeSearchForm').onsubmit=async event=>{
 event.preventDefault();const query=$('placeSearchInput').value.trim();if(!query)return;
 $('placeSearchStatus').textContent='Searching…';$('placeSearchResults').innerHTML='';$('placeEditorChoice').hidden=true;$('placeEditorScope').hidden=true;placeEditorResult=null;
 try{
  const url='https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q='+encodeURIComponent(query);
  const response=await fetch(url,{headers:{'Accept':'application/json'}});if(!response.ok)throw Error('Search is temporarily unavailable.');
  const results=await response.json();$('placeSearchStatus').textContent=results.length?`${results.length} possible location${results.length===1?'':'s'} found.`:'No matches found. Add a region or country and try again.';
  $('placeSearchResults').innerHTML=results.map((result,index)=>`<button type="button" class="place-result" data-place-result="${index}"><b>${esc(result.name||atlasLocality(result.display_name))}</b><span>${esc(result.display_name)}</span></button>`).join('');
  $('placeSearchResults').querySelectorAll('[data-place-result]').forEach(button=>button.onclick=()=>selectPlaceResult(results[Number(button.dataset.placeResult)],button));
 }catch(error){$('placeSearchStatus').textContent=error.message||'Place search failed. Please try again.'}
};

function selectPlaceResult(result,button){
 placeEditorResult={lat:Number(result.lat),lng:Number(result.lon),mapLocation:String(result.name||atlasLocality(result.display_name)).trim(),mapFullLocation:String(result.display_name||'').trim()};
 document.querySelectorAll('.place-result.selected').forEach(node=>node.classList.remove('selected'));button.classList.add('selected');
 $('placeEditorChoiceName').textContent=placeEditorResult.mapFullLocation;$('placeEditorChoice').hidden=false;
 if(placeEditorMarker)map.removeLayer(placeEditorMarker);
 placeEditorMarker=L.marker([placeEditorResult.lat,placeEditorResult.lng]).addTo(map);map.flyTo([placeEditorResult.lat,placeEditorResult.lng],9,{duration:.6});
}

$('placeEditorApply').onclick=()=>{
 if(!placeEditorPerson||!placeEditorResult)return;
 const oldPlace=placeEditorPerson.location||'',oldKey=historicalPlaceKey(placeEditorPerson);
 const matches=people.filter(person=>historicalPlaceKey(person)===oldKey);
 if(matches.length<=1)return applyPlaceCorrection([placeEditorPerson]);
 const scope=$('placeEditorScope');scope.hidden=false;
 scope.innerHTML=`<p><b>${matches.length} people</b> currently use “${esc(oldPlace)}”. Which records should change?</p><div><button type="button" data-scope="one">Only ${esc(placeEditorPerson.name)}</button><button type="button" data-scope="all">All ${matches.length} people</button></div>`;
 scope.querySelector('[data-scope="one"]').onclick=()=>applyPlaceCorrection([placeEditorPerson]);
 scope.querySelector('[data-scope="all"]').onclick=()=>applyPlaceCorrection(matches);
};

function applyPlaceCorrection(targets){
 const result=placeEditorResult,activeId=placeEditorPerson.id;
 for(const person of targets){person.mapLocation=result.mapLocation;person.mapFullLocation=result.mapFullLocation;person.lat=result.lat;person.lng=result.lng;person.mapLocationSource='corrected'}
 const cache=JSON.parse(localStorage.getItem('ancestral-atlas-geo-v1')||'{}');
 cache[locKey(result.mapFullLocation)]=[result.lat,result.lng];localStorage.setItem('ancestral-atlas-geo-v1',JSON.stringify(cache));
 save();closePlaceEditor();map.flyTo([result.lat,result.lng],9,{duration:.6});showPerson(activeId,false);
}

function reusableCorrection(person){
 if(!person?.mapLocationSource||!Number.isFinite(Number(person.lat))||!Number.isFinite(Number(person.lng)))return null;
 return {mapLocation:person.mapLocation||'',mapFullLocation:person.mapFullLocation||'',mapLocationSource:person.mapLocationSource,lat:Number(person.lat),lng:Number(person.lng)};
}
function inheritMapCorrections(items,previousPeople){
 const byPerson=new Map(),byPlace=new Map();
 for(const person of previousPeople||[]){
  const correction=reusableCorrection(person),placeKey=historicalPlaceKey(person);if(!correction||!placeKey)continue;
  byPerson.set(`${placeKey}|${placeIdentity(person.name)}`,correction);
  if(!byPlace.has(placeKey))byPlace.set(placeKey,new Map());
  byPlace.get(placeKey).set(`${correction.lat.toFixed(6)},${correction.lng.toFixed(6)}`,correction);
 }
 for(const person of items||[]){
  const placeKey=historicalPlaceKey(person);if(!placeKey)continue;
  const exact=byPerson.get(`${placeKey}|${placeIdentity(person.name)}`),placeOptions=byPlace.get(placeKey);
  const correction=exact||(placeOptions?.size===1?[...placeOptions.values()][0]:null);if(!correction)continue;
  Object.assign(person,correction);
 }
 return items;
}

// Re-imports retain prior manual map corrections while preserving newly imported historical text.
const geocodeWithCorrectionReuse=geocodeAll;
geocodeAll=async function(items){inheritMapCorrections(items,people);return geocodeWithCorrectionReuse(items)};

const showPersonWithPlaceEditor=showPerson;
showPerson=function(id,push=true){
 showPersonWithPlaceEditor(id,push);const person=people.find(item=>String(item.id)===String(id));if(!person)return;
 const actions=document.querySelector('#familyDrawerBody .drawer-actions');if(!actions)return;
 const edit=document.createElement('button');edit.type='button';edit.className='edit-place';edit.textContent='⌖ Correct place';edit.onclick=()=>openPlaceEditor(person);actions.prepend(edit);
};
