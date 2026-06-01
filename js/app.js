// ===============================
// ตั้งค่า Google Sheet ตรงนี้
// ===============================
// วิธีใช้จริง:
// 1) สร้าง Google Sheet ตามหัวคอลัมน์ใน README
// 2) File > Share > Publish to web > เลือกชีต places > CSV
// 3) Copy ลิงก์ CSV มาใส่แทนค่าว่างด้านล่าง
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSim_eaXv3whiMW0UKPV2GcF_VgkwOYEDNWTQoN4tKxWOW-yorDSrgo0lw7PioqxToN9VKS5RBtRiRB/pub?gid=0&single=true&output=csv";

// ลิงก์ Google Sheet สำหรับปุ่มแก้ไขข้อมูล
const SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1uXn0OJ_sY2OnYiuTLisw84AQJkF3FYwBy7IaSF6CqsQ/edit?usp=sharing";

// ถ้ายังไม่ใส่ Google Sheet ระบบจะใช้ไฟล์ตัวอย่างนี้ก่อน
const FALLBACK_JSON = "./data/places.json";

const BANMUANG = { lat: 17.85167, lng: 103.57 };
let allPlaces = [];
let markers = [];
let userMarker = null;

const map = L.map("map").setView([BANMUANG.lat, BANMUANG.lng], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const countEl = document.getElementById("count");
const qEl = document.getElementById("q");
const catEl = document.getElementById("category");
const sortEl = document.getElementById("sort");
const sheetBtn = document.getElementById("sheetBtn");

sheetBtn.href = SHEET_EDIT_URL || "#";
if(!SHEET_EDIT_URL) sheetBtn.onclick = (e)=>{ e.preventDefault(); alert("ยังไม่ได้ตั้งค่า SHEET_EDIT_URL ใน js/app.js"); };

function setStatus(msg){ statusEl.textContent = msg; }

document.getElementById("homeBtn").onclick = () => map.setView([BANMUANG.lat, BANMUANG.lng], 13);
document.getElementById("locateBtn").onclick = () => {
  if(!navigator.geolocation){ alert("เบราว์เซอร์นี้ไม่รองรับ GPS"); return; }
  setStatus("กำลังหาตำแหน่ง...");
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    if(userMarker) userMarker.remove();
    userMarker = L.marker([lat,lng]).addTo(map).bindPopup("📍 ตำแหน่งของฉัน").openPopup();
    map.setView([lat,lng], 15);
    setStatus("แสดงตำแหน่งของคุณแล้ว");
  }, () => setStatus("ไม่สามารถอ่านตำแหน่งได้"));
};

qEl.addEventListener("input", render);
catEl.addEventListener("change", render);
sortEl.addEventListener("change", render);
document.getElementById("clearBtn").onclick = () => { qEl.value=""; catEl.value=""; render(); };

async function loadPlaces(){
  setStatus("กำลังโหลดข้อมูลร้าน...");
  try{
    if(SHEET_CSV_URL){
      const res = await fetch(SHEET_CSV_URL + (SHEET_CSV_URL.includes("?") ? "&" : "?") + "t=" + Date.now(), {cache:"no-store"});
      if(!res.ok) throw new Error("โหลด Google Sheet ไม่ได้");
      const csv = await res.text();
      allPlaces = csvToObjects(csv).map(normalizePlace).filter(validPlace);
      setStatus("โหลดข้อมูลจาก Google Sheet สำเร็จ");
    }else{
      const res = await fetch(FALLBACK_JSON + "?t=" + Date.now(), {cache:"no-store"});
      allPlaces = (await res.json()).map(normalizePlace).filter(validPlace);
      setStatus("กำลังใช้ข้อมูลตัวอย่าง: ให้ตั้งค่า Google Sheet ใน js/app.js");
    }
    render();
  }catch(err){
    console.error(err);
    resultsEl.innerHTML = `<div class="empty">โหลดข้อมูลร้านไม่ได้<br>${escapeHtml(err.message)}</div>`;
    setStatus("โหลดข้อมูลไม่สำเร็จ");
  }
}

function normalizePlace(p){
  return {
    name: clean(p.name || p["ชื่อร้าน"]),
    category: clean(p.category || p["หมวดหมู่"]),
    lat: parseFloat(p.lat || p.latitude || p["ละติจูด"]),
    lng: parseFloat(p.lng || p.lon || p.longitude || p["ลองจิจูด"]),
    phone: clean(p.phone || p["เบอร์โทร"]),
    open: clean(p.open || p["เวลาเปิด"]),
    menu: clean(p.menu || p["เมนูแนะนำ"]),
    detail: clean(p.detail || p.description || p["รายละเอียด"]),
    image: clean(p.image || p.photo || p["รูปภาพ"]),
    map_url: clean(p.map_url || p["ลิงก์แผนที่"])
  };
}

