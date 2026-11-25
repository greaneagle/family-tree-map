// Keep the source place for future use, while the atlas consistently uses the locality before the first comma.
function atlasLocality(value){
 return String(value||'').split(',',1)[0].trim();
}
function standardizeAtlasPlaces(items){
 for(const person of items||[]){
  const source=String(person.fullLocation||person.location||'').trim();
  if(source&&!person.fullLocation)person.fullLocation=source;
  person.location=atlasLocality(source);
 }
 return items;
}

const parseCSVWithFullPlaces=parseCSV;
parseCSV=function(text){return standardizeAtlasPlaces(parseCSVWithFullPlaces(text))};

const gedToPeopleWithFullPlaces=gedToPeople;
gedToPeople=function(anchorId){return standardizeAtlasPlaces(gedToPeopleWithFullPlaces(anchorId))};

standardizeAtlasPlaces(samples);
if(Array.isArray(people)&&people.length){
 const before=JSON.stringify(people);
 standardizeAtlasPlaces(people);
 if(JSON.stringify(people)!==before)localStorage.setItem(KEY,JSON.stringify(people));
 populateBranches();render();
}
