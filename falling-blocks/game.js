(()=>{const {el,btn,rand}=G;const forms=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];const palette=["#4ec9ee","#ffd86f","#bb87fa","#658eff","#ff9a57","#5de3a4","#fa6987"];let s,canvas,ctx,timer;const P=G.progress(start);
function initialBoard(stage,difficulty){
 const d={easy:0,normal:1,hard:2}[difficulty],board=Array.from({length:20},()=>Array(10).fill(0));
 if(stage===1&&difficulty==="easy")return board;
 const layers=1+Math.floor((stage-1)/7),gap=(stage-1+d*2)%7;
 // Every prefilled row leaves the SAME four-cell corridor.
 // A horizontal I piece can reach and clear the bottom row, then the next:
 // no covered-up, unreachable single holes as in the previous generator.
 for(let row=0;row<layers;row++)for(let x=0;x<10;x++){
  if(x>=gap&&x<gap+4)continue;
  board[19-row][x]=1+((stage*3+d*5+x+row)%7);
 }
 return board;
}
window.FallingLevels={initial:initialBoard};
function fresh(){return {shape:rand(7),x:3,y:0,rot:0};}function shape(p){let v=forms[p.shape].map(r=>[...r]);for(let a=0;a<p.rot%4;a++)v=v[0].map((_,i)=>v.map(row=>row[i]).reverse());return v;}
function collide(p){const v=shape(p);for(let r=0;r<v.length;r++)for(let c=0;c<v[r].length;c++)if(v[r][c]){let x=p.x+c,y=p.y+r;if(x<0||x>=10||y>=20||y>=0&&s.board[y][x])return true;}return false}
function spawn(){s.p=fresh();if(collide(s.p))s.dead=true}
function start(){s={board:initialBoard(P.stage,P.difficulty),score:0,lines:0,p:fresh(),dead:false,paused:false,goal:2+Math.ceil(P.stage/3)+P.index*2};setup();draw();}
function tick(){if(!s||s.dead||s.paused||document.hidden)return;move(0,1);draw();}
function move(dx,dy){if(s.dead||s.paused)return;let p={...s.p,x:s.p.x+dx,y:s.p.y+dy};if(!collide(p)){s.p=p;return true;}if(dy){const a=shape(s.p);a.forEach((row,r)=>row.forEach((v,c)=>{if(v&&s.p.y+r>=0)s.board[s.p.y+r][s.p.x+c]=s.p.shape+1}));let count=0;s.board=s.board.filter(row=>{if(row.every(v=>v)){count++;return false;}return true;});while(s.board.length<20)s.board.unshift(Array(10).fill(0));s.lines+=count;s.score+=count?100*count*count:5;if(count&&s.lines>=s.goal){s.paused=true;P.win();}else spawn();if(s.dead){const best=Math.max(G.load("best",0),s.score);G.store("best",best);} }return false;}
function rotate(){if(s.dead||s.paused)return;const p={...s.p,rot:(s.p.rot+1)%4};for(const d of [0,-1,1,-2,2])if(!collide({...p,x:p.x+d})){s.p={...p,x:p.x+d};break;}draw()}
function drop(){if(s.dead||s.paused)return;while(move(0,1))s.score+=2;draw()}
function draw(){if(!ctx)return;ctx.fillStyle="#07182a";ctx.fillRect(0,0,300,600);function block(x,y,color){ctx.fillStyle=color;ctx.fillRect(x*30+1,y*30+1,28,28);ctx.strokeStyle="#ffffff55";ctx.strokeRect(x*30+2,y*30+2,26,26);}s.board.forEach((row,y)=>row.forEach((v,x)=>{if(v)block(x,y,palette[v-1])}));const a=shape(s.p);a.forEach((row,y)=>row.forEach((v,x)=>{if(v&&s.p.y+y>=0)block(s.p.x+x,s.p.y+y,palette[s.p.shape])}));G.score("Σκορ: "+s.score+" · Γραμμές: "+s.lines+"/"+s.goal+" · Ρεκόρ: "+G.load("best",0));G.msg(s.dead?"Τέλος παιχνιδιού! Πάτα Νέο.":s.paused?"Παύση":"Πάτησε το ταμπλό για περιστροφή. Κράτησε τα βελάκια για κίνηση.");}
function setup(){const box=el("div");box.style.cssText="display:flex;align-items:center;gap:12px;flex-direction:column;width:100%";canvas=document.createElement("canvas");canvas.width=300;canvas.height=600;canvas.className="arcade";canvas.style.width="min(100%,315px)";ctx=canvas.getContext("2d");box.append(canvas);let tapPoint=null;
canvas.addEventListener("pointerdown",e=>{tapPoint={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener("pointerup",e=>{if(tapPoint&&Math.hypot(e.clientX-tapPoint.x,e.clientY-tapPoint.y)<16)rotate();tapPoint=null});
canvas.addEventListener("pointercancel",()=>{tapPoint=null});
const row=el("div","edge-action-row"),middle=el("div","edge-action-center");
function arrow(label,delta){const b=btn(label,null,"secondary");b.setAttribute("aria-label",delta<0?"Κίνηση αριστερά":"Κίνηση δεξιά");let interval=null;const stop=()=>{if(interval!==null){clearInterval(interval);interval=null}};
b.addEventListener("pointerdown",e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();stop();b.setPointerCapture(e.pointerId);move(delta,0);draw();interval=setInterval(()=>{if(s.paused||s.dead){stop();return;}move(delta,0);draw()},95)});
for(const type of ["pointerup","pointercancel","lostpointercapture","blur"])b.addEventListener(type,stop);b.addEventListener("click",e=>{if(e.detail===0){move(delta,0);draw()}});return b}
for(const [l,fn] of [["⟳",rotate],["▼",()=>move(0,1)],["⤓",drop]])middle.append(btn(l,()=>{fn();draw()},"secondary"));row.append(arrow("◀",-1),middle,arrow("▶",1));box.append(row);G.render(box);G.ctrl(btn("↻ Νέο",start),btn("⏯ Παύση",()=>{s.paused=!s.paused;draw()},"secondary"));if(timer)clearInterval(timer);timer=setInterval(tick,Math.max(145,({easy:850,normal:650,hard:475}[P.difficulty]-P.stage*12)));}
addEventListener("keydown",e=>{if(!s)return;const keys=["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," "];if(keys.includes(e.key)){e.preventDefault();if(e.key==="ArrowLeft")move(-1,0);else if(e.key==="ArrowRight")move(1,0);else if(e.key==="ArrowDown")move(0,1);else if(e.key==="ArrowUp")rotate();else drop();draw();}});
addEventListener("game-paused",()=>{if(s){s.paused=true;draw();}});
start();})();