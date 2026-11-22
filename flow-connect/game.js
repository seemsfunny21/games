(()=>{const {el,btn}=G;const colors=["#ff6988","#58d2ff","#f8c34d","#8ae78a","#bd97ff","#ff9d60"];const puzzles=[
[[0,5],[6,11],[12,17],[18,23],[24,29]],
[[0,30],[1,31],[2,32],[3,33],[4,34]],
[[0,7],[5,10],[12,19],[17,22],[24,31]]
];let s;
const neighbors=(a,b)=>Math.abs(Math.floor(a/6)-Math.floor(b/6))+Math.abs(a%6-b%6)===1;
function start(){const level=(G.load("progress",0)||0)%puzzles.length;s={level,paths:puzzles[level].map(([a])=>[a]),active:-1,moves:0};save();render();}
function save(){G.store("round",s)}
function points(){return puzzles[s.level]}
function owner(i){for(let k=0;k<s.paths.length;k++)if(s.paths[k].includes(i))return k;return -1}
function endpoint(i){for(let k=0;k<points().length;k++)if(points()[k].includes(i))return k;return -1}
function completed(k){const p=s.paths[k],pair=points()[k];return p.includes(pair[0])&&p.includes(pair[1])&&p.length>1}
function tap(i){const end=endpoint(i),who=owner(i);if(end>=0){if(who===end&&s.paths[end].at(-1)===i&&s.paths[end].length>1)return;if(s.active!==-1&&s.active===end&&neighbors(s.paths[end].at(-1),i)&&i!==s.paths[end][0]){s.paths[end].push(i);s.active=-1;}else{s.active=end;s.paths[end]=[i];}s.moves++;save();render();return;}
if(s.active<0)return;const path=s.paths[s.active],last=path.at(-1);
if(path.length>1&&i===path[path.length-2]){path.pop();s.moves++;save();return render();}
if(!neighbors(last,i)||who!==-1||end!==-1||completed(s.active))return;path.push(i);s.moves++;save();render();}
function check(){return s.paths.every((p,k)=>completed(k));}
function render(){G.score("Συνδέσεις: "+s.paths.filter((p,k)=>completed(k)).length+"/"+points().length+" · Κινήσεις: "+s.moves+" · Πίστα "+(s.level+1));G.ctrl(btn("↻ Επανεκκίνηση",()=>{s.paths=points().map(([a])=>[a]);s.active=-1;s.moves=0;save();render()}),btn("Επόμενη πίστα",()=>{s.level=(s.level+1)%puzzles.length;s.paths=points().map(([a])=>[a]);s.active=-1;s.moves=0;save();render()},"secondary"));const grid=el("div","grid-board");grid.style.cssText="grid-template-columns:repeat(6,minmax(0,1fr));width:min(100%,440px);touch-action:none";for(let i=0;i<36;i++){const k=owner(i),e=endpoint(i),b=el("button","tile flow"+(s.active===k&&k!==-1?" active":""),e>=0?"●":k>=0?"━":"");b.type="button";b.dataset.cell=i;b.style.cssText="background:"+(k>=0?colors[k]:"#0a2946")+";color:"+(k>=0?"#08243c":"white")+";border-color:"+(k>=0?colors[k]:"#3a719b");b.onclick=()=>tap(i);grid.appendChild(b);}G.render(grid);G.msg(check()?"🏆 Όλες οι γραμμές συνδέθηκαν! Δοκίμασε την επόμενη πίστα.":"Πάτα αρχή χρώματος και συνέχισε πατώντας γειτονικά τετράγωνα. Πάτα την αρχή για νέα διαδρομή.");}
s=G.load("round");if(!s?.paths||s.paths.length!==5)start();else render();})();