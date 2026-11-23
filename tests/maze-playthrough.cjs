'use strict';
// Production Pac-Man movement logic in an isolated VM.
// This freezes/removes moving ghosts: it PROVES map and win objectives are
// reachable, but does not claim guaranteed survival against moving enemies.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const layout=fs.readFileSync(root+'/maze-chase/levels.js','utf8');
let game=fs.readFileSync(root+'/maze-chase/game.js','utf8');
if(!game.endsWith('})();'))throw Error('Pac-Man source wrapper changed');
game=game.slice(0,-5)+
'globalThis.__mazeAudit={get:()=>s,choose:(difficulty,stage)=>P.select(difficulty,stage),getProgress:()=>P,'+
'advance:(dx,dy)=>{if(s.over)throw Error("Moving after stage ended");s.pending=[dx,dy];if(!wall(s.x+dx,s.y+dy))s.dir=[dx,dy];walk();},'+
'freezeGhosts:()=>{s.ghosts=[];}};})();';
const empty=()=>({style:{},dataset:{},append(){},appendChild(){},
 setAttribute(){},classList:{add(){},remove(){}},
 addEventListener(){},getContext(){return new Proxy({}, {get:()=>()=>{}})}
});
const sandbox={console,document:{hidden:false,createElement:empty},
 addEventListener(){},setInterval(){return 1;},clearInterval(){},setTimeout(){return 1;},clearTimeout(){}};
sandbox.window=sandbox;
const log=[];
sandbox.G={
 el:empty,btn:empty,ctrl(){},render(){},score(){},msg(){},
 rand:n=>Math.floor(Math.random()*n),load:(key,fallback)=>fallback,store(){},
 progress(restart){
  const p={difficulty:'normal',stage:1,cleared:0,highest:1,
   get index(){return {easy:0,normal:1,hard:2}[this.difficulty];},
   select(diff,stage){this.difficulty=diff;this.stage=stage;restart();return true;},
   win(){this.cleared=Math.max(this.cleared,this.stage);this.highest=Math.max(this.highest,this.stage+1);log.push([this.difficulty,this.stage]);return true;}
  };
  return p;
 }
};
const context=vm.createContext(sandbox);
vm.runInContext(layout,context,{timeout:10000,filename:'maze-chase/levels.js'});
vm.runInContext(game,context,{timeout:10000,filename:'maze-chase/game.js'});
const api=sandbox.__mazeAudit,WIDTH=17,HEIGHT=15,dirs=[[1,0],[0,1],[-1,0],[0,-1]];
function nearestTarget(s,walls){
 const goals=new Set(s.dots),start=s.y*WIDTH+s.x;
 const q=[start],seen=new Set([start]),prior=new Map();
 for(let i=0;i<q.length;i++){
  const here=q[i],x=here%WIDTH,y=Math.floor(here/WIDTH);
  if(goals.has(here)){
   const path=[];let pos=here;
   while(pos!==start){const [previous,delta]=prior.get(pos);path.push(delta);pos=previous;}
   return path.reverse();
  }
  for(const [dx,dy] of dirs){
   const xx=x+dx,yy=y+dy,p=yy*WIDTH+xx;
   if(xx<=0||xx>=WIDTH-1||yy<=0||yy>=HEIGHT-1||walls.has(p)||seen.has(p))continue;
   seen.add(p);prior.set(p,[here,[dx,dy]]);q.push(p);
  }
 }
 throw Error('Dots unreachable from Pac-Man starting position');
}
function distance(a,b){let x=0;for(const v of a)if(!b.has(v))x++;for(const v of b)if(!a.has(v))x++;return x;}
let totalMoves=0;
for(const difficulty of ['easy','normal','hard']){
 let old=null,minDifferences=1e9,maxDifferences=0;
 for(let stage=1;stage<=20;stage++){
  const walls=new Set(sandbox.MazeLayouts.create(difficulty,stage));
  if(old){const value=distance(walls,old);minDifferences=Math.min(value,minDifferences);maxDifferences=Math.max(value,maxDifferences);}
  old=walls;
  api.choose(difficulty,stage);
  const s=api.get(),ghostExpected=Math.min(4,({easy:1,normal:2,hard:3}[difficulty])+Math.floor((stage-1)/7));
  assert.equal(s.ghosts.length,ghostExpected,'Ghost count actually escalates');
  assert.equal(s.requiredRegions,{easy:2,normal:3,hard:4}[difficulty]);
  assert.ok(s.target>=Math.floor(s.dots.length*.47),'Not a trivial few extra dots');
  if(difficulty==='normal'&&stage<=5)assert.ok(s.target>=95,'Early normal Pac-Man must require broad exploration');
  // A no-enemy playthrough checks the ACTUAL shipped walk/score/win functions.
  api.freezeGhosts();
  let movements=0;
  while(!s.over&&movements<3500){
   const path=nearestTarget(s,walls);
   for(const [dx,dy] of path){
    api.advance(dx,dy);movements++;if(s.over)break;
   }
  }
  assert.equal(s.over,true,'Pac-Man must reach the winning terminal state');
  assert.ok(s.score/10>=s.target||!s.dots.length,'Dot target reached');
  assert.ok(s.regions.length>=s.requiredRegions,'Required regions were visited');
  assert.ok(log.some(([d,n])=>d===difficulty&&n===stage),'Real G.progress.win triggered');
  totalMoves+=movements;
 }
 assert.ok(minDifferences>=8,'Consecutive maps must change many walls');
 console.log('PASS Pac-Man '+difficulty+' · 20 maze objectives reached with production walk(), '+minDifferences+'–'+maxDifferences+' wall changes between consecutive maps');
}
assert.equal(log.length,60,'All sixty Pac-Man win conditions executed');
console.log('PASS Pac-Man total '+totalMoves+' valid maze steps (enemy-free objective proof only)');