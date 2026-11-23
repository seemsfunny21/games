(()=>{const {el,btn,grid,shuffle}=G;const symbols=["🐉","🎋","🌸","☯️","🀄","💠","🌿","🌙","☀️","🏮","🍀","🎴","⭐","🐼","🪷","🌀","🦊","🌈","🍎","🦉","🍇","🎲","🚲","🦋","🐠","🧩","🪁","🥝","🍉","🦄","🎯","🚀"];let s;const P=G.progress(start);
function construct(stage=P.stage,difficulty=P.difficulty){
 const available=difficulty==="easy"?symbols.slice(0,8):difficulty==="normal"?symbols.slice(0,16):symbols;
 const ids=available.flatMap(v=>Array(32/available.length).fill(symbols.indexOf(v)));
 const pairs=G.shuffleStage(ids,"mahjong-solvable",stage,difficulty);
 const board=Array(64);
 // Mirror each identical pair at opposite ends of a row.
 // Clearing from the outside inward always leaves two free matching tiles.
 for(let row=0;row<8;row++)for(let column=0;column<4;column++){
  const color=pairs[row*4+column];
  board[row*8+column]=color;board[row*8+7-column]=color;
 }
 return board;
}
window.MahjongLevels={create:construct};
function start(){s={tiles:construct(),selected:-1,moves:0,shuffles:0};save();render();}
function save(){G.store("round",s)}const free=i=>{if(s.tiles[i]===null)return false;const x=i%8;return x===0||x===7||s.tiles[i-1]===null||s.tiles[i+1]===null;};
function tap(i){if(!free(i))return;if(s.selected===i){s.selected=-1;return render();}if(s.selected!==-1&&s.tiles[s.selected]===s.tiles[i]&&free(s.selected)){s.tiles[s.selected]=null;s.tiles[i]=null;s.selected=-1;s.moves++;save();render();if(s.tiles.every(v=>v===null))P.win();return;}s.selected=i;render();}
function reshuffle(){const positions=s.tiles.map((v,i)=>v!==null?i:-1).filter(v=>v!==-1),values=shuffle(positions.map(i=>s.tiles[i]));positions.forEach((p,i)=>s.tiles[p]=values[i]);s.selected=-1;s.shuffles++;save();render();}
function hint(){const ids=s.tiles.map((v,i)=>free(i)?i:-1).filter(i=>i>=0);for(const i of ids)for(const j of ids)if(j>i&&s.tiles[i]===s.tiles[j]){s.selected=i;render();G.msg("💡 Διάλεξε το άλλο "+symbols[s.tiles[i]]+" στην ελεύθερη πλευρά.");return;}G.msg("Δεν υπάρχει ελεύθερο ζευγάρι — πάτησε Ανακάτεμα.");}
function render(){const remain=s.tiles.filter(v=>v!==null).length;G.score("Πλακίδια: "+remain+"/64 · Ζευγάρια: "+s.moves+" · Ανακατέματα: "+s.shuffles);G.ctrl(btn("↻ Νέο",start),btn("💡 Βοήθεια",hint,"secondary"),btn("🔀 Ανακάτεμα",reshuffle,"secondary"));const tiles=s.tiles.map((v,i)=>({label:v===null?"":symbols[v],cls:v===null?"empty":!free(i)?"reveal":s.selected===i?"active":"",disabled:v===null||!free(i)}));G.render(grid(8,tiles,tap));G.msg(remain===0?"🏆 Ένωσες όλα τα ζευγάρια!":"Επίλεξε δύο ίδια ελεύθερα πλακίδια. Ελεύθερο = ανοιχτή πλευρά αριστερά ή δεξιά.");}
s=G.load("round");if(!s?.tiles||s.tiles.length!==64)start();else render();})();