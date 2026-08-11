
const CACHE_NAME="counterpoint-v05";
const CORE=["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./icon-192.svg","./icon-512.svg"];

self.addEventListener("install", event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE))
  );
});

self.addEventListener("activate", event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("message", event=>{
  if(event.data && event.data.type==="SKIP_WAITING"){
    self.skipWaiting();
  }
});

// HTML/JS/CSSはネット優先。失敗時のみキャッシュ。
// これでGitHub Pages更新後に古い画面が残りにくくなる。
self.addEventListener("fetch", event=>{
  const req=event.request;
  if(req.method!=="GET") return;

  const isNavigation=req.mode==="navigate";
  const url=new URL(req.url);
  const sameOrigin=url.origin===self.location.origin;

  if(isNavigation || (sameOrigin && /\.(?:js|css|html|webmanifest)$/.test(url.pathname))){
    event.respondWith(
      fetch(req,{cache:"no-store"})
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
          return res;
        })
        .catch(()=>caches.match(req).then(r=>r||caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      if(sameOrigin){
        const copy=res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
      }
      return res;
    }))
  );
});