function validPlace(p){ return p.name && !isNaN(p.lat) && !isNaN(p.lng); }
function clean(v){ return String(v ?? "").trim(); }

function render(){
  clearMarkers();

  const q = qEl.value.trim().toLowerCase();
  const cat = catEl.value;
  const sort = sortEl.value;

  let places = allPlaces.filter(p => {
    const text = `${p.name} ${p.category} ${p.menu} ${p.detail}`.toLowerCase();
    return (!q || text.includes(q)) && (!cat || p.category === cat);
  });

  places.sort((a,b) => String(a[sort] || "").localeCompare(String(b[sort] || ""), "th"));

  countEl.textContent = `${places.length} ร้าน`;

  if(!places.length){
    resultsEl.innerHTML = `<div class="empty">ไม่พบร้านตามเงื่อนไข<br>ลองล้างคำค้นหาหรือเลือกหมวดหมู่ทั้งหมด</div>`;
    return;
  }

  resultsEl.innerHTML = "";
  const bounds = [];

  places.forEach((p, i) => {
    const navUrl = p.map_url || `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    const card = document.createElement("div");
    card.className = "place";
    card.innerHTML = `
      <h3>${i+1}. ${escapeHtml(p.name)}</h3>
      <span class="tag">${escapeHtml(p.category || "ร้านแนะนำ")}</span>
      ${p.image ? `<img class="photo" src="${escapeAttr(p.image)}" loading="lazy" alt="${escapeAttr(p.name)}">` : ""}
      <div class="meta">
        ${p.open ? `🕒 ${escapeHtml(p.open)}<br>` : ""}
        ${p.phone ? `☎ ${escapeHtml(p.phone)}<br>` : ""}
        ${p.menu ? `🍽️ เมนูแนะนำ: ${escapeHtml(p.menu)}` : ""}
      </div>
      ${p.detail ? `<div class="desc">${escapeHtml(p.detail)}</div>` : ""}
      <div class="actions">
        <a href="${escapeAttr(navUrl)}" target="_blank">นำทาง</a>
        <a class="alt" href="#" data-lat="${p.lat}" data-lng="${p.lng}">ดูหมุด</a>
      </div>
    `;
    resultsEl.appendChild(card);

    const popup = `
      <b>${escapeHtml(p.name)}</b><br>
      ${escapeHtml(p.category || "ร้านแนะนำ")}<br>
      ${p.menu ? "🍽️ " + escapeHtml(p.menu) + "<br>" : ""}
      <a href="${escapeAttr(navUrl)}" target="_blank">นำทาง</a>
    `;
    const marker = L.marker([p.lat, p.lng]).addTo(map).bindPopup(popup);
    marker.on("click", () => card.scrollIntoView({behavior:"smooth", block:"center"}));
    markers.push(marker);
    bounds.push([p.lat, p.lng]);
  });

  document.querySelectorAll("[data-lat]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const lat = parseFloat(btn.dataset.lat);
      const lng = parseFloat(btn.dataset.lng);
      map.setView([lat,lng], 17);
      const m = markers.find(x => {
        const ll = x.getLatLng();
        return Math.abs(ll.lat-lat) < .00001 && Math.abs(ll.lng-lng) < .00001;
      });
      if(m) m.openPopup();
    };
  });

  if(bounds.length) map.fitBounds(bounds, {padding:[35,35]});
}

function clearMarkers(){ markers.forEach(m=>m.remove()); markers=[]; }

// CSV parser รองรับ comma และข้อความใน quote
function csvToObjects(csv){
  const rows = parseCSV(csv).filter(r => r.some(c => String(c).trim() !== ""));
  if(rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h,i) => obj[h] = row[i] || "");
    return obj;
  });
}
function parseCSV(text){
  const rows = [];
  let row = [], cell = "", q = false;
  for(let i=0;i<text.length;i++){
    const c = text[i], n = text[i+1];
    if(c === '"' && q && n === '"'){ cell += '"'; i++; }
    else if(c === '"'){ q = !q; }
    else if(c === "," && !q){ row.push(cell); cell = ""; }
    else if((c === "\n" || c === "\r") && !q){
      if(c === "\r" && n === "\n") i++;
      row.push(cell); rows.push(row); row=[]; cell="";
    } else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows;
}

function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,"&#096;"); }

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
  window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
}

loadPlaces();
