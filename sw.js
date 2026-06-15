const CACHE_NAME = 'gd-app-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo-gd.png',
  './logo-gd-circle.png',
  './logo-splash.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){ return key !== CACHE_NAME; })
            .map(function(key){ return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  const req = event.request;

  // Only handle GET requests for our own origin
  if(req.method !== 'GET' || !req.url.startsWith(self.location.origin)){
    return;
  }

  // Network-first for the main document, cache-first for static assets
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(function(res){
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        return res;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
