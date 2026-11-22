'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const mapped={
 'flow-connect':'Flow','maze-chase':'Maze','frogger':'Frogger',
 'space-invaders':'Space','brick-breaker':'Brick','falling-blocks':'Falling',
 'memory-match':'Memory','hangman':'Hangman','word-search':'Word',
 'battleship':'Battleship','blackjack':'Blackjack','pyramid-solitaire':'Pyramid',
 'mahjong':'Mahjong','puzzle-15':'Puzzle'
};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/'))name+='index.html';
 const filename=path.resolve(root,'.'+name);
 if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(filename,(err,data)=>{
  if(err){res.writeHead(404).end('not found');return;}
  res.writeHead(200,{'Content-Type':filename.endsWith('.js')?'application/javascript':filename.endsWith('.css')?'text/css':'text/html'}).end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
  if(!binary)throw Error('Chrome missing');
  browser=await chromium.launch({headless:true,executablePath:binary,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base='http://127.0.0.1:'+server.address().port;
  for(const [folder,name] of Object.entries(mapped)){
   errors.length=0;
   await page.goto(base+'/'+folder+'/',{waitUntil:'load'});
   const outcome=await page.evaluate(({name})=>{
    const difficulties=['easy','normal','hard'],result={};
    const hooks={
     Flow:(stage,d)=>FlowLevels.create(d,stage),
     Maze:(stage,d)=>MazeLayouts.create(d,stage),
     Frogger:(stage,d)=>FroggerLevels.create(d,stage),
     Space:(stage,d)=>SpaceLevels.formation(stage,d),
     Brick:(stage,d)=>BrickLevels.layout(stage,d),
     Falling:(stage,d)=>FallingLevels.initial(stage,d),
     Memory:(stage,d)=>MemoryLevels.symbols(stage,d),
     Hangman:(stage,d)=>HangmanLevels.words(d)[stage-1],
     Word:(stage,d)=>WordLevels.wordSet(stage,d),
     Battleship:(stage,d)=>BattleshipLevels.place('enemy',stage,d),
     Blackjack:(stage,d)=>BlackjackLevels.deck(stage,d),
     Pyramid:(stage,d)=>PyramidLevels.deck(stage,d)
    };
    for(const d of difficulties){
     const fingerprints=[],details=[];
     for(let stage=1;stage<=20;stage++){
      let board;
      if(name==='Mahjong'||name==='Puzzle'){
       // Temporarily unlock all levels in the audit context only.
       const p=G.activeProgress;
       if(!p.select(d,stage))throw Error('Could not choose stage '+stage+' '+d);
       board=Array.from(document.querySelectorAll('#play button')).map(b=>b.textContent);
      }else board=hooks[name](stage,d);
      if(!board)throw Error('Missing board '+name+' '+stage+' '+d);
      fingerprints.push(JSON.stringify(board));details.push(board);
     }
     const unique=new Set(fingerprints).size;
     result[d]={unique,details};
    }
    return result;
   },{name});
   assert.deepEqual(errors,[],'No errors in '+folder);
   for(const [difficulty,info] of Object.entries(outcome)){
    assert.equal(info.unique,20,folder+' must have 20 unique layouts in '+difficulty);
    if(name==='Flow'){
     for(const level of info.details){
      const used=level.solutions.flat();
      assert.equal(new Set(used).size,used.length,'Flow routes cannot overlap');
      for(const path of level.solutions)for(let i=1;i<path.length;i++)
       assert.equal(Math.abs(path[i]%6-path[i-1]%6)+Math.abs(Math.floor(path[i]/6)-Math.floor(path[i-1]/6)),1,'Flow paths stay adjacent');
     }
    }
    if(name==='Maze'){
     for(const obstacles of info.details){
      const blocked=new Set(obstacles),seen=new Set([18]),queue=[18];
      for(let i=0;i<queue.length;i++){
       const index=queue[i],x=index%17,y=Math.floor(index/17);
       for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const xx=x+dx,yy=y+dy,to=yy*17+xx;
        if(xx<1||xx>15||yy<1||yy>13||blocked.has(to)||seen.has(to))continue;
        seen.add(to);queue.push(to);
       }
      }
      assert.equal(seen.size,195-blocked.size,'Maze all free tiles reachable');
     }
    }
    if(name==='Frogger')for(const lanes of info.details){
     assert.equal(lanes.length,6,'Frogger six lanes');
     assert.equal(new Set(lanes.map(l=>l.r)).size,6,'Frogger no duplicate lane positions');
     assert.equal(lanes.filter(l=>l.cars).length,3,'Frogger three car rows');
     assert.equal(lanes.filter(l=>l.logs).length,3,'Frogger three log rows');
    }
    if(name==='Brick')for(const board of info.details)
     assert.ok(board.flat().reduce((n,v)=>n+v,0)>=10,'Brick stage has enough bricks');
    if(name==='Falling')for(const board of info.details)
     assert.ok(board.length===20&&board.every(row=>row.length===10),'Falling board geometry');
    if(name==='Memory')for(const symbols of info.details)
     assert.equal(new Set(symbols).size,16,'Memory uses 16 distinct pairs');
    if(name==='Hangman')for(const word of info.details)
     assert.ok(/^[Α-Ω]+$/.test(word),'Hangman valid uppercase Greek word');
    if(name==='Word')for(const words of info.details)
     assert.ok(words.length>=5&&words.every(w=>w.length<=10),'Word puzzle playable size');
    if(name==='Battleship')for(const fleet of info.details)
     assert.equal(fleet.reduce((a,b)=>a+b,0),12,'Battleship exact 12 ship segments');
    if(name==='Blackjack'||name==='Pyramid')for(const deck of info.details)
     assert.equal(deck.length,52,'Cards use full 52 card deck');
    console.log('PASS '+folder+' · '+difficulty+' · 20 distinct '+name+' levels');
   }
  }
  await page.close();
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});