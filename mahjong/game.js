(()=>{const {el,btn,grid,shuffle}=G;const symbols=["🐉","🎋","🌸","☯️","🀄","💠","🌿","🌙","☀️","🏮","🍀","🎴","⭐","🐼","🪷","🌀","🦊","🌈","🍎","🦉","🍇","🎲","🚲","🦋","🐠","🧩","🪁","🥝","🍉","🦄","🎯","🚀"];let s;const P=G.progress(start);
function plan(stage=P.stage,difficulty=P.difficulty){
 const available=difficulty==="easy"?symbols.slice(0,8):difficulty==="normal"?symbols.slice(0,16):symbols;
 const ids=G.shuffleStage(available.flatMap(v=>Array(32/available.length).fill(symbols.indexOf(v))),"mahjong-colors",stage,difficulty);
 const next=G.stageRandom("mahjong-free-removals",stage,difficulty);
 const rows=Array.from({length:8},(_,row)=>Array.from({length:8},(_,col)=>row*8+col));
 const board=new Array(64),solution=[];
 for(const color of ids){
  const free=rows.flatMap(row=>row.length?[row[0],row[row.length-1]]:[]).filter((v,i,a)=>a.indexOf(v)===i);
  const a=free[next(free.length)];
  let choices=free.filter(i=>i!==a);
  if(!choices.length)throw Error("Mahjong pair-generation exhausted");
  const cross={easy:.25,normal:.60,hard:.90}[difficulty]+Math.min(.1,(stage-1)*.005);
  if(next(1000)<cross*1000&&choices.some(i=>Math.floor(i/8)!==Math.floor(a/8))){
   choices=choices.filter(i=>Math.floor(i/8)!==Math.floor(a/8));
  }else if(choices.some(i=>Math.floor(i/8)===Math.floor(a/8))){
   choices=choices.filter(i=>Math.floor(i/8)===Math.floor(a/8));
  }
  const b=choices[next(choices.length)];
  board[a]=board[b]=color;solution.push([a,b]);
  rows[Math.floor(a/8)].splice(rows[Math.floor(a/8)].indexOf(a),1);
  rows[Math.floor(b/8)].splice(rows[Math.floor(b/8)].indexOf(b),1);
 }
 return {board,solution};
}
window.MahjongLevels={create:(stage,difficulty)=>plan(stage,difficulty).board,solveOrder:(stage,difficulty)=>plan(stage,difficulty).solution};
function start(){s={tiles:plan().board,selected:-1,moves:0,shuffles:0};save();render();}
function save(){G.store("round",s)}const free=i=>{if(s.tiles[i]===null)return false;const x=i%8;return x===0||x===7||s.tiles[i-1]===null||s.tiles[i+1]===null;};
function tap(i){if(!free(i))return;if(s.selected===i){s.selected=-1;return render();}if(s.selected!==-1&&s.tiles[s.selected]===s.tiles[i]&&free(s.selected)){s.tiles[s.selected]=null;s.tiles[i]=null;s.selected=-1;s.moves++;save();render();if(s.tiles.every(v=>v===null))P.win();return;}s.selected=i;render();}
function reshuffle(){const positions=s.tiles.map((v,i)=>v!==null?i:-1).filter(v=>v!==-1),values=shuffle(positions.map(i=>s.tiles[i]));positions.forEach((p,i)=>s.tiles[p]=values[i]);s.selected=-1;s.shuffles++;save();render();}
function hint(){const ids=s.tiles.map((v,i)=>free(i)?i:-1).filter(i=>i>=0);for(const i of ids)for(const j of ids)if(j>i&&s.tiles[i]===s.tiles[j]){s.selected=i;render();G.msg("💡 Διάλεξε το άλλο "+symbols[s.tiles[i]]+" στην ελεύθερη πλευρά.");return;}G.msg("Δεν υπάρχει ελεύθερο ζευγάρι — πάτησε Ανακάτεμα.");}
function render(){const remain=s.tiles.filter(v=>v!==null).length;G.score("Πλακίδια: "+remain+"/64 · Ζευγάρια: "+s.moves+" · Ανακατέματα: "+s.shuffles);G.ctrl(btn("↻ Νέο",start),btn("💡 Βοήθεια",hint,"secondary"),btn("🔀 Ανακάτεμα",reshuffle,"secondary"));const tiles=s.tiles.map((v,i)=>({label:v===null?"":symbols[v],cls:v===null?"empty":!free(i)?"reveal":s.selected===i?"active":"",disabled:v===null||!free(i)}));G.render(grid(8,tiles,tap));G.msg(remain===0?"🏆 Ένωσες όλα τα ζευγάρια!":"Επίλεξε δύο ίδια ελεύθερα πλακίδια. Ελεύθερο = ανοιχτή πλευρά αριστερά ή δεξιά.");}
s=G.load("round");if(!s?.tiles||s.tiles.length!==64)start();else render();})();