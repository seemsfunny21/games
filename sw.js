/* Isolated /games/ offline-first cache; never touches other app caches. */
const CACHE="games-shell-v6-touch-controls";
const FILES=["./","./index.html","./manifest.webmanifest","./shared/theme.css","./shared/core.js","./battleship/index.html","./battleship/game.js","./pyramid-solitaire/index.html","./pyramid-solitaire/game.js","./blackjack/index.html","./blackjack/game.js","./mahjong/index.html","./mahjong/game.js","./flow-connect/index.html","./flow-connect/game.js","./puzzle-15/index.html","./puzzle-15/game.js","./falling-blocks/index.html","./falling-blocks/game.js","./brick-breaker/index.html","./brick-breaker/game.js","./space-invaders/index.html","./space-invaders/game.js","./maze-chase/index.html","./maze-chase/game.js","./frogger/index.html","./frogger/game.js","./word-search/index.html","./word-search/game.js","./hangman/index.html","./hangman/game.js","./memory-match/index.html","./memory-match/game.js"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith("games-shell-")&&x!==CACHE).map(x=>caches.delete(x)))),
  self.clients.claim()
 ]));
});
self.addEventListener("fetch",event=>{
 const req=event.request,url=new URL(req.url),scope=new URL(self.registration.scope);
 if(req.method!=="GET"||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
    const res=await fetch(req,{cache:"no-store"});
    if(res.ok&&res.type==="basic")await cache.put(req,res.clone());
    return res;
  }catch{
    return await cache.match(req,{ignoreSearch:true})||Response.error();
  }
 })());
});
