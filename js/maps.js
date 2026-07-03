/* maps.js
   Map integration using Leaflet (OpenStreetMap). Shows user marker, hospital markers, distance calculation and routing (basic).
   This is a free alternative to Google Maps and works without API keys.
*/

let MediMaps = (function(){
  let map, userMarker, hospitalLayer;
  async function init(){
    map = L.map('map', {zoomControl:true}).setView([11.6643,78.1460], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    hospitalLayer = L.layerGroup().addTo(map);
    // load hospitals from DB
    const res = await fetch('database/hospitals.json'); const hospitals = await res.json();
    hospitals.forEach(h=>{
      const marker = L.marker([h.coordinates.lat, h.coordinates.lng], {title:h.name}).addTo(hospitalLayer);
      marker.bindPopup(`<strong>${h.name}</strong><br>${h.address}<br>Beds: ${h.bedsAvailable} • ICU: ${h.icu ? 'Yes' : 'No'}<br><a href="${h.mapsLink}" target="_blank">Open in Maps</a>`);
    });
  }

  function updateUserMarker(loc){
    if(!map) return;
    if(userMarker) userMarker.setLatLng([loc.lat, loc.lng]);
    else {
      userMarker = L.circleMarker([loc.lat, loc.lng], {radius:8, color:'#ff3b30', fillColor:'#ff7b7b', fillOpacity:0.9}).addTo(map);
      userMarker.bindPopup('You (live location)');
    }
    map.setView([loc.lat, loc.lng], 14);
  }

  function locateUser(promptIfDenied=false){
    if(!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      const loc = {lat: pos.coords.latitude, lng: pos.coords.longitude};
      updateUserMarker(loc);
    }, err=>{
      if(promptIfDenied) alert('Unable to get location: ' + err.message);
    }, {enableHighAccuracy:true});
  }

  return {init, updateUserMarker, locateUser};
})();

window.addEventListener('load', ()=> MediMaps.init());
window.MediMaps = MediMaps;

/* Expose helper for app */
function mapsLocateUser(promptIfDenied=false){ MediMaps.locateUser(promptIfDenied); }
