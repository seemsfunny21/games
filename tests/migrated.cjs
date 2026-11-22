'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const other={
 sudokufunny:'#board',reversifunny:'#board',minesweeperfunny:'#board',
 solitairefunny:'#game',chessfunny:'#board',tavlifunny:'#board',
 tichufunny:'#cardTable',tichufunnyonline:'#createRoom',
 quizfunny:'#question',monopolyfunny:'#board'
};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end('Missing '+name);return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(body);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
  if(!bin)throw Error('Chrome unavailable for migrated game checks');
  browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
  for(const mode of ['mobile','desktop']){
   const context=await browser.newContext(mode==='mobile'?{viewport:{width:393,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1280,height:800}});
   const page=await context.newPage(),failures=[],base='http://127.0.0.1:'+server.address().port;
   page.on('pageerror',error=>failures.push('JavaScript: '+error.message));
   page.on('response',resp=>{
    const url=new URL(resp.url());
    if(resp.status()>=400&&url.host===new URL(base).host&&/\.(js|html|css|svg|webmanifest)$/.test(url.pathname))
      failures.push('Missing asset: '+resp.status()+' '+url.pathname);
   });
   await page.goto(base+'/',{waitUntil:'load'});
   assert.equal(await page.locator('.game-choice').count(),24,'24 games in central hub');
   for(const [name,selector] of Object.entries(other)){
    failures.length=0;
    await page.goto(base+'/'+name+'/',{waitUntil:'load'});
    await page.waitForTimeout(220);
    assert.equal(await page.locator(selector).count(),1,name+' primary game UI is mounted');
    assert.ok(await page.locator('button').count()>0,name+' interactive buttons exist');
    assert.ok((await page.locator('body').innerText()).length>15,name+' has visible content');
    assert.deepEqual(failures,[],name+' loads without JavaScript or missing asset errors on '+mode);
    const metrics=await page.evaluate(()=>({
      width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      height:innerHeight,scrollHeight:document.documentElement.scrollHeight
    }));
    assert.ok(metrics.scrollWidth<=metrics.width+3,name+' must not horizontally scroll on '+mode);
    console.log('PASS '+mode+' '+name+' · '+JSON.stringify(metrics));
   }
   // Confirm the shared offline shell can open the newly migrated games.
   await page.goto(base+'/',{waitUntil:'load'});
   await page.waitForFunction(async()=>{
    if(!('serviceWorker' in navigator))return false;
    const reg=await navigator.serviceWorker.ready;
    const cache=await caches.open('games-shell-v12-unique-levels');
    return !!reg.active&&(await cache.keys()).length>=75;
   },null,{timeout:25000});
   await context.setOffline(true);
   for(const name of ['sudokufunny','quizfunny','chessfunny']){
    await page.goto(base+'/'+name+'/',{waitUntil:'load',timeout:20000});
    assert.ok(await page.locator(other[name]).count()===1,name+' is available offline');
   }
   await context.setOffline(false);
   console.log('PASS '+mode+' additional migrated games offline');
   await context.close();
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});