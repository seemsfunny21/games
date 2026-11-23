'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const games=['battleship','pyramid-solitaire','blackjack','mahjong','flow-connect','puzzle-15','falling-blocks','brick-breaker','space-invaders','maze-chase','frogger','word-search','hangman','memory-match','water-sort'];
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
   // Browsers may request an optional favicon.ico (404): ignore cosmetic
   // errors, while still treating any missing HTML/JS/CSS as a failure.
   page.on('response',response=>{
     const pathname=new URL(response.url()).pathname;
     if(response.status()>=400&&/\\.(html|js|css)$/.test(pathname))
       failures.push('HTTP '+response.status()+' '+pathname);
   });
   const base='http://127.0.0.1:'+server.address().port;
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('.game-choice').count(),25,'25 selectable games in hub');
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
    // Game instructions live in a single accessible gear dialog on every page.
    const settings=page.getByRole('button',{name:'Οδηγίες παιχνιδιού'});
    assert.equal(await settings.count(),1,'One settings gear on '+game);
    await settings.click();
    assert.ok(await page.getByRole('dialog',{name:'Οδηγίες παιχνιδιού'}).isVisible(),'Help opens for '+game);
    const campaign=await page.evaluate(()=>({
      difficulty:window.G.activeProgress?.difficulty,
      stage:window.G.activeProgress?.stage,
      total:window.G.activeProgress?.total
    }));
    assert.deepEqual(campaign,{difficulty:'normal',stage:1,total:20},'Campaign starts at normal stage one: '+game);
    assert.equal(await page.locator('.campaign-difficulty button').count(),3,'All three difficulty options: '+game);
    assert.equal(await page.locator('.campaign-level').count(),20,'Twenty stages visible in gear: '+game);
    assert.ok(await page.getByRole('button',{name:'Πίστα 2 κλειδωμένη'}).isDisabled(),'Stage two must be locked until victory: '+game);
    const initiallyLocked=page.getByRole('button',{name:'Πίστα 2 κλειδωμένη'});
    assert.equal(await initiallyLocked.innerText(),'2','Locked stage shows its plain number: '+game);
    const lockedColors=await initiallyLocked.evaluate(e=>({background:getComputedStyle(e).backgroundColor,text:getComputedStyle(e).color}));
    assert.equal(lockedColors.background,'rgb(39, 48, 61)','Locked stage is dark grey: '+game);


    await page.getByRole('button',{name:'Κλείσιμο'}).click();
    const dimensions=await page.evaluate(()=>({
      pageScroll:document.documentElement.scrollHeight>window.innerHeight+2,
      play:(()=>{const r=document.querySelector('#play').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})(),
      height:innerHeight,width:innerWidth
    }));
    assert.equal(dimensions.pageScroll,false,'No page vertical scrolling on '+mode+' '+game);
    assert.ok(dimensions.play.bottom<=dimensions.height+2,'Game play fits viewport on '+game);
    if(game==='space-invaders'){
      const arrows=await page.locator('.edge-control').evaluateAll(nodes=>nodes.map(n=>{
        const r=n.getBoundingClientRect();return {label:n.textContent,left:r.left,right:r.right,top:r.top,width:r.width,height:r.height};
      }));
      assert.equal(arrows.length,2,'Galaxy has only left/right on-screen arrows');
      assert.ok(arrows[0].left<9&&arrows[1].right>dimensions.width-9,'Galaxy arrows dock at opposite screen edges');
      assert.ok(arrows.every(b=>b.width<=50&&b.height<=50),'Galaxy arrows are compact on '+mode);
      assert.ok(arrows.every(b=>b.top>=dimensions.play.bottom+3),'Galaxy arrows do not overlap the playfield on '+mode);
      assert.equal(await page.getByRole('button',{name:/ΠΥΡ/}).count(),0,'Galaxy never displays a fire control');
    }
    assert.equal(failures.length,0,'Runtime exceptions for '+game+': '+failures.join('; '));
    // Exercise an actual input on puzzle/board/card games, then validate state.
    if(game==='battleship')await page.locator('.battleship-board').first().locator('button:not([disabled])').first().click();
    if(game==='blackjack'&&await page.getByRole('button',{name:'Σταμάτα'}).isEnabled())await page.getByRole('button',{name:'Σταμάτα'}).click();
    if(game==='puzzle-15')await page.locator('#play button:not([disabled])').first().click();
    if(game==='memory-match')await page.locator('#play button:not([disabled])').first().click();
    if(game==='hangman')await page.locator('#play button:not([disabled])').first().click();
    if(game==='mahjong')await page.locator('#play button:not([disabled])').first().click();
    if(game==='flow-connect')await page.locator('#play button').first().click();
    if(game==='word-search')await page.locator('#play button').first().click();
    if(game==='water-sort'){
      const initial=await page.evaluate(()=>WaterLevels.create('normal',1));
      const [from,to]=initial.solution[0];
      const bottles=page.locator('.water-bottle');
      assert.equal(await bottles.count(),initial.colors+2,'Water Sort has correct number of bottles');
      await bottles.nth(from).click();
      assert.ok(await bottles.nth(from).getAttribute('aria-pressed')==='true','Water Sort source highlights when selected');
      await bottles.nth(to).click();
      assert.ok((await page.locator('#score').innerText()).includes('Κινήσεις: 1'),'Water Sort tap-to-pour works');
      await page.getByRole('button',{name:'↶ Αναίρεση'}).click();
      assert.ok((await page.locator('#score').innerText()).includes('Κινήσεις: 0'),'Water Sort undo restores starting state');
      const src=await page.locator('.water-bottle').nth(from).boundingBox();
      const dst=await page.locator('.water-bottle').nth(to).boundingBox();
      await page.mouse.move(src.x+src.width/2,src.y+src.height/2);
      await page.mouse.down();
      await page.mouse.move(dst.x+dst.width/2,dst.y+dst.height/2,{steps:10});
      await page.mouse.up();
      assert.ok((await page.locator('#score').innerText()).includes('Κινήσεις: 1'),'Water Sort drag-to-pour works');
      if(mode==='mobile'){
        for(const [a,b] of initial.solution.slice(1)){
          await page.locator('.water-bottle').nth(a).click();
          await page.locator('.water-bottle').nth(b).click();
        }
        await page.waitForFunction(()=>G.activeProgress.stage===2,null,{timeout:4000});
        assert.ok(await page.locator('#score').innerText().then(t=>t.includes('Πίστα 2')),'Water Sort truly advances after solving every bottle');
      }
    }
    if(game==='pyramid-solitaire')await page.locator('#play button:not([disabled])').first().click();
    await page.waitForTimeout(60);
    if(game==='maze-chase'){
      const surface=page.locator('#play canvas');
      assert.equal(await surface.getAttribute('data-facing'),'right','Pac-Man starts facing right');
      await page.getByRole('button',{name:'Κάτω'}).click();
      assert.equal(await surface.getAttribute('data-facing'),'down','Pac-Man faces down after selecting downward movement');
      await page.getByRole('button',{name:'Δεξιά'}).click();
      assert.equal(await surface.getAttribute('data-facing'),'right','Pac-Man rotates back to the right');
      const before=await page.locator('#play canvas').evaluate(e=>e.toDataURL());
      await page.waitForTimeout(500);
      const after=await page.locator('#play canvas').evaluate(e=>e.toDataURL());
      assert.notEqual(after,before,'Maze Chase continues moving without directional input');
    }
    if(game==='puzzle-15'&&mode==='mobile'){
      // Verify real persistence and automatic progression through the shared campaign API.
      assert.equal(await page.evaluate(()=>G.activeProgress.win()),true,'Victory unlocks a stage');
      await page.waitForFunction(()=>G.activeProgress.stage===2,null,{timeout:4000});
      await page.getByRole('button',{name:'Οδηγίες παιχνιδιού'}).click();
      assert.equal(await page.getByRole('button',{name:'Πίστα 2 διαθέσιμη'}).count(),1,'New stage becomes selectable');
      const doneStage=page.getByRole('button',{name:'Πίστα 1 ολοκληρωμένη'});
      assert.equal(await doneStage.innerText(),'1','Completed stage displays the number, no checkmark');
      assert.equal(await doneStage.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(248, 251, 255)','Completed stage turns white');
      assert.ok(await doneStage.isEnabled(),'Completed stage can be replayed');

      await page.getByRole('button',{name:'Πίστα 1 ολοκληρωμένη'}).click();
      assert.equal(await page.evaluate(()=>G.activeProgress.stage),1,'Previously completed stage remains replayable');
      await page.getByRole('button',{name:'Οδηγίες παιχνιδιού'}).click();
      await page.getByRole('button',{name:'Δύσκολο'}).click();
      assert.ok(await page.getByRole('button',{name:'Πίστα 2 κλειδωμένη'}).isDisabled(),'Hard difficulty unlocks independently');
      await page.getByRole('button',{name:'Πίστα 1 διαθέσιμη'}).click();
      assert.equal(await page.evaluate(()=>G.activeProgress.difficulty),'hard','Choosing hard level changes difficulty');
      await page.reload({waitUntil:'load'});
      assert.equal(await page.evaluate(()=>G.activeProgress.difficulty),'hard','Difficulty selection survives reload');
    }
    if(game==='memory-match'){
      assert.equal(await page.locator('#play .match-card').count(),32,'Memory Match has eight rows of four cards');
      const rows=await page.locator('.memory-full-grid').evaluate(e=>getComputedStyle(e).gridTemplateRows.split(' ').length);
      assert.equal(rows,8,'Memory Match board uses eight grid rows');
    }
    if(game==='flow-connect'){
      // A single held drag should connect same-colour endpoints without multiple taps.
      const cells=page.locator('.flow-board [data-cell]');
      const box0=await cells.nth(0).boundingBox();
      const center=b=>({x:b.x+b.width/2,y:b.y+b.height/2});
      await page.mouse.move(center(box0).x,center(box0).y);
      await page.mouse.down();
      for(let i=1;i<=5;i++){const b=await cells.nth(i).boundingBox();const p=center(b);await page.mouse.move(p.x,p.y,{steps:5});}
      await page.mouse.up();
      assert.ok((await page.locator('#score').innerText()).includes('1/5'),'One finger drag completes the first Flow pair');
    }
    if(game==='maze-chase'){
      const coords=await page.locator('.maze-dpad button').evaluateAll(a=>a.map(b=>({c:b.className,x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})));
      assert.equal(coords.length,4,'Maze has four directional controls');
      const down=coords.find(b=>b.c.includes('down'));
      const left=coords.find(b=>b.c.includes('left'));
      const right=coords.find(b=>b.c.includes('right'));
      assert.ok(down.y>left.y+50&&down.y>right.y+50,'Maze down arrow sits well below horizontal arrows');
      assert.ok(left.w>=50&&right.w>=50,'Maze buttons are thumb-sized');
    }
    if(game==='frogger'){
      const coords=await page.locator('.frogger-control-row > button').evaluateAll(a=>a.map(b=>({left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right})));
      assert.equal(coords.length,2,'Frogger left/right arrows are separate from up/down');
      assert.ok(coords[0].left<18&&coords[1].right>dimensions.width-18,'Frogger arrows are near opposite screen edges');
    }
    if(game==='flow-connect'){
      assert.equal(await page.locator('#play .flow-endpoint').count(),10,'Five clearly numbered endpoint pairs');
      assert.equal(await page.locator('#play .flow-endpoint').first().innerText(),'1','Endpoint has identifying number');
      // All 60 layouts must be distinct and must include a real non-overlapping solution.
      const levels=await page.evaluate(()=>{
        const result={};
        for(const diff of ['easy','normal','hard']){
          const all=Array.from({length:20},(_,i)=>FlowLevels.create(diff,i+1));
          const signatures=all.map(b=>JSON.stringify(b.pairs));
          const valid=all.every(level=>{
            const indices=level.solutions.flat();
            return new Set(indices).size===indices.length&&
              level.solutions.every((path,k)=>path[0]===level.pairs[k][0]&&path.at(-1)===level.pairs[k][1]&&
                path.every((cell,i)=>cell>=0&&cell<36&&(i===0||Math.abs(cell%6-path[i-1]%6)+Math.abs(Math.floor(cell/6)-Math.floor(path[i-1]/6))===1)));
          });
          result[diff]={unique:new Set(signatures).size,valid,pairs:all.map(b=>b.pairs)};
        }
        return result;
      });
      for(const diff of ['easy','normal','hard']){
        assert.equal(levels[diff].unique,20,'All 20 Flow layouts are distinct in '+diff);
        assert.ok(levels[diff].valid,'All 20 Flow layouts have a usable solution in '+diff);
      }
      if(mode==='mobile'){
        // Complete the remaining paths of level one with the same touch-drag gesture.
        const paths=await page.evaluate(()=>FlowLevels.create('normal',1).solutions.slice(1));
        const cell=page.locator('.flow-board [data-cell]');
        for(const pathIndices of paths){
          for(let p=0;p<pathIndices.length;p++){
            const b=await cell.nth(pathIndices[p]).boundingBox();
            const x=b.x+b.width/2,y=b.y+b.height/2;
            await page.mouse.move(x,y,{steps:p===0?1:5});
            if(p===0)await page.mouse.down();
          }
          await page.mouse.up();
        }
        await page.waitForFunction(()=>G.activeProgress.stage===2,null,{timeout:4000});
        assert.notDeepEqual(levels.normal.pairs[0],levels.normal.pairs[1],'Flow level two changes endpoints after progression');
        assert.ok(await page.getByRole('button',{name:'Οδηγίες παιχνιδιού'}).count()===1,'Help gear still works at Flow stage two');
      }
    }
    if(game==='blackjack'){
      assert.equal(await page.locator('.blackjack-hand-actions button').count(),2,'Both Blackjack decisions follow the cards');
      assert.ok(await page.locator('.blackjack-hand-actions').evaluate(e=>e.previousElementSibling?.textContent?.includes('Τα φύλλα σου')),'Actions directly follow player hand');
    }
    if(game==='battleship'){
      const gear=page.locator('.game-topbar .gear-button');
      assert.ok(await page.locator('.game-topbar .battleship-restart').count()===1,'Reset is beside gear');
      assert.ok(await page.locator('.game-topbar .battleship-restart').evaluate(e=>e.nextElementSibling?.classList.contains('gear-button')),'Reset immediately precedes gear');
      if(mode==='mobile'){
        assert.ok(await page.locator('.battleship-layout .enemy-view').isVisible(),'Opponent board shows on mobile');
        assert.ok(!(await page.locator('.battleship-layout .own-view').isVisible()),'Own board initially hidden to avoid vertical scroll');
      }
    }
    if(game==='brick-breaker'||game==='falling-blocks'){
      const controls=page.locator('.edge-action-row');
      assert.ok(await controls.isVisible(),'Bottom edge controls visible '+game);
      const pos=await page.evaluate(()=>{
        const canvas=document.querySelector('#play canvas').getBoundingClientRect();
        const row=document.querySelector('.edge-action-row').getBoundingClientRect();
        const arrows=[...document.querySelectorAll('.edge-action-row > button')].map(b=>b.getBoundingClientRect());
        return {canvasBottom:canvas.bottom,rowTop:row.top,left:arrows[0]?.left,right:arrows[1]?.right,width:innerWidth};
      });
      assert.ok(pos.rowTop>=pos.canvasBottom-3,'Arrows sit below the board '+game);
      assert.ok(pos.left<18&&pos.right>pos.width-18,'Arrows sit on opposite screen edges '+game);
      if(game==='falling-blocks'&&mode==='mobile')await page.locator('#play canvas').tap({position:{x:30,y:50}});
    }
    assert.equal(failures.length,0,'Gameplay exceptions '+game+': '+failures.join('; '));
    console.log('PASS '+mode+' '+game+' · '+status.slice(0,70));
   }
   // Ensure the preloaded games can launch without any network access.
   await page.goto(base+'/',{waitUntil:'load'});
   await page.waitForFunction(async()=>{
     if(!('serviceWorker' in navigator))return false;
     const registration=await navigator.serviceWorker.ready;
     const cache=await caches.open('games-shell-v15-water-sort');
     const keys=await cache.keys();
     return !!registration.active&&keys.length>=30;
   },null,{timeout:15000});
   await page.waitForTimeout(200);
   await context.setOffline(true);
   await page.goto(base+'/puzzle-15/',{waitUntil:'load',timeout:20000});
   assert.ok(await page.locator('#play button').count()>0,'Offline game starts with no network');
   await context.setOffline(false);
   console.log('PASS '+mode+' offline preload and game startup');
   await context.close();
  }
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
