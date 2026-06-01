const BANMUANG = { lat: 17.85167, lng: 103.57 };
let current = { ...BANMUANG };
let userMarker, circle, markers = [];

const map = L.map("map", { zoomControl: true }).setView([BANMUANG.lat, BANMUANG.lng], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

function setStatus(msg){ document.getElementById("status").textContent = msg; }
function km(m){ return m < 1000 ? `${Math.round(m)} ม.` : `${(m/1000).toFixed(1)} กม.`; }

function distance(a,b,c,d){
  const R=6371000, toRad=x=>x*Math.PI/180;
  const dLat=toRad(c-a), dLng=toRad(d-b);
  const s=Math.sin(dLat/2)**2 + Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

function setPoint(lat,lng){
  current = {lat,lng};
  if(userMarker) userMarker.remove();
  if(circle) circle.remove();
  userMarker = L.marker([lat,lng], {draggable:true}).addTo(map).bindPopup("📍 จุดค้นหา").openPopup();
  userMarker.on("dragend", e => {
    const p=e.target.getLatLng();
    setPoint(p.lat,p.lng);
  });
  const r = Number(document.getElementById("radius").value);
  circle = L.circle([lat,lng], {radius:r}).addTo(map);
  map.setView([lat,lng], 14);
  setStatus(`จุดค้นหา: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}
setPoint(BANMUANG.lat, BANMUANG.lng);

map.on("click", e => setPoint(e.latlng.lat, e.latlng.lng));
document.getElementById("homeBtn").onclick = () => setPoint(BANMUANG.lat, BANMUANG.lng);

document.getElementById("locateBtn").onclick = () => {
  if(!navigator.geolocation){ setStatus("เบราว์เซอร์นี้ไม่รองรับ GPS"); return; }
  setStatus("กำลังขอตำแหน่ง...");
  navigator.geolocation.getCurrentPosition(
    pos => setPoint(pos.coords.latitude, pos.coords.longitude),
    () => setStatus("ไม่สามารถอ่านตำแหน่งได้ กรุณาอนุญาต Location หรือปักหมุดเอง"),
    {enableHighAccuracy:true, timeout:10000}
  );
};

document.getElementById("radius").onchange = () => setPoint(current.lat,current.lng);
document.getElementById("searchBtn").onclick = searchPlaces;

function buildQuery(lat,lng,radius,cat){
  let filters;
  if(cat === "food_all"){
    filters = `node["amenity"~"restaurant|cafe|fast_food|food_court"](around:${radius},${lat},${lng});way["amenity"~"restaurant|cafe|fast_food|food_court"](around:${radius},${lat},${lng});relation["amenity"~"restaurant|cafe|fast_food|food_court"](around:${radius},${lat},${lng});`;
  } else {
    filters = `node["amenity"="${cat}"](around:${radius},${lat},${lng});way["amenity"="${cat}"](around:${radius},${lat},${lng});relation["amenity"="${cat}"](around:${radius},${lat},${lng});`;
  }
  return `[out:json][timeout:25];(${filters});out center tags;`;
}

async function overpass(query){
  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
  ];
  let lastErr;
  for(const url of endpoints){
    try{
      const res = await fetch(url, {method:"POST", body: new URLSearchParams({data: query})});
      if(!res.ok) throw new Error("HTTP "+res.status);
      return await res.json();
    }catch(e){ lastErr=e; }
  }
  throw lastErr;
}

async function searchPlaces(){
  const radius = Number(document.getElementById("radius").value);
  const cat = document.getElementById("category").value;
  setStatus("กำลังค้นหาร้านจาก OpenStreetMap...");
  document.getElementById("results").innerHTML = `<div class="empty">กำลังโหลดข้อมูล...</div>`;
  clearMarkers();

  try{
    const data = await overpass(buildQuery(current.lat,current.lng,radius,cat));
    let places = (data.elements || []).map(x => {
      const lat = x.lat || x.center?.lat;
      const lng = x.lon || x.center?.lon;
      const tags = x.tags || {};
      return {lat,lng,tags,dist: distance(current.lat,current.lng,lat,lng)};
    }).filter(p => p.lat && p.lng && p.tags.name).sort((a,b)=>a.dist-b.dist);

    render(places);
    setStatus(`พบ ${places.length} ร้าน ในรัศมี ${km(radius)}`);
  }catch(e){
    console.error(e);
    document.getElementById("results").innerHTML = `<div class="empty">ค้นหาไม่ได้ อาจเกิดจาก Overpass API ชั่วคราว กรุณาลองใหม่ หรืออัปโหลดขึ้น GitHub Pages ก่อนใช้งานจริง</div>`;
    setStatus("ค้นหาไม่สำเร็จ");
  }
}

function clearMarkers(){ markers.forEach(m=>m.remove()); markers=[]; }

function render(places){
  document.getElementById("count").textContent = `${places.length} ร้าน`;
  const box = document.getElementById("results");
  if(!places.length){ box.innerHTML = `<div class="empty">ไม่พบร้านในพื้นที่นี้ ลองเพิ่มรัศมีเป็น 10–15 กม.</div>`; return; }

  box.innerHTML = "";
  places.forEach((p,i)=>{
    const t=p.tags;
    const type = t.amenity === "cafe" ? "☕ คาเฟ่/กาแฟ" : t.amenity === "fast_food" ? "🍔 ฟาสต์ฟู้ด" : "🍛 ร้านอาหาร";
    const gmap = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`;
    const tel = t.phone || t["contact:phone"] || "";
    const addr = [t["addr:housenumber"],t["addr:street"],t["addr:subdistrict"],t["addr:district"]].filter(Boolean).join(" ");
    const html = `<div class="place">
      <h3>${i+1}. ${escapeHtml(t.name)}</h3>
      <div class="meta">${type}<br>ห่างประมาณ ${km(p.dist)}${addr?`<br>📌 ${escapeHtml(addr)}`:""}${tel?`<br>☎ ${escapeHtml(tel)}`:""}</div>
      <div class="actions">
        <a href="${gmap}" target="_blank">นำทาง</a>
        <a class="alt" href="${osm}" target="_blank">ดูบน OSM</a>
      </div>
    </div>`;
    box.insertAdjacentHTML("beforeend", html);

    const m = L.marker([p.lat,p.lng]).addTo(map).bindPopup(`<b>${escapeHtml(t.name)}</b><br>${type}<br>${km(p.dist)}<br><a href="${gmap}" target="_blank">นำทาง</a>`);
    markers.push(m);
  });
}

function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").classList.remove("hidden");
});
document.getElementById("installBtn").onclick = async () => {
  if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; }
};

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
}
