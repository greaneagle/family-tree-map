// Relationship-aware person browser. No map movement is required to follow a relative.
// Restore links using individual FAMC references when family CHIL entries are incomplete.
const priorGEDParser=parseGED;
parseGED=function(text){
 const tree=priorGEDParser(text);let individualId=null;
 for(const line of text.split(/\r?\n/)){
   const root=line.match(/^0\s+(@[^@]+@)\s+INDI\b/);
   if(root){individualId=root[1];continue}
   if(/^0\s/.test(line)){individualId=null;continue}
   const familyRef=line.match(/^1\s+FAMC\s+(@[^@]+@)/);
   if(individualId&&familyRef){
     const family=tree.fam[familyRef[1]];
     if(family&&!family.children.includes(individualId))family.children.push(individualId);
   }
 }
 return tree;
};
const previousGedConverter=gedToPeople;
gedToPeople=function(anchorId){
 const result=previousGedConverter(anchorId),byId=new Map(result.map(p=>[p.id,p]));
 result.forEach(p=>{p.parentIds=[];p.childIds=[]});
 for(const f of Object.values(gedIndividuals.fam))for(const child of f.children)for(const parent of [f.husb,f.wife].filter(Boolean)){
   if(!byId.has(child)||!byId.has(parent))continue;
   if(!byId.get(child).parentIds.includes(parent))byId.get(child).parentIds.push(parent);
   if(!byId.get(parent).childIds.includes(child))byId.get(parent).childIds.push(child);
 }
 return result;
};
function attachDemoRelationships(){
 const nameMap=new Map(people.filter(p=>String(p.id).startsWith('demo')).map(p=>[p.name,p]));
 const links=[['Juliet Smith','Jane Smith'],['Giulia Francone','Jane Smith'],['Eduardo Francone','Giulia Francone'],['Jane Smith','Emma Smith'],['Francesca Scaroni','Luca Scaroni']];
 for(const [parentName,childName] of links){const parent=nameMap.get(parentName),child=nameMap.get(childName);if(!parent||!child)continue;parent.childIds=[...new Set([...(parent.childIds||[]),child.id])];child.parentIds=[...new Set([...(child.parentIds||[]),parent.id])]}
}
attachDemoRelationships();
const drawer=document.createElement('section');drawer.className='family-drawer';drawer.id='familyDrawer';drawer.setAttribute('aria-label','Family member details');drawer.innerHTML='<div class="family-drawer-head"><div><span class="subtle">Explore your family</span><div id="drawerTrail" style="font-size:11px;color:#8ba092;margin-top:4px"></div></div><div style="display:flex;gap:6px"><button id="drawerBack" type="button" aria-label="Previous person">← Back</button><button id="drawerClose" type="button" aria-label="Close details">✕</button></div></div><div class="family-drawer-body" id="familyDrawerBody"></div>';
document.querySelector('main').appendChild(drawer);
const personHistory=[];let activePersonId=null;
function locationType(p){const types={birth:'Birthplace',death:'Place of death',residence:'Residence',other:'Other recorded place',provided:'Provided location',estimated:'Estimated from a relative',missing:'Unknown location'};return types[p.locationSource]||'Recorded location'}
function personLink(id){const p=people.find(x=>String(x.id)===String(id));if(!p)return '';return `<button class="relative-link" type="button" data-person-id="${esc(p.id)}"><span>${esc(p.name)}<small>${esc(displayedRelation(p))} · ${esc(p.location||'Location unknown')}</small></span><span class="arrow">›</span></button>`}
function relationSection(title,ids){const valid=[...new Set(ids||[])].filter(id=>people.some(p=>String(p.id)===String(id)));return `<h3>${esc(title)} · ${valid.length}</h3>${valid.length?valid.map(personLink).join(''):'<div class="empty-rel">No recorded connections</div>'}`}
function showPerson(id,push=true){
 const person=people.find(p=>String(p.id)===String(id));if(!person)return;
 if(push&&activePersonId!==null&&String(activePersonId)!==String(id))personHistory.push(activePersonId);
 activePersonId=person.id;drawer.classList.add('open');$('drawerBack').disabled=!personHistory.length;$('drawerBack').style.opacity=personHistory.length?'1':'.45';
 $('drawerTrail').textContent=personHistory.length?`${personHistory.length} step${personHistory.length===1?'':'s'} from the map`:'Selected family member';
 $('familyDrawerBody').innerHTML=`<div class="eyebrow">${esc(person.branch||'Family member')}</div><h2>${esc(person.name)}</h2><span class="relation-tag">${esc(displayedRelation(person))}</span><div class="info-card"><label>${esc(locationType(person))}</label><b>${esc(person.location||'Unknown')}</b>${person.locationSource==='estimated'?`<p>⚠ ${esc(person.locationNote||'Inferred from a related person; not verified.')}</p>`:''}</div><div class="info-card"><label>Generation</label><b>${esc(fmtGen(Number(person.generation)||0))}</b>${person.birth?`<p>Born: ${esc(person.birth)}</p>`:''}${person.death?`<p>Died: ${esc(person.death)}</p>`:''}</div><div class="drawer-actions"><button type="button" id="showOnMap">⌖ Centre map here</button><button type="button" id="copyPerson">Copy name</button></div>${relationSection('Spouse / partner',person.spouseIds)}${relationSection('Parents',person.parentIds)}${relationSection('Children',person.childIds)}`;
 if(!Array.isArray(person.parentIds)||!Array.isArray(person.childIds)){
   $('familyDrawerBody').insertAdjacentHTML('afterbegin','<div class="notice">⚠ This saved record predates family-link import. Please re-import the original GEDCOM to restore parents and children.</div>');
 }
 $('showOnMap').onclick=()=>{if(isMappable(person)){map.panTo([Number(person.lat),Number(person.lng)],{animate:true});drawer.classList.remove('open')}else alert('No mapped location is available for this person.')};
 $('copyPerson').onclick=async()=>{try{await navigator.clipboard.writeText(person.name);$('copyPerson').textContent='Copied!'}catch{$('copyPerson').textContent=person.name}};
}
$('drawerBack').onclick=()=>{const id=personHistory.pop();if(id!==undefined)showPerson(id,false)};
$('drawerClose').onclick=()=>drawer.classList.remove('open');
document.addEventListener('click',event=>{const target=event.target.closest?.('[data-person-id]');if(!target)return;event.preventDefault();event.stopPropagation();map.closePopup();showPerson(target.dataset.personId)});
// Every name in a grouped place list becomes a clickable person entry.
membersPopup=function(members,place,notice=''){
 const rows=members.map(p=>`<div class="cluster-person"><button type="button" class="person-inline" data-person-id="${esc(p.id)}">${esc(p.name)}</button><small>${esc(displayedRelation(p))} · ${fmtGen(Number(p.generation)||0)} · ${esc(locationType(p))}</small></div>`).join('');
 return `<div class="cluster-list"><h3>${esc(place||'Family location')}</h3><p>${members.length} family member${members.length===1?'':'s'} · Tap a name to explore their relatives.</p>${notice?`<p><strong>${esc(notice)}</strong></p>`:''}${rows}</div>`;
};
// Individual markers now lead into the persistent family navigator.
drawPerson=function(p,position,base,spread){
 if(spread&&base.distanceTo(position)>1)L.polyline([base,position],{color:'#9eb9ab',opacity:.6,weight:1.5,dashArray:'3 4',interactive:false,className:'spider-leg'}).addTo(markers);
 const marker=L.circleMarker(position,{radius:Math.max(9,radius(Number(p.generation)||0)),color:p.locationSource==='estimated'?'#735b46':'#fff',dashArray:p.locationSource==='estimated'?'3 3':undefined,weight:2.5,fillColor:shadedBranch(p),fillOpacity:.96,className:'spider-person',bubblingMouseEvents:false});
 marker.bindTooltip(`<strong>${esc(p.name)}</strong><small>${esc(displayedRelation(p))} · ${esc(locationType(p))}</small>`,{direction:'top',offset:[0,-10],className:'family-tooltip'});
 marker.on('click',event=>{if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);showPerson(p.id)});marker.addTo(markers);return marker;
};
const saveWithNav=save;save=function(){saveWithNav();attachDemoRelationships();if(activePersonId!==null&&drawer.classList.contains('open'))showPerson(activePersonId,false)};
render();
