'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const html=fs.readFileSync(path.join(__dirname,'../solitairefunny/index.html'),'utf8');
const server=http.createServer((req,res)=>{
 if(req.url?.startsWith('/solitairefunny/index.html')||req.url==='/'){
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);
 }else{res.writeHead(404);res.end('Not found');}
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const close=()=>new Promise(resolve=>server.close(resolve));
function seedState(overrides={}){
 return {t:Array.from({length:7},()=>[]),f:[[],[],[],[]],stock:[],waste:[],
  moves:0,done:false,drawCount:1,manualFoundationCards:[],...overrides};
}
const card=(s,v)=>({s,v,up:true});
(async()=>{
 await listen();
 const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium']
   .find(name=>fs.existsSync(name));
 if(!executablePath)throw Error('Chrome/Chromium is required');
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
  const context=await browser.newContext({
   viewport:{width:393,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2
  });
  // Install deterministic state immediately before the game's own startup.
  // A reload fires the old page's visibility handler, which otherwise rewrites
  // saved localStorage and can accidentally erase a test fixture.
  await context.addInitScript(()=>{
    const pending=sessionStorage.getItem('__solitaire_test_state');
    if(pending){
      localStorage.setItem('solitairefunny:v1',pending);
      sessionStorage.removeItem('__solitaire_test_state');
    }
  });
  const page=await context.newPage();
  const url='http://127.0.0.1:'+server.address().port+'/solitairefunny/index.html';
  await page.goto(url,{waitUntil:'domcontentloaded'});
  async function seed(s){
   await page.evaluate(state=>sessionStorage.setItem('__solitaire_test_state',JSON.stringify({state,elapsed:0})),s);
   await page.reload({waitUntil:'domcontentloaded'});
  }
  async function state(){
   return page.evaluate(()=>JSON.parse(localStorage.getItem('solitairefunny:v1')).state);
  }
  async function tap(selector){await page.locator(selector).evaluate(el=>el.click());}
  const empty=()=>Array.from({length:7},()=>[]);
  const t=empty();t[0]=[card(0,1)];t[1]=[card(0,2)];
  await seed(seedState({t,waste:[card(1,1)]}));
  let result=await state();
  assert.equal(result.f[0].length,2,'Ace then 2 of hearts automatically reach foundation');
  assert.equal(result.f[1].length,1,'Ace of diamonds from waste automatically reaches foundation');
  assert.equal(result.waste.length,0,'Auto foundation removes cards from waste');
  console.log('PASS auto-foundation all eligible exposed cards');

  const t2=empty();t2[0]=[card(2,3)];
  await seed(seedState({t:t2,f:[[card(0,1),card(0,2)],[],[],[]]}));
  await tap('#f0 .card');await tap('#tableau .column[data-col="0"] .card');
  result=await state();
  assert.equal(result.f[0].length,1,'Manual card retrieval removes it from foundation');
  assert.equal(result.t[0].at(-1).v,2,'Retrieved card remains on tableau');
  assert.ok(result.manualFoundationCards.includes('0:2'),'Manual retrieval held against auto-return');
  await tap('#tableau .column[data-col="0"] .card:last-child');
  await tap('#tableau .column[data-col="0"] .card:last-child');
  result=await state();
  assert.equal(result.f[0].length,2,'Double tap explicitly returns held card to foundation');
  assert.equal(result.t[0].length,1,'Double-tapped card leaves tableau');
  console.log('PASS manual foundation pull-down and double-tap return');

  const t3=empty();t3[0]=[card(0,1)];
  await seed(seedState({t:t3,manualFoundationCards:['0:1']}));
  await tap('#tableau .column[data-col="0"] .card');
  await tap('#tableau .column[data-col="0"] .card');
  result=await state();
  assert.equal(result.f[0].length,1,'Double tap moves available tableau card to foundation');
  console.log('PASS double-tap tableau card');

  await seed(seedState({drawCount:3,stock:[card(3,5),card(2,7),card(1,9)]}));
  await tap('#draw');
  result=await state();
  assert.equal(result.stock.length,0,'Three cards removed from stock');
  assert.equal(result.waste.length,3,'Three waste cards retained');
  assert.equal(await page.locator('#waste .card').count(),3,'Three cards drawn visibly');
  // The user's NEXT-game selector is deliberately independent of the mode
  // in an already loaded match. Select draw-three before starting the new one.
  await tap('.solitaire-deck [data-draw="3"]');
  await tap('#newSide');
  await tap('.game-dialog-actions button:last-child');
  result=await state();
  assert.equal(result.drawCount,3,'New match retains three-card draw mode');
  console.log('PASS draw-three and new match');

  await browser.close();browser=null;
 }finally{if(browser)await browser.close();await close();}
})().catch(error=>{console.error(error);process.exitCode=1});
