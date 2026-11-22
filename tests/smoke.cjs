'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const games=['battleship','pyramid-solitaire','blackjack','mahjong','flow-connect','puzzle-15','falling-blocks','brick-breaker','space-invaders','maze-chase','frogger','word-search','hangman','memory-match'];
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname.endsWith('/'))pathname+='index.html';
  const dest=path.resolve(root,'.'+pathname);
  if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(dest,(err,buf)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(dest)]||'application/octet-stream'}).end(buf);});
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const sleep=n=>new Promise(resolve=>setTimeout(resolve,n));
(async()=>{
 await listen();
 let browser;
 try{
  const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
  if(!bin)throw Error('Chrome unavailable on runner');
  browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
  for(const mode of ['mobile','desktop']){
   const context=await browser.newContext(mode==='mobile'
     ?{viewport:{width:393,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}
     :{viewport:{width:1280,height:800}});
   const page=await context.newPage();
   const failures=[];
   page.on('pageerror',e=>failures.push(String(e)));
   page.on('console',e=>{if(e.type()==='error')failures.push('Console: '+e.text())});
   const base='http://127.0.0.1:'+server.address().port;
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('.game-choice').count(),14,'14 selectable games in hub');
   for(const game of games){
    failures.length=0;
    await page.goto(base+'/'+game+'/',{waitUntil:'load'});
    await page.waitForTimeout(160);
    assert.equal(await page.locator('h1').count(),1,'Heading exists '+game);
    assert.equal(await page.locator('#play').count(),1,'Play surface exists '+game);
    const count=await page.locator('#play button,#play canvas').count();
    assert.ok(count>0,'Interactive gameplay exists '+game);
    const status=await page.locator('#score').innerText();
    assert.ok(status.length>0,'Score/status exists '+game);
    assert.equal(failures.length,0,'Runtime exceptions for '+game+': '+failures.join('; '));
    // Exercise an actual input on puzzle/board/card games, then validate state.
    if(game==='battleship')await page.locator('.battleship-board').first().locator('button:not([disabled])').first().click();
    if(game==='blackjack')await page.getByRole('button',{name:'Σταμάτα'}).click();
    if(game==='puzzle-15')await page.locator('#play button:not([disabled])').first().click();
    if(game==='memory-match')await page.locator('#play button:not([disabled])').first().click();
    if(game==='hangman')await page.locator('#play button:not([disabled])').first().click();
    if(game==='mahjong')await page.locator('#play button:not([disabled])').first().click();
    if(game==='flow-connect')await page.locator('#play button').first().click();
    if(game==='word-search')await page.locator('#play button').first().click();
    if(game==='pyramid-solitaire')await page.locator('#play button:not([disabled])').first().click();
    await page.waitForTimeout(60);
    assert.equal(failures.length,0,'Gameplay exceptions '+game+': '+failures.join('; '));
    console.log('PASS '+mode+' '+game+' · '+status.slice(0,70));
   }
   await context.close();
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
