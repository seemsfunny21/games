'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../water-sort/levels.js'),'utf8'),scope,{timeout:1200});
const L=scope.window.WaterLevels,CAP=4;
assert.equal(L.version,2,'Water campaign generator version');
const canonical=b=>b.map(t=>t.join('')).sort().join('|');
function heuristic(board){
 let blocks=0;
 for(const tube of board)for(let i=0;i<tube.length;i++)
  if(!i||tube[i]!==tube[i-1])blocks++;
 return blocks-(board.length-2);
}
function finished(board){return board.every(t=>!t.length||t.length===CAP&&t.every(c=>c===t[0]));}
const lower=(a,b)=>a[0]<b[0]||a[0]===b[0]&&a[1]<b[1];
function push(h,v){
 let k=h.length;h.push(v);
 while(k){const parent=(k-1)>>1;if(lower(h[parent],v))break;h[k]=h[parent];k=parent;}
 h[k]=v;
}
function pop(h){
 const top=h[0],last=h.pop();if(h.length){
  let k=0;
  while(k*2+1<h.length){
   const a=k*2+1,b=a+1,child=b<h.length&&lower(h[b],h[a])?b:a;
   if(lower(last,h[child]))break;
   h[k]=h[child];k=child;
  }
  h[k]=last;
 }
 return top;
}
function exactMinimum(initial){
 const queue=[],seen=new Map([[canonical(initial),0]]);
 let serial=0,explored=0;
 push(queue,[heuristic(initial),0,serial++,initial,0]);
 while(queue.length){
  const [estimate,_,id,board,moves]=pop(queue);
  if(seen.get(canonical(board))!==moves)continue;
  if(finished(board))return moves;
  if(++explored>300000)throw Error('A* complexity threshold unexpectedly exceeded');
  for(let source=0;source<board.length;source++){
   const a=board[source];if(!a.length||a.length===4&&a.every(c=>c===a[0]))continue;
   for(let destination=0;destination<board.length;destination++){
    const b=board[destination];
    if(source===destination||b.length===4||b.length&&b.at(-1)!==a.at(-1))continue;
    if(!b.length&&board.some((t,i)=>i<destination&&!t.length))continue;
    const next=board.map(t=>[...t]);
    assert.ok(L.pour(next,source,destination)>0);
    const key=canonical(next);
    if(seen.has(key)&&seen.get(key)<=moves+1)continue;
    seen.set(key,moves+1);
    push(queue,[moves+1+heuristic(next),-(moves+1),serial++,next,moves+1]);
   }
  }
 }
 throw Error('Unsolvable board detected');
}
function normalize(board){
 const labels=new Map;let n=0;
 return board.map(t=>t.map(c=>{if(!labels.has(c))labels.set(c,n++);return labels.get(c)}).join('')).join('|');
}
const global=new Set();
const thresholds={easy:10,normal:15,hard:21};
for(const diff of ['easy','normal','hard']){
 const list=[],scores=[];
 for(let level=1;level<=20;level++){
  const p=L.create(diff,level),q=L.create(diff,level);
  assert.equal(JSON.stringify(p),JSON.stringify(q),'Same campaign level must always be identical');
  assert.equal(p.version,2);
  assert.equal(p.tubes.length,p.colors+2);
  assert.equal(p.tubes.filter(t=>t.length===0).length,2,'Exactly two empty tubes');
  assert.equal(p.tubes.filter(t=>t.length===CAP).length,p.colors,'All active bottles start full');
  assert.ok(p.colors>=4&&p.colors<=8);
  const counts=Array(p.colors).fill(0);
  for(const tube of p.tubes)for(const color of tube){
   assert.ok(Number.isInteger(color)&&color>=0&&color<p.colors);
   counts[color]++;
  }
  assert.ok(counts.every(x=>x===4),'Each colour appears exactly four times');
  assert.ok(p.tubes.filter(t=>new Set(t).size>1).length>=p.colors-1,'Nearly every bottle must contain mixed colours');
  assert.ok(!L.solved(p.tubes),'Starting board cannot already be complete');
  assert.equal(p.solution.length,p.minMoves,'Printed winning path equals declared minimum');
  const working=p.tubes.map(t=>[...t]);
  for(const [a,b] of p.solution){
   assert.ok(L.pour(working,a,b)>0,'Every solution step must be a permitted pour');
  }
  assert.ok(L.solved(working),'All solution steps finish the puzzle');
  const exact=exactMinimum(p.tubes.map(t=>[...t]));
  assert.equal(p.minMoves,exact,'Claimed minimum moves must actually be optimal');
  assert.ok(exact>=thresholds[diff],diff+' is appropriately challenging');
  const signature=normalize(p.tubes);
  assert.ok(!global.has(signature),'No duplicated colour pattern in the campaign');
  global.add(signature);
  scores.push(exact);list.push(signature);
 }
 assert.equal(new Set(list).size,20,diff+' must contain twenty structurally distinct boards');
 if(diff==='normal'){
  assert.deepEqual(scores.slice(0,5),[15,16,17,17,19],'First five normal levels must be more demanding and varied');
  assert.equal(L.create(diff,1).colors,5);
  assert.equal(L.create(diff,4).colors,6);
  assert.equal(L.create(diff,10).colors,7);
  assert.equal(L.create(diff,15).colors,8);
 }
 console.log('PASS Water Sort '+diff+' · 20 nonrepeating solvable boards · minimum moves '+scores.join(','));
}
assert.equal(global.size,60,'Sixty distinct Water Sort levels audited');
