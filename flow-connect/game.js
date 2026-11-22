(()=>{
const {el,btn}=G;
const colors=["#ff6988","#58d2ff","#f8c34d","#8ae78a","#bd97ff","#ff9d60"];
let s,board=null,drag=null;
const P=G.progress(start);
function points(){
 const rot=(P.stage-1)%4,skipped=(Math.floor((P.stage-1)/4)+5)%6;
 const rows=[0,1,2,3,4,5].filter(r=>P.difficulty==="hard"||r!==skipped);
 const chosen=P.difficulty==="easy"?rows.filter((_,i)=>i%2===0):rows;
 const transform=(x,y)=>rot===0?y*6+x:rot===1?x*6+(5-y):rot===2?(5-y)*6+(5-x):(5-x)*6+y;
 return chosen.map(y=>[transform(0,y),transform(5,y)]);
}
const neighbors=(a,b)=>Math.abs(Math.floor(a/6)-Math.floor(b/6))+Math.abs(a%6-b%6)===1;

function save(){G.store("round",s);}
function owner(i){return s.paths.findIndex(p=>p.includes(i));}
function endpoint(i){return points().findIndex(pair=>pair.includes(i));}
function completed(k){const [a,b]=points()[k],p=s.paths[k];return p.length>1&&p.includes(a)&&p.includes(b);}
function solved(){return s.paths.every((_,k)=>completed(k));}
function stats(){
 G.score("Συνδέσεις: "+s.paths.filter((_,k)=>completed(k)).length+"/"+points().length+" · Κινήσεις: "+s.moves+" · Πίστα "+P.stage);
 G.msg(solved()?"🏆 Όλες οι γραμμές συνδέθηκαν! Πήγαινε στην επόμενη πίστα.":"Σύρε το χρώμα στον αντίστοιχο κύκλο για να ενώσεις τα ζευγάρια.");
}
function paint(){
 if(!board)return;
 for(const b of board.children){
  const i=Number(b.dataset.cell),k=owner(i),e=endpoint(i);
  b.className="tile flow"+(e>=0?" flow-endpoint":k>=0?" flow-path":"")+(drag?.color===k?" active":"");
  b.textContent=e>=0?String(e+1):k>=0?"━":"";
  b.setAttribute("aria-label",e>=0?"Τερματικό "+(e+1):k>=0?"Διαδρομή "+(k+1):"Κενό τετράγωνο");
  b.style.cssText="background:"+(e>=0?colors[e]:k>=0?colors[k]+"80":"#0a2946")+";color:"+(e>=0?"#091b31":k>=0?"#f4faff":"white")+";border-color:"+(e>=0?"#ffffff":k>=0?colors[k]:"#3a719b");
 }
 stats();
}
function cellAt(x,y){
 if(!board)return -1;
 const r=board.getBoundingClientRect();
 if(x<r.left||y<r.top||x>=r.right||y>=r.bottom)return -1;
 return Math.max(0,Math.min(35,Math.floor((y-r.top)/r.height*6)*6+Math.floor((x-r.left)/r.width*6)));
}
function begin(i,pointerId){
 const k=endpoint(i);
 if(k<0)return false;
 s.paths[k]=[i];s.active=k;drag={color:k,id:pointerId,complete:false};
 save();paint();return true;
}
function extend(i){
 if(!drag||drag.complete||i<0)return;
 const k=drag.color,p=s.paths[k],last=p.at(-1);
 if(i===last)return;
 if(p.length>1&&p[p.length-2]===i){p.pop();s.moves++;save();paint();return;}
 if(!neighbors(last,i))return;
 const end=endpoint(i),owned=owner(i);
 if(end>=0&&end!==k||end===k&&i===p[0]||owned>=0&&owned!==k||owned===k)return;
 p.push(i);s.moves++;
 if(end===k){s.active=-1;drag.complete=true;}
 save();paint();
}
function end(){
 if(!drag)return;
 drag=null;s.active=-1;save();paint();if(solved())P.win();
}
function render(){
 G.ctrl(btn("↻ Επανεκκίνηση",()=>{
  drag=null;s.paths=points().map(([a])=>[a]);s.active=-1;s.moves=0;save();render();
 }),...(P.highest>P.stage?[btn("Επόμενη πίστα",()=>P.select(P.difficulty,P.stage+1),"secondary")]:[]));
 const grid=el("div","grid-board flow-board");
 grid.style.cssText="grid-template-columns:repeat(6,minmax(0,1fr));width:min(100%,440px);touch-action:none";
 for(let i=0;i<36;i++){const b=el("button","tile flow");b.type="button";b.dataset.cell=i;grid.append(b);}
 board=grid;
 let previous=null;
 grid.addEventListener("pointerdown",e=>{
  if(!e.isPrimary||e.button!==0)return;
  const i=cellAt(e.clientX,e.clientY);
  if(!begin(i,e.pointerId))return;
  e.preventDefault();
  try{grid.setPointerCapture(e.pointerId)}catch(_){}
  previous={x:e.clientX,y:e.clientY};
 });
 const advance=(x,y)=>{
  if(!drag||!previous)return;
  const dist=Math.hypot(x-previous.x,y-previous.y);
  const size=Math.max(8,grid.getBoundingClientRect().width/24);
  const steps=Math.min(200,Math.max(1,Math.ceil(dist/size)));
  for(let n=1;n<=steps;n++){
   const ratio=n/steps;
   extend(cellAt(previous.x+(x-previous.x)*ratio,previous.y+(y-previous.y)*ratio));
   if(drag?.complete)break;
  }
  previous={x,y};
 };
 grid.addEventListener("pointermove",e=>{
  if(!drag||drag.id!==e.pointerId)return;
  e.preventDefault();advance(e.clientX,e.clientY);
 });
 grid.addEventListener("pointerup",e=>{
  if(!drag||e.pointerId!==drag.id)return;
  advance(e.clientX,e.clientY);end();previous=null;
 });
 const cancel=e=>{if(drag&&drag.id===e.pointerId){end();previous=null;}};
 grid.addEventListener("pointercancel",cancel);
 grid.addEventListener("lostpointercapture",cancel);
 G.render(grid);paint();
}
function start(){s={level:P.stage-1,paths:[],active:-1,moves:0};s.paths=points().map(([a])=>[a]);save();render();}
s=G.load("round");
if(!s?.paths||s.paths.length!==points().length)start();
else{s.active=-1;render();}
})();
