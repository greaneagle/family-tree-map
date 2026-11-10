// All family records remain in browser storage. Local city coordinates are looked up from bundled GeoNames data.
const PRIVACY_KEYS=['ancestral-atlas-v1','ancestral-atlas-geo-v1','ancestral-atlas-settings-v2','ancestral-atlas-relations-v1'];
const clear=document.createElement('button');clear.className='clear-data';clear.id='clearLocalData';clear.type='button';clear.textContent='⌫ Clear all local data';
const privacyNote=document.createElement('div');privacyNote.className='privacy-caption';privacyNote.textContent='Deletes this browser’s family tree, geocoding cache and preferences. Does not affect files you previously downloaded.';
document.querySelector('.stats').after(clear,privacyNote);
clear.onclick=()=>{
 const count=people.length;
 if(!confirm(`Permanently clear ${count} family records and saved settings from this browser? This cannot be undone. Any HTML files you already exported are unaffected.`))return;
 PRIVACY_KEYS.forEach(key=>localStorage.removeItem(key));
 sessionStorage.removeItem('ancestral-atlas-pending-import-v1');
 people=[];pending=[];location.reload();
};
const geocodeChoice=document.createElement('div');geocodeChoice.className='external-lookup';geocodeChoice.innerHTML='<label><input type="checkbox" id="onlinePlaceLookup"><span>Allow online lookup for places not found in the built-in city list</span></label><small>Off by default. When enabled, unmatched place names are sent to OpenStreetMap Nominatim. Family names and relationships are never sent there.</small>';
$('anchorWrap').before(geocodeChoice);
let localGazetteer=null;
function normalizeCity(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
const countryNames={italy:'IT',italia:'IT',scotland:'GB',england:'GB',wales:'GB',britain:'GB','united kingdom':'GB',uk:'GB',germany:'DE',deutschland:'DE',france:'FR',spain:'ES',switzerland:'CH',austria:'AT',ireland:'IE',usa:'US','united states':'US',canada:'CA',australia:'AU',poland:'PL',greece:'GR',croatia:'HR',slovenia:'SI',serbia:'RS',turkey:'TR',india:'IN'};
async function loadCities(){
 if(localGazetteer)return localGazetteer;
 const response=await fetch('local-cities.json');if(!response.ok)throw Error('Built-in city list unavailable.');
 const rows=await response.json(),index=new Map();
 for(const row of rows){for(const name of [row[0],row[1]]){const key=normalizeCity(name);if(!key)continue;if(!index.has(key))index.set(key,[]);index.get(key).push(row)}}
 localGazetteer=index;return index;
}
const onlineGeocode=geocodeAll;
geocodeAll=async function(items){
 const cache=JSON.parse(localStorage.getItem('ancestral-atlas-geo-v1')||'{}');
 let index=null;
 try{index=await loadCities()}catch(error){$('status').textContent='Local city list unavailable. Places may need coordinates.'}
 const unresolved=[];
 for(const p of items){
  if(p.lat!==''&&p.lat!=null&&p.lng!==''&&p.lng!=null)continue;
  const place=String(p.location||'').trim();if(!place)continue;
  const key=place.toLowerCase().replace(/\s+/g,' ');
  if(cache[key]?.length===2){[p.lat,p.lng]=cache[key];continue}
  const segments=place.split(',').map(normalizeCity).filter(Boolean),city=segments[0];
  const candidates=index?.get(city)||[];
  const country=segments.slice(1).map(s=>countryNames[s]).find(Boolean);
  const matched=(country?candidates.filter(row=>row[2]===country):candidates).sort((a,b)=>b[5]-a[5])[0];
  if(matched){p.lat=matched[3];p.lng=matched[4];cache[key]=[p.lat,p.lng]}
  else unresolved.push(p);
 }
 localStorage.setItem('ancestral-atlas-geo-v1',JSON.stringify(cache));
 if(unresolved.length&&$('onlinePlaceLookup').checked){
  await onlineGeocode(unresolved);
 }else if(unresolved.length){
  $('status').textContent=`${unresolved.length} location${unresolved.length===1?'':'s'} not found locally. They will remain unmapped unless you enable online lookup or add coordinates.`;
 }
 return items;
};
