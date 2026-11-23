'use strict';
// Real game-action full clears: no direct calls to G.activeProgress.win().
// We use the legal mouse/keyboard/pointer controls of each game to finish
// 20 consecutive stages in each of 3 difficulties (60 clears per game).
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const names=['flow-connect','water-sort','memory-match','mahjong','puzzle-15','hangman','word-search','battleship','blackjack','pyramid-solitaire'];
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,body)=>{
  if(err){res.writeHead(404).end('Missing '+name);return;}
  const mime=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html';
  res.writeHead(200,{'Content-Type':mime}).end(body);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  const bin=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(fs.existsSync);
  if(!bin)throw Error('Chromium not installed');
  browser=await chromium.launch({headless:true,executablePath:bin,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:393,height:844}});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  const base='http://127.0.0.1:'+server.address().port;
  for(const game of names){
   errors.length=0;
   await page.goto(base+'/'+game+'/',{waitUntil:'load'});
   for(const diff of ['easy','normal','hard']){
    const output=await page.evaluate(async({game,diff})=>{
     const p=G.activeProgress;
     if(!p.select(diff,1))throw Error('Unable to select '+diff+' level one');
     const button=(selector,i)=>document.querySelectorAll(selector)[i];
     function click(selector,i){const b=button(selector,i);if(!b||b.disabled)throw Error('Missing/disabled '+selector+' '+i);b.click();}
     function info(){return G.load('round',{});}
     function walkthrough(stage){
      if(game==='water-sort'){
       const solution=WaterLevels.create(diff,stage).solution;
       for(const [a,b] of solution){click('#play .water-bottle',a);click('#play .water-bottle',b);}
       return solution.length;
      }
      if(game==='memory-match'){
       const s=info(),groups=new Map();
       for(let i=0;i<s.values.length;i++){
        if(!groups.has(s.values[i]))groups.set(s.values[i],[]);
        groups.get(s.values[i]).push(i);
       }
       for(const indices of groups.values()){click('#play .match-card',indices[0]);click('#play .match-card',indices[1]);}
       return 32;
      }
      if(game==='mahjong'){
       for(let row=0;row<8;row++)for(let col=0;col<4;col++){
        const a=row*8+col,b=row*8+7-col;
        const tiles=info().tiles;
        if(tiles[a]!==tiles[b])throw Error('Mahjong guaranteed pair absent');
        click('#play .grid-board button',a);click('#play .grid-board button',b);
       }
       return 64;
      }
      if(game==='puzzle-15'){
       const sequence=PuzzleLevels.create(stage,diff).solution;
       for(const index of sequence)click('#play .grid-board button',index);
       if(!info().done)throw Error('Puzzle-15 is not marked solved');
       return sequence.length;
      }
      if(game==='hangman'){
       const word=HangmanLevels.words(diff)[stage-1];
       for(const ch of new Set([...word])){
        const kb=[...document.querySelectorAll('#play .hangman-keyboard button')];
        const n=kb.findIndex(x=>x.textContent===ch);
        if(n<0)throw Error('Unknown hangman letter '+ch);
        click('#play .hangman-keyboard button',n);
       }
       return new Set(word).size;
      }
      if(game==='word-search'){
       const round=info();
       if(round.placements?.length!==round.words?.length)throw Error('Unplaceable Word Search board');
       for(const path of round.placements){
        click('#play .grid-board button',path[0]);click('#play .grid-board button',path[path.length-1]);
       }
       if(info().found.length!==round.words.length)throw Error('Word Search has unfindable words');
       return round.words.length;
      }
      if(game==='battleship'){
       const round=info(),ships=round.enemy.map((v,i)=>v?i:-1).filter(i=>i>=0);
       for(const index of ships)click('#play .enemy-view .battleship-board button',index);
       if(info().status!=='win')throw Error('Cannot sink entire fleet');
       return ships.length;
      }
      if(game==='blackjack'){
       const deck=BlackjackLevels.deck(stage,diff);
       const possible=BlackjackLevels.winningHits(deck,diff);
       if(!possible.length)throw Error('No winning decision for Blackjack');
       const hits=possible[0];
       for(let i=0;i<hits;i++)click('#play .blackjack-hand-actions button',0);
       if(info().phase==='play')click('#play .blackjack-hand-actions button',1);
       const result=info().result;
       if(result!=='Κέρδισες!')throw Error('Blackjack replay unexpectedly lost: '+result);
       return hits+1;
      }
      if(game==='pyramid-solitaire'){
       const initial=info();
       for(let i=27;i>=0;i--){
        const current=info().pyramid[i];
        if(current.gone)throw Error('Pyramid card removed too soon '+i);
        if(current.v===13){click('#play .playing-card',i);continue;}
        click('#controls button',1);
        click('#play .playing-card',i);
        const cards=document.querySelectorAll('#play .playing-card');
        click('#play .playing-card',cards.length-1);
       }
       if(!info().won)throw Error('Pyramid is not fully cleared');
       return 28;
      }
      if(game==='flow-connect'){
       const paths=FlowLevels.create(diff,stage).solutions;
       for(const path of paths){
        const grid=document.querySelector('#play .flow-board');
        if(!grid)throw Error('No Flow board');
        const cells=[...grid.querySelectorAll('[data-cell]')];
        function event(type,index){
         const r=cells[index].getBoundingClientRect();
         const ev=new PointerEvent(type,{pointerId:77,isPrimary:true,button:0,buttons:type==='pointerup'?0:1,
          clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true,cancelable:true});
         cells[index].dispatchEvent(ev);
        }
        event('pointerdown',path[0]);
        for(const index of path.slice(1))event('pointermove',index);
        event('pointerup',path[path.length-1]);
       }
       return paths.reduce((sum,p)=>sum+p.length,0);
      }
      throw Error('Missing playthrough action for '+game);
     }
     let actions=0;
     for(let stage=1;stage<=20;stage++){
      if(p.difficulty!==diff||p.stage!==stage)throw Error('Campaign stage mismatch before '+stage);
      actions+=walkthrough(stage);
      if(p.cleared<stage||p.highest<Math.min(20,stage+1))throw Error('Real game win did not unlock level '+stage);
      if(stage<20&&!p.select(diff,stage+1))throw Error('Cannot continue to unlocked level '+(stage+1));
     }
     return {finished:p.cleared,highest:p.highest,actions};
    },{game,diff});
    assert.equal(output.finished,20,'All 20 '+diff+' stages genuinely beaten in '+game);
    assert.equal(output.highest,20,'All levels unlocked in '+game);
    assert.equal(errors.length,0,'No game runtime errors: '+game+' '+diff+': '+errors.join('; '));
    console.log('PASS 20 real UI-played '+game+' · '+diff+' · '+output.actions+' legal actions');
   }
  }
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});