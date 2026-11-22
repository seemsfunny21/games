/* Stable Frogger lane layouts: 20 unique challenges in each difficulty. */
(()=>{
'use strict';
const templates=[
 {kind:'cars',speed:1.7,x:[30,220]},
 {kind:'cars',speed:-2.5,x:[40,260]},
 {kind:'cars',speed:2,x:[100,340]},
 {kind:'logs',speed:-1.4,x:[40,260]},
 {kind:'logs',speed:1.8,x:[0,230]},
 {kind:'logs',speed:-2,x:[100,350]}
],rows=[3,4,5,7,8,9];
function random(seed){let x=seed|0||1;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}
function create(difficulty,stage){
 const d={easy:0,normal:1,hard:2}[difficulty];
 if(d===undefined||!Number.isInteger(stage)||stage<1||stage>20)throw Error('Invalid Frogger stage');
 if(difficulty==='normal'&&stage===1)return templates.map((t,i)=>({r:rows[i],v:t.speed,[t.kind]:[...t.x]}));
 const next=random((stage*73856093^d*19349663)>>>0);
 const rotation=next(6),laneOrder=templates.map((_,i)=>i);
 for(let i=laneOrder.length-1;i>0;i--){const j=next(i+1);[laneOrder[i],laneOrder[j]]=[laneOrder[j],laneOrder[i]];}
 return rows.map((r,i)=>{
  const t=templates[laneOrder[(i+rotation)%6]];
  const shift=-50+next(110),dir=(next(3)===0?-1:1);
  const offsets=t.x.map((x,j)=>x+shift+((stage+j)%4)*7);
  return {r,v:t.speed*dir*({easy:.83,normal:1,hard:1.2}[difficulty]+stage*.025),[t.kind]:offsets};
 });
}
window.FroggerLevels={create};
})();