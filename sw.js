// Versão do cache — só existe para dar nome ao "balde" de armazenamento offline.
// Não precisa ser incrementada manualmente a cada atualização: a estratégia
// abaixo (network-first para tudo) já garante que o app sempre busca a versão
// mais nova quando há internet. O cache serve só de reserva para quando o
// dispositivo estiver genuinamente offline.
const CACHE_NAME = 'gd-app-v2';

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
  // Assume o controle imediatamente, sem esperar as abas antigas fecharem.
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
  // Passa a controlar as páginas já abertas na hora — combinado com o aviso
  // de "controllerchange" no index.html, isso dispara um recarregamento
  // automático assim que uma versão nova é detectada, sem ação manual.
  self.clients.claim();
});

// Estratégia ÚNICA para toda a origem (documento, imagens, scripts, etc.):
// NETWORK-FIRST. Busca sempre na internet primeiro; só cai para o cache
// guardado quando a rede falha de verdade (offline). Isso garante que
// atualizações — inclusive imagens novas em pastas novas — apareçam
// automaticamente na próxima vez que houver conexão, sem o dispositivo
// nunca "prender" numa versão antiga.
self.addEventListener('fetch', function(event){
  const req = event.request;

  // Só cuida de GET na própria origem — deixa tudo mais passar direto.
  if(req.method !== 'GET' || !req.url.startsWith(self.location.origin)){
    return;
  }

  event.respondWith(
    fetch(req).then(function(res){
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        if(cached) return cached;
        // Sem cache específico e sem rede: para navegação, cai no shell salvo.
        if(req.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      });
    })
  );
});
