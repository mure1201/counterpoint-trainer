const CACHE_NAME="counterpoint-v16";
const CORE=["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./icon-192.svg","./icon-512.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{if(e.data&&e.data.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url),same=u.origin===self.location.origin,isNav=r.mode==="navigate";
  if(isNav||(same&&/\.(?:js|css|html|webmanifest)$/.test(u.pathname))){
    e.respondWith(fetch(r,{cache:"no-store"}).then(res=>{const cp=res.clone();caches.open(CACHE_NAME).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(x=>x||caches.match("./index.html"))));return;
  }
  e.respondWith(caches.match(r).then(x=>x||fetch(r)));
});