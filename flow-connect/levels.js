/* Twenty deterministic, solvable Flow Connect boards per difficulty.
 * Every pair comes from a disjoint, orthogonally adjacent route.
 * Keeping layouts stable means choosing a previously cleared stage shows
 * the same puzzle instead of a random replacement. */
(()=>{
"use strict";
const SIZE=6;
function rows(){
 const order=[];
 for(let y=0;y<SIZE;y++)for(let p=0;p<SIZE;p++)order.push(y*SIZE+(y%2?SIZE-1-p:p));
 return order;
}
function cols(){
 const order=[];
 for(let x=0;x<SIZE;x++)for(let p=0;p<SIZE;p++)order.push((x%2?SIZE-1-p:p)*SIZE+x);
 return order;
}
function spiral(){
 const order=[];let left=0,top=0,right=SIZE-1,bottom=SIZE-1;
 while(left<=right&&top<=bottom){
  for(let x=left;x<=right;x++)order.push(top*SIZE+x);
  for(let y=top+1;y<=bottom;y++)order.push(y*SIZE+right);
  if(top<bottom)for(let x=right-1;x>=left;x--)order.push(bottom*SIZE+x);
  if(left<right)for(let y=bottom-1;y>top;y--)order.push(y*SIZE+left);
  left++;right--;top++;bottom--;
 }
 return order;
}
const orders=[rows(),cols(),spiral()];
function random(seed){
 let x=seed|0||1;
 return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
}
function transform(index,rot,mirror){
 let x=index%SIZE,y=Math.floor(index/SIZE);
 if(mirror)x=SIZE-1-x;
 for(let i=0;i<rot;i++){const xx=SIZE-1-y;y=x;x=xx;}
 return y*SIZE+x;
}
const templates={
 easy:{index:0,count:3,min:4,low:18,high:24},
 normal:{index:1,count:5,min:4,low:26,high:32},
 hard:{index:2,count:6,min:3,low:32,high:36}
};
function create(difficulty,stage){
 const conf=templates[difficulty];
 const level=Math.floor(stage);
 if(!conf||!Number.isInteger(level)||level<1||level>20)throw Error("Invalid Flow campaign stage");
 if(difficulty==="normal"&&level===1){
  const paths=[0,1,2,3,4].map(y=>Array.from({length:6},(_,x)=>y*SIZE+x));
  return {pairs:paths.map(p=>[p[0],p.at(-1)]),solutions:paths};
 }
 for(let salt=0;salt<1000;salt++){
  const next=random((level*73856093^conf.index*19349663^salt*83492791)>>>0);
  const rotation=next(4),mirror=next(2),reverse=next(2);
  const route=orders[(level+conf.index)%orders.length].map(i=>transform(i,rotation,mirror));
  if(reverse)route.reverse();
  const used=conf.low+next(conf.high-conf.low+1),begin=next(36-used+1);
  const lengths=Array(conf.count).fill(conf.min);
  for(let i=used-conf.count*conf.min;i>0;i--)lengths[next(conf.count)]++;
  const paths=[];let offset=begin,valid=true;
  for(const len of lengths){
   const path=route.slice(offset,offset+len);offset+=len;
   const a=path[0],b=path.at(-1),distance=Math.abs(a%SIZE-b%SIZE)+Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE));
   if(distance<2){valid=false;break;}
   paths.push(path);
  }
  if(valid)return {pairs:paths.map(p=>[p[0],p.at(-1)]),solutions:paths};
 }
 throw Error("Could not generate distinct Flow stage");
}
window.FlowLevels={create};
})();