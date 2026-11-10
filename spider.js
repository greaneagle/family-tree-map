// A city cluster expands in-place on tap; no automatic zoom or shared popup.
let expandedCity=null;
function placeKey(p){return `${Number(p.lat).toFixed(3)},${Number(p.lng).toFixed(3)}`}
function isMappable(p){return p.lat!==''&&p.lng!==''&&p.lat!=null&&p.lng!=null&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))}
function personContent(p){
 const spouses=(p.spouseIds||[]).map(id=>people.find(x=>x.id===id)?.name).filter(Boolean);
 return `<div class="person-popup"><b>${esc(p.name)}</b><div class="relation-pill">${esc(displayedRelation(p))}</div><p>⌖ ${esc(p.location)}</p><p>${fmtGen(Number(p.generation)||0)}</p><p>Branch: ${esc(p.branch||'Unassigned')}</p>${p.locationSource==='estimated'?`<p class="estimated">⚠ ${esc(p.locationNote||'Estimated from relative')}</p>`:''}${spouses.length?`<p class="spouse-note">♥ ${spouses.map(esc).join(', ')}</p>`:''}${p.birth?`<p>Born: ${esc(p.birth)}</p>`:''}${p.death?`<p>Died: ${esc(p.death)}</p>`:''}</div>`
}
function spreadCoordinates(group,force){
 const base=L.latLng(Number(group[0].lat),Number(group[0].lng));
 const origin=map.latLngToLayerPoint(base);
 if(group.length===1||!force)return group.map(()=>base);
 // Pixel-space spiral is independent of the map zoom: every relative gets a hit target.
 return group.map((p,i)=>{
   const angle=i*2.399963229728653;
   const distance=group.length===2?34:Math.min(175,28+Math.sqrt(i+1)*21);
   return map.layerPointToLatLng(L.point(origin.x+Math.cos(angle)*distance,origin.y+Math.sin(angle)*distance));
 });
}
function drawPerson(p,position,base,spread){
 if(spread&&base.distanceTo(position)>1){L.polyline([base,position],{color:'#9eb9ab',opacity:.6,weight:1.5,dashArray:'3 4',interactive:false,className:'spider-leg'}).addTo(markers)}
 const marker=L.circleMarker(position,{radius:Math.max(9,radius(Number(p.generation)||0)),color:p.locationSource==='estimated'?'#735b46':'#fff',dashArray:p.locationSource==='estimated'?'3 3':undefined,weight:2.5,fillColor:shadedBranch(p),fillOpacity:.96,className:'spider-person',bubblingMouseEvents:false});
 marker.bindPopup(personContent(p),{maxWidth:300});
 marker.bindTooltip(`<strong>${esc(p.name)}</strong><small>${esc(displayedRelation(p))}</small>`,{direction:'top',offset:[0,-10],className:'family-tooltip'});
 marker.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);marker.openPopup()});
 marker.addTo(markers);
 return marker;
}
render=function(){
 if(typeof animationFrame!=='undefined'&&animationFrame)cancelAnimationFrame(animationFrame);
 markers.clearLayers();
 const query=$('search').value.trim().toLowerCase(),branch=$('branch').value,max=Number($('genRange').value),fullMax=Number($('genRange').max);
 $('genLabel').textContent=max===fullMax?'All generations':`Up to ${max} back`;
 const displayed=people.filter(p=>(branch==='all'||p.branch===branch)&&(Number(p.generation)||0)<=max&&(!query||`${p.name} ${p.location} ${p.branch||''} ${p.relationship||''}`.toLowerCase().includes(query)));
 const mapped=displayed.filter(isMappable);
 const groups=new Map();for(const p of mapped){const key=placeKey(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}
 const positions=new Map();const compact=$('clusterToggle').checked&&map.getZoom()<7;
 for(const [key,group] of groups){
   const base=L.latLng(Number(group[0].lat),Number(group[0].lng));
   if(compact&&group.length>1&&expandedCity!==key){
     const diameter=Math.min(64,29+Math.sqrt(group.length)*7);
     const html=`<div class="cluster" style="width:${diameter}px;height:${diameter}px;background:${shadedBranch(group[0])}">${group.length}</div>`;
     const marker=L.marker(base,{icon:L.divIcon({html,className:'dot-label',iconSize:[diameter,diameter],iconAnchor:[diameter/2,diameter/2]}),bubblingMouseEvents:false});
     marker.bindTooltip(`${group.length} relatives here · tap to separate`,{direction:'top',className:'family-tooltip'});
     marker.on('click',e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e.originalEvent);expandedCity=key;map.closePopup();render()});
     marker.addTo(markers);
     group.forEach(p=>positions.set(p.id,base));
     continue;
   }
   const spread=group.length>1&&(expandedCity===key||relationSettings.spread);
   const points=spreadCoordinates(group,spread);
   group.forEach((p,i)=>{positions.set(p.id,points[i]);drawPerson(p,points[i],base,spread)});
 }
 if(relationSettings.showSpouses){
   const byId=new Map(mapped.map(p=>[p.id,p])),done=new Set();
   for(const p of mapped)for(const spouseId of p.spouseIds||[]){
     if(!byId.has(spouseId))continue;
     const pair=[p.id,spouseId].sort().join('|');if(done.has(pair))continue;done.add(pair);
     const a=positions.get(p.id),b=positions.get(spouseId);if(!a||!b)continue;
     const x=map.latLngToLayerPoint(a),y=map.latLngToLayerPoint(b),dx=y.x-x.x,dy=y.y-x.y,dist=Math.hypot(dx,dy);if(dist<3)continue;
     const curve=[];for(let i=0;i<=12;i++){const t=i/12,bend=Math.min(45,dist*.14)*Math.sin(Math.PI*t);curve.push(map.layerPointToLatLng(L.point(x.x+dx*t-dy/dist*bend,x.y+dy*t+dx/dist*bend)))}
     L.polyline(curve,{color:'#bf7887',opacity:.65,weight:2,dashArray:'5 6',interactive:false,className:'spouse-line'}).addTo(markers).bringToBack();
   }
 }
 $('peopleCount').textContent=displayed.length;$('placeCount').textContent=groups.size;$('empty').style.display=displayed.length?'none':'block';
 $('mapSubtitle').textContent=`${displayed.length} people · ${groups.size} mapped places`;
 $('insight').textContent=expandedCity&&groups.has(expandedCity)?`${groups.get(expandedCity).length} relatives separated. Tap an individual for details, or tap empty map to close.`:`Tap a numbered group to separate its relatives without zooming. ${displayed.filter(p=>p.locationSource==='estimated').length} estimated locations.`;
};
map.on('click',()=>{if(expandedCity!==null){expandedCity=null;render()}});
map.on('zoomstart',()=>{expandedCity=null});
render();
