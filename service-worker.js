const CACHE = "banmuang-foodmap-sheet-v1";
const ASSETS = ["./","./index.html","./css/style.css","./js/app.js","./data/places.json","./manifest.json"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(url.hostname.includes("docs.google.com") || url.hostname.includes("googleusercontent.com") || url.hostname.includes("tile.openstreetmap.org") || url.hostname.includes("unpkg.com")){
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
