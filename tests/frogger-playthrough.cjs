'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,body)=>{
  if(err){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'}).end(body);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
  if(!bin)throw Error('Chrome unavailable');
  browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:844}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/frogger/',{waitUntil:'load'});
  for(const difficulty of ['easy','normal','hard']){
   const stats=await page.evaluate(difficulty=>{
    const p=G.activeProgress;
    if(!p.select(difficulty,1))throw Error('Could not choose Frogger stage one');
    let totalMoves=0,maxMoves=0;
    const actions=[[0,-1,'.frogger-middle button:first-child'],[0,1,'.frogger-middle button:last-child'],[-1,0,'.frogger-control-row>button:first-child'],[1,0,'.frogger-control-row>button:last-child']];
    function safe(lanes,x,r){
     const c=x*42+21,lane=lanes.find(l=>l.r===r);
     return !lane||(!lane.cars||!lane.cars.some(pos=>Math.abs(pos-c)<31))&&
      (!lane.logs||lane.logs.some(pos=>c>=pos-6&&c<=pos+110));
    }
    function route(lanes){
     const keys=new Set(['5,12']),q=[{x:5,r:12,actions:[]}];
     for(let i=0;i<q.length;i++){
      const node=q[i];if(node.r===0)return node.actions;
      for(const [dx,dy,selector] of actions){
       const x=node.x+dx,r=node.r+dy,k=x+','+r;
       if(x<0||x>9||r<0||r>12||keys.has(k)||!safe(lanes,x,r))continue;
       keys.add(k);q.push({x,r,actions:[...node.actions,selector]});
      }
     }
     return null;
    }
    for(let stage=1;stage<=20;stage++){
     const lanes=FroggerLevels.create(difficulty,stage);
     const path=route(lanes);
     if(!path)throw Error('No hazard-free path in Frogger '+difficulty+' / '+stage);
     for(const selector of path){
      const b=document.querySelector(selector);
      if(!b||b.disabled)throw Error('Missing/disabled Frogger arrow '+selector);
      b.click();
     }
     if(p.cleared<stage)throw Error('Actual Frogger traversal failed at '+difficulty+'/'+stage);
     totalMoves+=path.length;maxMoves=Math.max(maxMoves,path.length);
     if(stage<20&&!p.select(difficulty,stage+1))throw Error('Frogger failed to unlock '+(stage+1));
    }
    return {cleared:p.cleared,totalMoves,maxMoves};
   },difficulty);
   assert.equal(stats.cleared,20);
   console.log('PASS Frogger 20 real end-to-end crossings '+difficulty+' · '+stats.totalMoves+' moves, hardest route '+stats.maxMoves);
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});