(()=>{
"use strict";
const {el,btn}=G;
const palette=["#ff647e","#53d4ff","#ffd260","#73eab0","#ba9cff","#ff9b64"];
const P=G.progress(start);
let s,root,board,pointer=null;
const copy=tubes=>tubes.map(t=>t.slice());
function isComplete(t){return t.length===4&&t.every(v=>v===t[0]);}
function valid(saved){
 if(!saved||saved.version!==1||!Array.isArray(saved.tubes)||!Number.isInteger(saved.colors))return false;
 const puzzle=WaterLevels.create(P.difficulty,P.stage),counts=Array(saved.colors).fill(0);
 if(saved.colors!==puzzle.colors||saved.tubes.length!==puzzle.tubes.length)return false;
 for(const bottle of saved.tubes){
  if(!Array.isArray(bottle)||bottle.length>4)return false;
  for(const color of bottle){if(!Number.isInteger(color)||color<0||color>=saved.colors)return false;counts[color]++;}
 }
 return counts.every(n=>n===4)&&Number.isInteger(saved.moves)&&saved.moves>=0&&Array.isArray(saved.undo);
}
function save(){G.store("round",s);}
function start(){
 const puzzle=WaterLevels.create(P.difficulty,P.stage);
 s={version:1,colors:puzzle.colors,tubes:copy(puzzle.tubes),selected:-1,moves:0,undo:[],finished:false};
 save();render();
}
function messageDefault(){G.msg("Πάτα το πρώτο μπουκάλι και μετά το δεύτερο ή σύρε το χρώμα.");}
function finishIfSolved(){
 if(!WaterLevels.solved(s.tubes))return;
 s.finished=true;save();render();
 G.msg("🏆 Όλα τα χρώματα ταξινομήθηκαν! Επόμενη πίστα...");
 P.win();
}
function move(from,to){
 if(s.finished||from===to)return false;
 const before=copy(s.tubes),moved=WaterLevels.pour(s.tubes,from,to);
 if(!moved){G.msg("Χρειάζεται άδειο μπουκάλι ή ίδιο χρώμα με ελεύθερο χώρο.");return false;}
 s.undo.push(before);if(s.undo.length>60)s.undo.shift();
 s.moves++;s.selected=-1;save();render();
 finishIfSolved();
 return true;
}
function choose(i){
 if(s.finished)return;
 const selected=s.selected;
 if(selected<0){
  if(!s.tubes[i].length){G.msg("Πάτα πρώτα ένα μπουκάλι που έχει χρώμα.");return;}
  s.selected=i;save();render();return;
 }
 if(selected===i){s.selected=-1;save();render();return;}
 if(!move(selected,i)){
  s.selected=s.tubes[i].length?i:-1;
  save();render();
 }
}
function undo(){
 if(s.finished||!s.undo.length)return;
 s.tubes=s.undo.pop();s.moves=Math.max(0,s.moves-1);s.selected=-1;
 save();render();messageDefault();
}
function drawBottle(tube,i){
 const active=s.selected===i;
 const b=el("button","water-bottle"+(active?" selected":"")+(isComplete(tube)?" complete":"")+(s.finished?" finished":""));
 b.type="button";b.dataset.tube=String(i);b.disabled=s.finished;
 b.setAttribute("aria-label","Μπουκάλι "+(i+1)+" · "+(tube.length?tube.length+" στρώσεις χρώματος":"κενό")+(isComplete(tube)?" · ολοκληρωμένο":""));
 b.setAttribute("aria-pressed",String(active));
 const glass=el("span","water-glass");glass.setAttribute("aria-hidden","true");
 const liquid=el("span","water-liquid");
 tube.forEach((color,layer)=>{
  const segment=el("span","water-layer");segment.style.setProperty("--water-color",palette[color]);
  segment.style.bottom=(layer*25)+"%";liquid.append(segment);
 });
 glass.append(liquid,el("span","water-glare"));
 const label=el("span","water-label",String(i+1));
 b.append(glass,label);
 b.addEventListener("click",e=>{if(e.detail===0)choose(i);});
 return b;
}
function render(){
 G.ctrl(btn("↻ Ξανά",start),(()=>{const b=btn("↶ Αναίρεση",undo,"secondary");b.disabled=!s.undo.length||s.finished;return b;})());
 root=el("div","water-layout");
 const note=el("p","water-instruction","Άγγιξε δύο μπουκάλια ή σύρε το νερό.");
 board=el("div","water-board");
 board.setAttribute("role","group");board.setAttribute("aria-label","Μπουκάλια με χρωματιστό νερό");
 for(let i=0;i<s.tubes.length;i++)board.append(drawBottle(s.tubes[i],i));
 pointer=null;
 board.addEventListener("pointerdown",event=>{
  if(!event.isPrimary||event.button!==0||s.finished)return;
  const hit=event.target.closest("[data-tube]");if(!hit)return;
  pointer={id:event.pointerId,source:Number(hit.dataset.tube),x:event.clientX,y:event.clientY};
  try{board.setPointerCapture(event.pointerId);}catch(_){}
 });
 board.addEventListener("pointerup",event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const down=pointer;pointer=null;
  const hit=document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-tube]");
  const target=hit&&board.contains(hit)?Number(hit.dataset.tube):-1;
  if(target<0)return;
  if(down.source!==target&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>12){
   if(!move(down.source,target))render();
  }else choose(target);
 });
 board.addEventListener("pointercancel",()=>{pointer=null;});
 board.addEventListener("lostpointercapture",()=>{pointer=null;});
 root.append(note,board);
 G.render(root);
 G.score("Χρώματα: "+s.colors+" · Ολοκληρωμένα: "+s.tubes.filter(isComplete).length+"/"+s.colors+" · Κινήσεις: "+s.moves);
 if(!s.finished)messageDefault();
}
const previous=G.load("round");
if(valid(previous)&&!previous.finished){s=previous;s.selected=-1;render();}
else start();
})();