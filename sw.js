/* Isolated /games/ offline-first cache; never touches other app caches. */
const CACHE="games-shell-v21-arrival-push-ready";
const FILES=["./","./index.html","./manifest.webmanifest","./shared/theme.css","./shared/core.js","./will-they-come/index.html","./will-they-come/game.js","./will-they-come/push.js","./battleship/index.html","./battleship/game.js","./pyramid-solitaire/index.html","./pyramid-solitaire/game.js","./blackjack/index.html","./blackjack/game.js","./mahjong/index.html","./mahjong/game.js","./flow-connect/index.html","./flow-connect/levels.js","./flow-connect/game.js","./water-sort/index.html","./water-sort/style.css","./water-sort/levels.js","./water-sort/game.js","./puzzle-15/index.html","./puzzle-15/game.js","./falling-blocks/index.html","./falling-blocks/game.js","./brick-breaker/index.html","./brick-breaker/game.js","./space-invaders/index.html","./space-invaders/game.js","./maze-chase/index.html","./maze-chase/levels.js","./maze-chase/game.js","./frogger/index.html","./frogger/levels.js","./frogger/game.js","./word-search/index.html","./word-search/game.js","./hangman/index.html","./hangman/game.js","./memory-match/index.html","./memory-match/game.js","./chessfunny/engine.js","./chessfunny/hero-banner.svg","./chessfunny/icon.svg","./chessfunny/index.html","./chessfunny/manifest.webmanifest","./minesweeperfunny/hero-banner.svg","./minesweeperfunny/index.html","./monopolyfunny/hero-banner.svg","./monopolyfunny/icon.svg","./monopolyfunny/index.html","./monopolyfunny/manifest.webmanifest","./monopolyfunny/sw.js","./quizfunny/app.js","./quizfunny/hero-banner.svg","./quizfunny/icon.svg","./quizfunny/index.html","./quizfunny/manifest.webmanifest","./quizfunny/questions.js","./quizfunny/sw.js","./reversifunny/app.js","./reversifunny/engine.js","./reversifunny/hero-banner.svg","./reversifunny/icon.svg","./reversifunny/index.html","./reversifunny/manifest.webmanifest","./reversifunny/style.css","./reversifunny/sw.js","./solitairefunny/hero-banner.svg","./solitairefunny/index.html","./sudokufunny/app.js","./sudokufunny/hero-banner.svg","./sudokufunny/icon.svg","./sudokufunny/index.html","./sudokufunny/manifest.webmanifest","./sudokufunny/style.css","./sudokufunny/sudoku-engine.js","./sudokufunny/sw.js","./tavlifunny/hero-banner.svg","./tavlifunny/index.html","./tichufunny/engine.js","./tichufunny/hero-banner.svg","./tichufunny/index.html","./tichufunnyonline/engine.js","./tichufunnyonline/hero-banner.svg","./tichufunnyonline/index.html"];
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

/* Notifications for the arrival-prediction game only. Existing games keep their caches and routes. */
self.addEventListener("push",event=>{
  let payload;
  try{payload=event.data?.json()||{};}catch{payload={};}
  const target=new URL("./will-they-come/",self.registration.scope);
  let destination=target.href;
  try{
    const requested=new URL(String(payload.url||""),self.location.origin);
    if(requested.origin===target.origin&&requested.pathname.startsWith(target.pathname))
      destination=requested.href;
  }catch{}
  const title=typeof payload.title==="string"?payload.title.slice(0,100):"🎯 Νέο στοίχημα";
  const body=typeof payload.body==="string"?payload.body.slice(0,200):"Άνοιξε το παιχνίδι για να ποντάρεις.";
  const tag=typeof payload.tag==="string"&&payload.tag.startsWith("arrival-")?payload.tag.slice(0,120):"arrival-game-notification";
  event.waitUntil(self.registration.showNotification(title,{
    body,tag,renotify:false,data:{url:destination},vibrate:[90,50,90]
  }));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const base=new URL("./will-they-come/",self.registration.scope);
  let destination=base.href;
  try{
    const requested=new URL(String(event.notification?.data?.url||""),self.location.origin);
    if(requested.origin===base.origin&&requested.pathname.startsWith(base.pathname))
      destination=requested.href;
  }catch{}
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:"window",includeUncontrolled:true});
    const current=windows.find(w=>{
      try{return new URL(w.url).pathname.startsWith(base.pathname);}catch{return false;}
    });
    if(current){await current.focus();if(current.url!==destination&&current.navigate)await current.navigate(destination);return;}
    await clients.openWindow(destination);
  })());
});
