(()=>{const {el,btn,grid,rand}=G;let s,timer=0;const P=G.progress(start);function solved(a){return a.every((v,i)=>v===(i+1)%16)}function adjacent(a,b){return Math.abs(Math.floor(a/4)-Math.floor(b/4))+Math.abs(a%4-b%4)===1}
function construct(stage,difficulty){
 const a=Array.from({length:16},(_,i)=>(i+1)%16),next=G.stageRandom("puzzle-15",stage,difficulty);
 let blank=15,previous=-1;const reverse=[];
 for(let j=0;j<({easy:20,normal:75,hard:145}[difficulty]+stage*6);j++){
  const dirs=[blank-4,blank+4,blank-1,blank+1].filter(k=>k>=0&&k<16&&adjacent(k,blank)&&k!==previous);
  const chosen=dirs[next(dirs.length)];
  reverse.push(blank);[a[blank],a[chosen]]=[a[chosen],a[blank]];
  previous=blank;blank=chosen;
 }
 return {board:a,solution:reverse.reverse()};
}
window.PuzzleLevels={create:construct};
function start(){const {board:a}=construct(P.stage,P.difficulty);s={a,moves:0,elapsed:0,started:Date.now(),done:false};save();render();}
function time(){return s.elapsed+(s.done?0:Math.max(0,Date.now()-s.started))}
function save(){G.store("round",{...s,elapsed:time(),started:Date.now()})}
function tap(i){if(s.done)return;const zero=s.a.indexOf(0);if(!adjacent(i,zero))return;[s.a[i],s.a[zero]]=[s.a[zero],s.a[i]];s.moves++;if(solved(s.a)){s.elapsed=time();s.done=true;const best=G.load("best");if(!best||s.moves<best)G.store("best",s.moves);}save();render();if(s.done)P.win();}
function render(){G.score("Κινήσεις: "+s.moves+" · Χρόνος: "+Math.floor(time()/1000)+"″ · Ρεκόρ: "+(G.load("best")??"—")+" κινήσεις");G.ctrl(btn("↻ Νέο παζλ",start));const zero=s.a.indexOf(0),cells=s.a.map((v,i)=>({label:v||"",cls:v?"":"empty",disabled:s.done||!adjacent(i,zero)}));const b=grid(4,cells,tap);b.style.width="min(100%,400px)";G.render(b);G.msg(s.done?"🏆 Το έλυσες!":"Μετακίνησε αριθμούς προς την κενή θέση μέχρι να μπουν στη σειρά.");}
s=G.load("round");if(!s?.a||s.a.length!==16)start();else{s.started=Date.now();render();}setInterval(()=>{if(s&&!s.done&&!document.hidden)G.score("Κινήσεις: "+s.moves+" · Χρόνος: "+Math.floor(time()/1000)+"″ · Ρεκόρ: "+(G.load("best")??"—")+" κινήσεις");},1000);addEventListener("game-paused",()=>{if(s&&!s.done)save();});})();