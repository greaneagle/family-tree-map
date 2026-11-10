// Single tap = full list. Double tap = controlled, local expansion (never auto-zoom).
map.doubleClickZoom.disable();
let clusterState=null,pendingClusterTap=null,lastClusterDouble=0;
const TAP_WINDOW=340,MAX_SPREAD_METERS=50000;
function membersPopup(members,place,notice=''){
 const rows=members.map(p=>`<div class="cluster-person"><b>${esc(p.name)}</b><small>${esc(displayedRelation(p))} · ${fmtGen(Number(p.generation)||0)} · ${esc(p.branch||'Unassigned')}</small></div>`).join('');
 return `<div class="cluster-list"><h3>${esc(place||'Family location')}</h3><p>${members.length} family member${members.length===1?'':'s'} here. Double-tap this group to separate.</p>${notice?`<p><strong>${esc(notice)}</strong></p>`:''}${rows}</div>`;
}
function candidatePositions(members){
 const base=L.latLng(Number(members[0].lat),Number(members[0].lng)),origin=map.latLngToLayerPoint(base);
 return members.map((p,i)=>{const angle=i*2.3999632297,dist=members.length===1?0:members.length===2?34:Math.min(190,28+Math.sqrt(i+1)*22);return map.layerPointToLatLng(L.point(origin.x+Math.cos(angle)*dist,origin.y+Math.sin(angle)*dist))});
}
function canSeparate(members){if(members.length<=1)return true;const base=L.latLng(Number(members[0].lat),Number(members[0].lng)),positions=candidatePositions(members);if(positions.some(pos=>base.distanceTo(pos)>MAX_SPREAD_METERS))return false;const pixels=positions.map(pos=>map.latLngToLayerPoint(pos));for(let i=0;i<pixels.length;i++)for(let j=0;j<i;j++)if(pixels[i].distanceTo(pixels[j])<19)return false;return true}
function familySubgroups(members){
 const byBranch=new Map();members.forEach(p=>{const key=p.branch||'Unassigned';if(!byBranch.has(key))byBranch.set(key,[]);byBranch.get(key).push(p)});
 if(byBranch.size>1)return [...byBranch].map(([name,people])=>({name,people}));
 const buckets=new Map();members.forEach(p=>{const g=Number(p.generation)||0,key=g<0?'Descendants':g<=2?'Recent generations':g<=5?'Earlier generations':'Distant ancestors';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p)});
 return [...buckets].map(([name,people])=>({name,people}));
}
function openMembers(members,latlng,notice=''){L.popup({maxWidth:330,maxHeight:360,autoPan:false}).setLatLng(latlng).setContent(membersPopup(members,members[0]?.location,notice)).openOn(map)}
function tryExpand(key,members,groupName){
 if(Date.now()-lastClusterDouble<180)return;lastClusterDouble=Date.now();
 if(clusterState?.key===key&&clusterState?.name===groupName){clusterState=null;render();return}
 if(canSeparate(members)){clusterState=groupName?{key,mode:'subgroup-people',name:groupName,selected:members,groups:clusterState?.groups||familySubgroups(members)}:{key,mode:'people',name:null};map.closePopup();render();return}
 const subgroups=familySubgroups(members);
 if(!groupName&&subgroups.length>1&&canSeparate(subgroups.map(g=>g.people[0]))){clusterState={key,mode:'subgroups',groups:subgroups,name:null};map.closePopup();render();return}
 openMembers(members,L.latLng(Number(members[0].lat),Number(members[0].lng)),'Zoom in manually to make enough room (within a 100 km circle).');
}
function tapGroup(marker,key,members,groupName){
 marker.on('click',event=>{
   if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
   const now=Date.now();
   if(pendingClusterTap&&pendingClusterTap.key===key&&pendingClusterTap.name===groupName&&now-pendingClusterTap.time<TAP_WINDOW){clearTimeout(pendingClusterTap.timer);pendingClusterTap=null;tryExpand(key,members,groupName);return}
   if(pendingClusterTap)clearTimeout(pendingClusterTap.timer);
   const timer=setTimeout(()=>{pendingClusterTap=null;openMembers(members,marker.getLatLng())},TAP_WINDOW);
   pendingClusterTap={key,name:groupName,time:now,timer};
 });
 marker.on('dblclick',event=>{if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);if(pendingClusterTap){clearTimeout(pendingClusterTap.timer);pendingClusterTap=null}tryExpand(key,members,groupName)});
}
function circleBadge(base,count,label,hue,size){const html=`<div class="cluster-badge" style="width:${size}px;height:${size}px;background:${hue}"><span>${count}</span>${label?`<small>${esc(label)}</small>`:''}</div>`;return L.marker(base,{icon:L.divIcon({html,className:'cluster-label',iconSize:[size,size],iconAnchor:[size/2,size/2]}),bubblingMouseEvents:false})}
function drawGroupCluster(key,members,base,label=''){
 const size=label?Math.min(78,50+Math.sqrt(members.length)*5):Math.min(65,31+Math.sqrt(members.length)*7);
 const marker=circleBadge(base,members.length,label,shadedBranch(members[0]),size);
 tapGroup(marker,key,members,label||null);marker.addTo(markers);
}
render=function(){
 if(typeof animationFrame!=='undefined'&&animationFrame)cancelAnimationFrame(animationFrame);
 markers.clearLayers();
 const query=$('search').value.trim().toLowerCase(),branch=$('branch').value,max=Number($('genRange').value),fullMax=Number($('genRange').max);
 $('genLabel').textContent=max===fullMax?'All generations':`Up to ${max} back`;
 const displayed=people.filter(p=>(branch==='all'||p.branch===branch)&&(Number(p.generation)||0)<=max&&(!query||`${p.name} ${p.location} ${p.branch||''} ${p.relationship||''}`.toLowerCase().includes(query)));
 const mapped=displayed.filter(isMappable),groups=new Map(),positions=new Map();
 mapped.forEach(p=>{const key=placeKey(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)});
 if(clusterState&&!groups.has(clusterState.key))clusterState=null;
 for(const [key,members] of groups){
  const base=L.latLng(Number(members[0].lat),Number(members[0].lng));
  if(members.length===1){drawPerson(members[0],base,base,false);positions.set(members[0].id,base);continue}
  if(clusterState?.key!==key){drawGroupCluster(key,members,base);members.forEach(p=>positions.set(p.id,base));continue}
  if(clusterState.mode==='subgroups'||clusterState.mode==='subgroup-people'){
   const sub=clusterState.groups,points=candidatePositions(sub.map(g=>g.people[0]));
   sub.forEach((s,i)=>{if(clusterState.mode==='subgroup-people'&&s.name===clusterState.name){const individualPoints=candidatePositions(s.people);s.people.forEach((p,j)=>{drawPerson(p,individualPoints[j],base,true);positions.set(p.id,individualPoints[j])})}else{L.polyline([base,points[i]],{color:'#a6b9ad',weight:1.5,dashArray:'3 4',interactive:false}).addTo(markers);drawGroupCluster(key,s.people,points[i],s.name);s.people.forEach(p=>positions.set(p.id,points[i]))}});continue;
  }
  const points=candidatePositions(members);
  if(!canSeparate(members)){clusterState=null;drawGroupCluster(key,members,base);members.forEach(p=>positions.set(p.id,base));continue}
  members.forEach((p,i)=>{positions.set(p.id,points[i]);drawPerson(p,points[i],base,true)});
 }
 if(relationSettings.showSpouses){const byId=new Map(mapped.map(p=>[p.id,p])),seen=new Set();for(const p of mapped)for(const sid of p.spouseIds||[]){if(!byId.has(sid))continue;const pair=[p.id,sid].sort().join('|');if(seen.has(pair))continue;seen.add(pair);const a=positions.get(p.id),b=positions.get(sid);if(!a||!b)continue;const ap=map.latLngToLayerPoint(a),bp=map.latLngToLayerPoint(b),d=ap.distanceTo(bp);if(d<3)continue;L.polyline([a,b],{color:'#c1818c',weight:2,opacity:.6,dashArray:'5 6',interactive:false}).addTo(markers).bringToBack()}}
 $('peopleCount').textContent=displayed.length;$('placeCount').textContent=groups.size;$('empty').style.display=displayed.length?'none':'block';$('mapSubtitle').textContent=`${displayed.length} people · ${groups.size} mapped places`;
 $('insight').textContent=clusterState?'Group expanded within a 100 km diameter. Tap a person for details, or tap empty map to collapse.':'Single tap: list everyone in a group. Double tap: separate only when the group fits within a 100 km diameter.';
};
map.on('click',()=>{if(pendingClusterTap){clearTimeout(pendingClusterTap.timer);pendingClusterTap=null}if(clusterState){clusterState=null;render()}});
map.on('zoomstart',()=>{clusterState=null;if(pendingClusterTap){clearTimeout(pendingClusterTap.timer);pendingClusterTap=null}});
render();
