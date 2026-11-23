'use strict';
// Beyond JSON inequality: check adjacent levels change substantive puzzle
// structures, not a single extra move or an incidental colour renaming.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const cases={
 'flow-connect':(d,s)=>FlowLevels.create(d,s).pairs.flat(),
 'water-sort':(d,s)=>WaterLevels.create(d,s).tubes,
 'maze-chase':(d,s)=>MazeLayouts.create(d,s),
 'frogger':(d,s)=>FroggerLevels.create(d,s),
 'space-invaders':(d,s)=>SpaceLevels.formation(s,d),
 'brick-breaker':(d,s)=>BrickLevels.layout(s,d),
 'falling-blocks':(d,s)=>FallingLevels.initial(s,d),
 'memory-match':(d,s)=>MemoryLevels.symbols(s,d),
 'hangman':(d,s)=>HangmanLevels.words(d)[s-1],
 'word-search':(d,s)=>WordLevels.wordSet(s,d),
 'battleship':(d,s)=>BattleshipLevels.place('enemy',s,d),
 'blackjack':(d,s)=>BlackjackLevels.deck(s,d),
 'pyramid-solitaire':(d,s)=>PyramidLevels.deck(s,d),
 'mahjong':(d,s)=>MahjongLevels.create(s,d),
 'puzzle-15':(d,s)=>PuzzleLevels.create(s,d).board
};
const server=http.createServer((req,res)=>{
 let filename=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(filename.endsWith('/'))filename+='index.html';
 const file=path.resolve(root,'.'+filename);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'}).end(body);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 let browser;
 try{
  const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
  browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:844}});
  const base='http://127.0.0.1:'+server.address().port;
  for(const game of Object.keys(cases)){
   await page.goto(base+'/'+game+'/',{waitUntil:'load'});
   const report=await page.evaluate(game=>{
    const mapped={
     'flow-connect':(d,s)=>FlowLevels.create(d,s).pairs.flat(),
     'water-sort':(d,s)=>WaterLevels.create(d,s).tubes,
     'maze-chase':(d,s)=>MazeLayouts.create(d,s),
     'frogger':(d,s)=>FroggerLevels.create(d,s),
     'space-invaders':(d,s)=>SpaceLevels.formation(s,d),
     'brick-breaker':(d,s)=>BrickLevels.layout(s,d),
     'falling-blocks':(d,s)=>FallingLevels.initial(s,d),
     'memory-match':(d,s)=>MemoryLevels.symbols(s,d),
     'hangman':(d,s)=>HangmanLevels.words(d)[s-1],
     'word-search':(d,s)=>WordLevels.wordSet(s,d),
     'battleship':(d,s)=>BattleshipLevels.place('enemy',s,d),
     'blackjack':(d,s)=>BlackjackLevels.deck(s,d),
     'pyramid-solitaire':(d,s)=>PyramidLevels.deck(s,d),
     'mahjong':(d,s)=>MahjongLevels.create(s,d),
     'puzzle-15':(d,s)=>PuzzleLevels.create(s,d).board
    };
    const result={};
    for(const diff of ['easy','normal','hard']){
     const boards=Array.from({length:20},(_,i)=>mapped[game](diff,i+1));
     const changes=[];
     for(let i=1;i<20;i++){
      const a=boards[i-1],b=boards[i];
      let distance;
      if(game==='maze-chase'){
       const aa=new Set(a),bb=new Set(b);
       distance=a.filter(n=>!bb.has(n)).length+b.filter(n=>!aa.has(n)).length;
      }else if(game==='brick-breaker'||game==='falling-blocks'){
       // Ignore paint colours; measure actual occupied-cell changes.
       const flat=t=>t.flat().map(v=>Number(Boolean(v)));
       const x=flat(a),y=flat(b);
       distance=x.filter((v,n)=>v!==y[n]).length;
      }else if(game==='battleship'||game==='mahjong'||game==='puzzle-15'||game==='flow-connect'||game==='memory-match'){
       distance=a.filter((v,n)=>JSON.stringify(v)!==JSON.stringify(b[n])).length;
      }else if(game==='word-search'){
       distance=a.filter(w=>!b.includes(w)).length;
      }else if(game==='hangman'){
       distance=a===b?0:Math.abs(a.length-b.length)+[...a].filter((v,n)=>v!==b[n]).length;
      }else if(game==='frogger'){
       distance=a.filter((lane,n)=>JSON.stringify(lane)!==JSON.stringify(b[n])).length;
      }else if(game==='space-invaders'||game==='water-sort'||game==='blackjack'||game==='pyramid-solitaire'){
       distance=JSON.stringify(a)===JSON.stringify(b)?0:2;
      }else distance=0;
      changes.push(distance);
     }
     result[diff]={minimum:Math.min(...changes),average:changes.reduce((x,y)=>x+y,0)/changes.length,changes};
    }
    return result;
   },game);
   const threshold={'maze-chase':8,'brick-breaker':3,'falling-blocks':4,'flow-connect':2,'word-search':2,'battleship':6,'mahjong':14,'puzzle-15':5,'memory-match':8,'frogger':4}[game]||1;
   for(const [diff,metric] of Object.entries(report)){
    assert.ok(metric.minimum>=threshold,game+' '+diff+' has adjacent lookalike levels: '+JSON.stringify(metric.changes));
    console.log('PASS '+game+' '+diff+' · minimum adjacent structural difference '+metric.minimum+' (required '+threshold+')');
   }
  }
 }finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});