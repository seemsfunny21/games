/* Deterministic, individually path-tested Frogger challenges.
 * Each stage is generated only when a real route exists using the game's
 * exact collision geometry for both logs and cars.
 */
(()=>{
"use strict";
const templates=[
 {kind:'cars',speed:1.7,x:[30,220]},
 {kind:'cars',speed:-2.5,x:[40,260]},
 {kind:'cars',speed:2,x:[100,340]},
 {kind:'logs',speed:-1.4,x:[40,260]},
 {kind:'logs',speed:1.8,x:[0,230]},
 {kind:'logs',speed:-2,x:[100,350]}
],rows=[3,4,5,7,8,9];
function random(seed){let x=seed|0||1;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}
function clear(lanes,x,r){
 const center=x*42+21,lane=lanes.find(l=>l.r===r);
 return !lane||(!lane.cars||!lane.cars.some(v=>Math.abs(v-center)<31))&&
    (!lane.logs||lane.logs.some(v=>center>=v-6&&center<=v+110));
}
const directions=[[0,-1],[0,1],[-1,0],[1,0]];
function safePath(lanes){
 const todo=[{x:5,r:12,steps:[]}],visited=new Set(["5,12"]);
 for(let index=0;index<todo.length;index++){
  const node=todo[index];if(node.r===0)return node.steps;
  for(const [dx,dy] of directions){
   const x=node.x+dx,r=node.r+dy,key=x+","+r;
   if(x<0||x>9||r<0||r>12||visited.has(key)||!clear(lanes,x,r))continue;
   visited.add(key);todo.push({x,r,steps:[...node.steps,[dx,dy]]});
  }
 }
 return null;
}
function attempt(difficulty,stage,salt){
 const d={easy:0,normal:1,hard:2}[difficulty],next=random((stage*73856093^d*19349663^salt*83492791)>>>0);
 const rotation=next(6),order=templates.map((_,i)=>i);
 for(let i=order.length-1;i>0;i--){const j=next(i+1);[order[i],order[j]]=[order[j],order[i]];}
 return rows.map((r,i)=>{
  const t=templates[order[(i+rotation)%6]],shift=-50+next(110),dir=next(3)===0?-1:1;
  const offsets=t.x.map((x,j)=>x+shift+((stage+j)%4)*7);
  return {r,v:t.speed*dir*({easy:.83,normal:1,hard:1.2}[difficulty]+stage*.025),[t.kind]:offsets};
 });
}
function generate(difficulty,stage){
 const d={easy:0,normal:1,hard:2}[difficulty];
 if(d===undefined||!Number.isInteger(stage)||stage<1||stage>20)throw Error("Invalid Frogger stage");
 const requiredMoves=12+d+Math.floor((stage-1)/8);
 for(let salt=0;salt<500;salt++){
  const lanes=attempt(difficulty,stage,salt),steps=safePath(lanes);
  if(steps&&steps.length>=requiredMoves)return {lanes,steps};
 }
 throw Error("Frogger stage cannot be constructed with a safe finish "+difficulty+"/"+stage);
}
window.FroggerLevels={
 create:(difficulty,stage)=>generate(difficulty,stage).lanes,
 solvePath:(difficulty,stage)=>generate(difficulty,stage).steps
};
})();