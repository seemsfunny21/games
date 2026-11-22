/* Deterministic maze variants: 20 genuinely different, connected maps per difficulty. */
(()=>{
"use strict";
const W=17,H=15;
function random(seed){
 let v=seed|0||1;
 return n=>{v^=v<<13;v^=v>>>17;v^=v<<5;return (v>>>0)%n;};
}
function build(difficulty,stage){
 const spec={easy:[3,0],normal:[2,1],hard:[1,2]}[difficulty];
 if(!spec||!Number.isInteger(stage)||stage<1||stage>20)throw Error('Invalid Maze stage');
 const [gaps,extras]=spec;
 for(let attempt=0;attempt<600;attempt++){
  const next=random((stage*73856093 ^ gaps*19349663 ^ attempt*83492791)>>>0);
  const yWalls=[3+next(3),9+next(3)],xWalls=[4+next(4),10+next(4)],walls=new Set();
  for(const y of yWalls){
   const openings=[];
   while(openings.length<gaps){const x=2+next(13);if(!openings.includes(x))openings.push(x);}
   for(let x=2;x<=14;x++)if(!openings.includes(x))walls.add(y*W+x);
  }
  for(const x of xWalls){
   const openings=[];
   while(openings.length<gaps){const y=2+next(11);if(!openings.includes(y))openings.push(y);}
   for(let y=2;y<=12;y++)if(!openings.includes(y))walls.add(y*W+x);
  }
  for(let i=0;i<extras*3;i++)walls.add((2+next(11))*W+2+next(13));
  const seen=new Set([W+1]),q=[W+1];
  for(let i=0;i<q.length;i++){
   const index=q[i],x=index%W,y=Math.floor(index/W);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const xx=x+dx,yy=y+dy,to=yy*W+xx;
    if(xx<1||xx>=W-1||yy<1||yy>=H-1||seen.has(to)||walls.has(to))continue;
    seen.add(to);q.push(to);
   }
  }
  if(seen.size===(W-2)*(H-2)-walls.size)return [...walls].sort((a,b)=>a-b);
 }
 throw Error('No connected Maze layout found');
}
window.MazeLayouts={create:build};
})();