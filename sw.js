const C='varga-piano-neve-v67-google-nav-ui',A=['./','./index.html','./style.css?v=67','./major-network.js?v=3','./major-offline-nav.js?v=3','./major-routes.js?v=4','./routes-rebuilt.js?v=4','./routes-instructions.js?v=1','./snow-config.js?v=67','./snow-auth.js?v=67','./app.js?v=67','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))])));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);
 if(req.mode==='navigate'){
   const fresh=new Request(req,{cache:'no-store'});
   e.respondWith(fetch(fresh).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put('./index.html',x));return r}).catch(()=>caches.match('./index.html')));
   return
 }
 const same=u.origin===self.location.origin;
 const versioned=same&&(/\?v=/.test(u.search)||u.pathname.endsWith('/manifest.webmanifest'));
 const cachedExternal=/unpkg\.com|tile\.openstreetmap\.org|arcgisonline\.com/.test(u.hostname);
 if(versioned||cachedExternal){
   e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{if(req.method==='GET'&&(r.ok||r.type==='opaque')){const x=r.clone();caches.open(C).then(c=>c.put(req,x))}return r})));
   return
 }
 e.respondWith(fetch(req).then(r=>{if(req.method==='GET'&&(r.ok||r.type==='opaque')){const x=r.clone();caches.open(C).then(c=>c.put(req,x))}return r}).catch(()=>caches.match(req)))
});
