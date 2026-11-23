/* Deterministic reverse-constructed Water Sort boards.
   Every board has an exact legal sequence of pours back to the solved state. */
(()=>{
"use strict";
const CAP=4;
const CONFIG={easy:{min:3,max:4,base:7,step:1},normal:{min:4,max:5,base:10,step:1},hard:{min:5,max:6,base:14,step:1}};
function random(seed){let state=seed|0||1;return n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)%n;};}
function seed(difficulty,level,salt){let h=2166136261;for(const ch of difficulty+":"+level+":"+salt)h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;return h;}
function clone(board){return board.map(t=>t.slice());}
function solved(board){return board.every(t=>!t.length||t.length===CAP&&t.every(x=>x===t[0]));}
function pour(board,from,to){
 if(from===to||from<0||to<0||from>=board.length||to>=board.length)return 0;
 const src=board[from],dest=board[to];if(!src.length||dest.length===CAP)return 0;
 const color=src[src.length-1];if(dest.length&&dest[dest.length-1]!==color)return 0;
 let count=0;while(src.length&&src[src.length-1]===color&&dest.length<CAP){dest.push(src.pop());count++;}
 return count;
}
function key(board){return board.map(t=>t.join("")).join("|");}
function create(difficulty,stage){
 const settings=CONFIG[difficulty];
 if(!settings||!Number.isInteger(stage)||stage<1||stage>20)throw Error("Invalid Water Sort stage");
 const colors=settings.min+(stage>=11&&settings.max>settings.min?1:0);
 const count=colors+2,steps=settings.base+stage*settings.step;
 for(let attempt=0;attempt<48;attempt++){
  const rand=random(seed(difficulty,stage,attempt));
  let board=Array.from({length:count},(_,i)=>i<colors?Array(CAP).fill(i):[]);
  const inverse=[],visited=new Set([key(board)]);
  for(let turn=0;turn<steps;turn++){
   const candidates=[];
   for(let a=0;a<count;a++){
    const source=board[a];if(!source.length)continue;
    const color=source[source.length-1];
    let run=0;for(let j=source.length-1;j>=0&&source[j]===color;j--)run++;
    const pure=run===source.length;
    for(let b=0;b<count;b++){
     const target=board[b];
     if(a===b||target.length===CAP||(target.length&&target[target.length-1]===color))continue;
     for(let num=1;num<=Math.min(run,CAP-target.length);num++){
      if(!pure&&num===run)continue;
      const next=clone(board);
      for(let j=0;j<num;j++)next[b].push(next[a].pop());
      const fingerprint=key(next);if(visited.has(fingerprint))continue;
      const check=clone(next);
      if(pour(check,b,a)!==num||key(check)!==key(board))continue;
      const mixedBefore=board.filter(t=>new Set(t).size>1).length;
      const mixedAfter=next.filter(t=>new Set(t).size>1).length;
      const score=(mixedAfter>mixedBefore?6:0)+(target.length?3:0)+(num===1?1:0)+rand(4);
      candidates.push({next,a,b,score,fingerprint});
     }
    }
   }
   if(!candidates.length)break;
   candidates.sort((x,y)=>y.score-x.score);
   const pick=candidates[rand(Math.min(8,candidates.length))];
   board=pick.next;inverse.push([pick.b,pick.a]);visited.add(pick.fingerprint);
  }
  const mixed=board.filter(t=>new Set(t).size>1).length;
  if(solved(board)||inverse.length<Math.min(9,steps*.48)||mixed<2)continue;
  const solution=inverse.reverse();
  const check=clone(board);
  for(const [from,to] of solution)if(!pour(check,from,to))throw Error("Water Sort solution step invalid");
  if(!solved(check))throw Error("Water Sort solution incomplete");
  return {tubes:board,colors,solution,reverseSteps:inverse.length,signature:key(board)};
 }
 throw Error("Could not create a solvable Water Sort stage "+difficulty+"/"+stage);
}
window.WaterLevels={create,pour,solved,capacity:CAP};
})();