'use strict';
/* Deterministic automated player simulations of the actual shipped arcade
 * physics. No calls to progress.win() or manual overriding of a victory.
 * A win must emerge from the original game's step()/drop() logic.
 * Results are a bounded demonstration of winnability, not a mathematical
 * guarantee for every possible random projectile / falling-piece sequence. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctxMethods=new Proxy({}, {get:()=>()=>{}});
function bot(game){
 let randomSeed=1;
 const random=()=>{
  randomSeed^=randomSeed<<13;randomSeed^=randomSeed>>>17;randomSeed^=randomSeed<<5;
  return (randomSeed>>>0)/4294967296;
 };
 const math=Object.create(Math);math.random=random;
 function empty(){return {style:{},dataset:{},classList:{add(){},remove(){}},
  append(){},appendChild(){},setAttribute(){},addEventListener(){},remove(){},
  getContext(){return ctxMethods;},setPointerCapture(){},getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:420,height:520};}
 };}
 const sandbox={console,Math:math,addEventListener(){},setInterval(){return 1;},clearInterval(){},
  document:{hidden:false,createElement:empty,querySelectorAll(){return []},body:{classList:{add(){}},append(){}}}};
 sandbox.window=sandbox;
 const wins=[];
 sandbox.G={el:empty,btn:empty,ctrl(){},render(){},score(){},msg(){},
  store(){},load:(key,fallback)=>fallback,rand:n=>Math.floor(random()*n),
  progress(restart){
   const p={difficulty:'normal',stage:1,
    get index(){return {easy:0,normal:1,hard:2}[this.difficulty];},
    select(d,n){this.difficulty=d;this.stage=n;restart();return true;},
    win(){wins.push([this.difficulty,this.stage]);return true;}
   };
   return p;
  }};
 let src=fs.readFileSync(root+'/'+game+'/game.js','utf8');
 if(!src.endsWith('})();'))throw Error('Arcade source wrapper changed for '+game);
 const refs={ 'space-invaders':'get:()=>s,tick:step,move,formation',
   'brick-breaker':'get:()=>s,tick:step,layout:brickLayout',
   'falling-blocks':'get:()=>s,move,rotate,drop,collide,shape,forms'};
 src=src.slice(0,-5)+'globalThis.__arcade={'+refs[game]+',choose:(d,n)=>P.select(d,n),getProgress:()=>P};})();';
 const context=vm.createContext(sandbox);
 vm.runInContext(src,context,{timeout:10000,filename:game+'/game.js'});
 return {api:sandbox.__arcade,wins,setSeed:n=>{randomSeed=n|0||1;}};
}
function reflect(x){
 while(x<8||x>392){if(x<8)x=16-x;if(x>392)x=784-x;}
 return x;
}
function brickAutoplay(api){
 let t=0,maxLivesLost=0;
 while(api.get().playing&&t++<30000){
  const s=api.get(),ball=s.ball;
  if(ball.vy>0){
   const time=(454-ball.y)/ball.vy;
   const landing=reflect(ball.x+ball.vx*Math.max(0,time));
   const targets=[];
   for(let r=0;r<6;r++)for(let c=0;c<8;c++)if(s.bricks[r][c])targets.push({x:12+c*47+21,r});
   if(!targets.length)break;
   targets.sort((a,b)=>Math.abs(a.x-landing)-Math.abs(b.x-landing)||b.r-a.r);
   const target=targets[Math.min((Math.floor(t/400)%3),targets.length-1)];
   const travel=Math.max(15,(455-(38+target.r*27))/Math.max(1,Math.abs(ball.vy)));
   const steeringLimit=Math.max(.7,(s.pw/2-13)/15);const desiredVelocity=Math.max(-steeringLimit,Math.min(steeringLimit,(target.x-landing)/travel));
   const desiredPaddle=Math.max(s.pw/2,Math.min(400-s.pw/2,landing-desiredVelocity*15));
   s.paddle=desiredPaddle;
  }
  api.tick();
 }
 return {won:!api.get().playing&&api.get().lives>0&&api.get().bricks.every(row=>row.every(v=>!v)),ticks:t,lives:api.get().lives,remaining:api.get().bricks.flat().reduce((a,b)=>a+b,0)};
}
function predictEnemy(alive,s,enemy,frames){
 let d=s.dir,positions=alive.map(e=>({x:e.x,y:e.y})),index=alive.indexOf(enemy);
 for(let t=1;t<=frames;t++)if((s.tick+t)%8===0){
  const bounce=positions.some(e=>e.x+d*s.enemySpeed>401||e.x+d*s.enemySpeed<19);
  if(bounce)d*=-1;
  for(const e of positions){e.x+=d*s.enemySpeed;if(bounce)e.y+=15;}
 }
 return positions[index].x;
}
function galaxyAutoplay(api,policy=0){
 let ticks=0;
 while(api.get().playing&&ticks++<8000){
  const s=api.get(),alive=s.enemies.filter(e=>e.alive);
  if(!alive.length)break;
  const rank=alive.map(e=>{
   const travel=Math.max(1,Math.ceil((460-e.y)/9));
   const predicted=predictEnemy(alive,s,e,travel);
   const priority=Math.abs(predicted-s.player)+(policy%3===0?-e.y:policy%3===1?e.y:0)*.7;
   return {predicted,priority};
  }).sort((a,b)=>a.priority-b.priority);
  const aim=rank[0].predicted;
  let target=Math.max(20,Math.min(400,aim));
  // Bullets close to the player take priority over the next shot.
  const threat=s.enemyBullets.find(b=>b.y>=420&&b.y<=490&&Math.abs(b.x-target)<24);
  if(threat)target=Math.max(20,Math.min(400,target+(target<210?45:-45)));
  api.move(target-s.player);
  api.tick();
 }
 return {won:!api.get().playing&&api.get().enemies.every(e=>!e.alive)&&api.get().lives>0,
  ticks,alive:api.get().enemies.filter(e=>e.alive).length,lives:api.get().lives};
}
function form(piece,rot){
 const original=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
 let v=original[piece].map(row=>row.slice());
 for(let t=0;t<rot;t++)v=v[0].map((_,i)=>v.map(row=>row[i]).reverse());
 return v;
}
function evaluate(board){
 let full=0;let rows=board.filter(row=>{if(row.every(Boolean)){full++;return false;}return true;});
 while(rows.length<20)rows.unshift(Array(10).fill(0));
 let holes=0,heights=Array(10).fill(0),well=0;
 for(let x=0;x<10;x++){
  let seen=false;
  for(let y=0;y<20;y++){if(rows[y][x]){if(!seen)heights[x]=20-y;seen=true;}else if(seen)holes++;}
 }
 for(let x=1;x<10;x++)well+=Math.abs(heights[x]-heights[x-1]);
 const sum=heights.reduce((a,b)=>a+b,0),max=Math.max(...heights);
 return {score:full*130-holes*18-sum*.5-well*.65-max*2,cleared:full};
}
function tetrisAutoplay(api){
 let placed=0;
 while(!api.get().dead&&!api.get().paused&&placed<1800){
  const s=api.get(),piece=s.p.shape;
  let best=null;
  for(let rot=0;rot<4;rot++){
   const shape=form(piece,rot),height=shape.length,width=shape[0].length;
   for(let x=0;x<=10-width;x++){
    let y=0;
    const collides=(yy)=>{
     for(let r=0;r<height;r++)for(let c=0;c<width;c++)if(shape[r][c]&&(yy+r>=20||s.board[yy+r]?.[x+c]))return true;
     return false;
    };
    if(collides(0))continue;
    while(!collides(y+1))y++;
    const next=s.board.map(row=>row.slice());
    for(let r=0;r<height;r++)for(let c=0;c<width;c++)if(shape[r][c])next[y+r][x+c]=piece+1;
    const result=evaluate(next),distance=Math.abs(x-3);
    const score=result.score-distance*.08;
    if(!best||score>best.score)best={x,rot,score};
   }
  }
  if(!best)break;
  for(let i=0;i<best.rot;i++)api.rotate();
  for(let moves=0;moves<10&&api.get().p.x!==best.x;moves++){
   const before=api.get().p.x;
   api.move(Math.sign(best.x-before),0);
   if(before===api.get().p.x)break;
  }
  if(api.get().p.x!==best.x)break;
  api.drop();placed++;
 }
 return {won:api.get().paused&&api.get().lines>=api.get().goal&&!api.get().dead,
  pieces:placed,lines:api.get().lines,goal:api.get().goal};
}
let total=0;
for(const [game,run] of [
 ['space-invaders',galaxyAutoplay],
 ['brick-breaker',brickAutoplay],
 ['falling-blocks',tetrisAutoplay]
]){
 const test=bot(game);
 for(const diff of ['easy','normal','hard']){
  let attempts=0,totalSteps=0;
  for(let stage=1;stage<=20;stage++){
   let result=null;
   for(let n=1;n<=12;n++){
    test.setSeed((stage*92821+{easy:1,normal:2,hard:3}[diff]*83293+n*19349663)|0);
    test.api.choose(diff,stage);
    result=game==='space-invaders'?run(test.api,n):run(test.api);
    attempts++;
    if(result.won)break;
   }
   assert.ok(result?.won,'No automated victory in '+game+' '+diff+'/'+stage+' after retries: '+JSON.stringify(result));
   assert.ok(test.wins.some(([d,n])=>d===diff&&n===stage),'Game must invoke its own production win()');
   totalSteps+=result.ticks||result.pieces||0;
  }
  total+=20;
  console.log('PASS '+game+' '+diff+' · 20 stage wins with real physics, '+attempts+' attempts, '+totalSteps+' physics steps/pieces');
 }
}
assert.equal(total,180,'All 180 arcade stages were simulated to victory');