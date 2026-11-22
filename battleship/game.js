(()=>{const {el,btn,grid,shuffle,rand}=G;const N=8,ships=[4,3,3,2];let s;const P=G.progress(start);
function place(tag="enemy",stage=P.stage,difficulty=P.difficulty){
 for(let run=0;run<180;run++){
  const next=G.stageRandom("fleet-"+tag+"-"+run,stage,difficulty),board=Array(64).fill(0);
  let success=true;
  for(const length of ships){
   let fitted=false;
   for(let attempt=0;attempt<450&&!fitted;attempt++){
    const horizontal=next(2)===0,x=next(N),y=next(N);
    const pts=Array.from({length},(_,i)=>[x+(horizontal?i:0),y+(horizontal?0:i)]);
    if(pts.some(([xx,yy])=>xx>=N||yy>=N))continue;
    if(pts.some(([xx,yy])=>{
     for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      const a=xx+dx,b=yy+dy;
      if(a>=0&&a<N&&b>=0&&b<N&&board[b*N+a])return true;
     }
     return false;
    }))continue;
    for(const [xx,yy] of pts)board[yy*N+xx]=1;
    fitted=true;
   }
   if(!fitted){success=false;break;}
  }
  if(success)return board;
 }
 throw Error("Unable to create valid fleet");
}
window.BattleshipLevels={place};
function start(){s={mine:place("mine"),enemy:place("enemy"),myHits:[],theirHits:[],status:"playing",wins:0};save();render();}
function save(){G.store("round",s)}function finish(){if(s.theirHits.filter(i=>s.enemy[i]).length===ships.reduce((a,b)=>a+b,0)){s.status="win";s.wins++;P.win();G.msg("🏆 Βύθισες όλο τον στόλο!");return;}if(s.myHits.filter(i=>s.mine[i]).length===ships.reduce((a,b)=>a+b,0)){s.status="lose";G.msg("Ο υπολογιστής βύθισε τα πλοία σου.");}}
function fire(i){if(s.status!=="playing"||s.theirHits.includes(i))return;s.theirHits.push(i);finish();if(s.status==="playing"){const available=Array.from({length:64},(_,j)=>j).filter(j=>!s.myHits.includes(j));const lastHits=s.myHits.filter(j=>s.mine[j]);const hunt=shuffle(lastHits.flatMap(j=>[j-8,j+8,j-1,j+1].filter(k=>k>=0&&k<64&&(Math.abs((k%8)-(j%8))===1||Math.abs(k-j)===8)&&!s.myHits.includes(k))));const aim=Math.min(.96,{easy:.20,normal:.55,hard:.80}[P.difficulty]+P.stage*.009);let target=(hunt.length&&Math.random()<aim)?hunt[0]:available[rand(available.length)];s.myHits.push(target);finish();}save();render();}
function board(name,map,hits,hidden){const box=el("section");box.style.cssText="width:min(100%,340px);text-align:center";const h=el("strong","",name);box.appendChild(h);const cells=map.map((v,i)=>{const hit=hits.includes(i);return {label:hit?(v?"✖":"•"):v&&!hidden?"🚢":"",cls:hit?v?"bad":"reveal":v&&!hidden?"active":"",disabled:hit||(!hidden)};});const g=grid(8,cells,i=>hidden&&fire(i),"battleship-board");g.style.width="min(100%,340px)";g.style.marginTop="5px";box.appendChild(g);return box;}
function render(){G.score("Δικές σου βολές: "+s.theirHits.length+" · Βολές αντιπάλου: "+s.myHits.length+" · Βυθισμένα τμήματα: "+s.theirHits.filter(i=>s.enemy[i]).length+"/12");G.ctrl();const bar=document.querySelector(".game-topbar");if(bar){bar.classList.add("has-restart");bar.querySelector(".battleship-restart")?.remove();const b=btn("↻ Νέα",start,"secondary");b.classList.add("battleship-restart");b.setAttribute("aria-label","Νέα ναυμαχία");bar.insertBefore(b,bar.querySelector(".gear-button"));}const root=el("div","battleship-layout");root.dataset.view="enemy";const toggle=el("div","battleship-toggle");for(const [v,label] of [["enemy","🎯 Αντίπαλος"],["own","🚢 Τα πλοία μου"]]){const b=btn(label,()=>{root.dataset.view=v;toggle.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)))},v==="enemy"?"":"secondary");b.setAttribute("aria-pressed",String(v==="enemy"));toggle.append(b);}root.append(toggle);const enemy=board("Αντίπαλος · Πάτα θέση",s.enemy,s.theirHits,true),own=board("Τα δικά σου πλοία",s.mine,s.myHits,false);enemy.classList.add("enemy-view");own.classList.add("own-view");root.append(enemy,own);G.render(root);G.msg(s.status==="playing"?"Στόχευσε τον στόλο του αντιπάλου. Κάθε βολή προκαλεί απάντηση.":s.status==="win"?"🏆 Νίκη!":"Ο αντίπαλος κέρδισε. Δοκίμασε ξανά.");}
s=G.load("round");if(!s||!Array.isArray(s.enemy)||s.enemy.length!==64)start();else render();})();