"use strict";
window.G={
 $:id=>document.getElementById(id),
 store:(key,data)=>{try{if(key==="round"&&window.G.activeProgress&&data&&typeof data==="object")data={...data,__stage:window.G.activeProgress.stage,__difficulty:window.G.activeProgress.difficulty};localStorage.setItem("games:"+location.pathname+":"+key,JSON.stringify(data))}catch{}},
 load:(key,fallback=null)=>{try{const x=localStorage.getItem("games:"+location.pathname+":"+key);if(!x)return fallback;const data=JSON.parse(x),p=window.G.activeProgress;if(key==="round"&&p&&data&&typeof data==="object"&&(data.__stage!==undefined||p.stage>1||p.difficulty!=="normal")&&(data.__stage!==p.stage||data.__difficulty!==p.difficulty))return fallback;return data}catch{return fallback}},
 clear:key=>{try{localStorage.removeItem("games:"+location.pathname+":"+key)}catch{}},
 rand:n=>Math.floor(Math.random()*n),
 shuffle:a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a},
 btn:(label,fn,cls="")=>{const b=document.createElement("button");b.type="button";b.className="btn "+cls;b.textContent=label;if(fn)b.addEventListener("click",fn);return b},
 el:(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x},
 score:value=>{const node=document.getElementById("score");if(!node)return;node.dataset.fullScore=String(value);const compact=String(value).replace(/\s*·\s*Ρεκόρ:\s*[^·]+/g,"");const p=window.G.activeProgress;const valueToShow=p?compact+" · "+p.shortLabel:compact;if(node.textContent!==valueToShow)node.textContent=valueToShow},
 msg:value=>{const node=document.getElementById("msg");if(!node)return;const message=String(value);if(node.textContent!==message)node.textContent=message;node.classList.toggle("game-hint",/^(Στόχευσε τον στόλο|Αφαίρεσε ρήγες|Στόχος:|Επίλεξε δύο ίδια|Πάτα αρχή χρώματος|Μετακίνησε αριθμούς|Βελάκια:|Πάτησε το ταμπλό|Κούνησε την μπάρα|Κίνησε το σκάφος|Μάζεψε τις τελείες|Κινείται αυτόματα|Πέρνα απέναντι|Πάτα το πρώτο|Επίλεξε γράμματα|Γύρισε δύο κάρτες)/.test(message))},
 ctrl:(...items)=>{const p=document.getElementById("controls");p.replaceChildren(...items)},
 render:node=>{const play=document.getElementById("play");play.replaceChildren(node);document.body.classList.toggle("arcade-game",!!play.querySelector("canvas.arcade"));requestAnimationFrame(()=>window.G.resizeArcade?.())},
 grid:(n,cells,click,cl="")=>{const root=document.createElement("div");root.className="grid-board "+cl;root.style.gridTemplateColumns="repeat("+n+",minmax(0,1fr))";cells.forEach((item,i)=>{const b=document.createElement("button");b.type="button";b.className="tile "+(item.cls||"");b.textContent=item.label??"";b.disabled=!!item.disabled;b.setAttribute("aria-label",item.aria||String(item.label||"Θέση "+(i+1)));b.onclick=()=>click(i);root.appendChild(b)});return root},
 card:(rank,suit,fn)=>{const c=document.createElement("button");c.type="button";c.className="playing-card"+("♥♦".includes(suit)?" red":"");c.innerHTML="<span></span><span></span>";c.children[0].textContent=rank;c.children[1].textContent=suit;c.setAttribute("aria-label",rank+" "+suit);if(fn)c.onclick=fn;return c},
 mount:()=>{window.addEventListener("pagehide",()=>{window.dispatchEvent(new Event("game-paused"))});}
};

/* Persistent, difficulty-specific campaign progression shared by all 14 games. */
G.progress=(restart,options={})=>{
 const total=Math.max(5,Math.min(99,Number(options.stages)||20));
 const label={easy:"Εύκολο",normal:"Κανονικό",hard:"Δύσκολο"};
 const order=["easy","normal","hard"];
 const old=G.load("campaign-v1",{});
 const highest={easy:1,normal:1,hard:1};
 for(const k of order)highest[k]=Math.max(1,Math.min(total,Math.floor(Number(old.highest?.[k])||1)));
 const cleared={easy:0,normal:0,hard:0};
 for(const k of order)cleared[k]=Math.max(0,Math.min(total,Math.floor(Number(old.cleared?.[k])||0)));
 let difficulty=order.includes(old.difficulty)?old.difficulty:"normal";
 let viewing=difficulty;
 let stage=Math.min(highest[difficulty],Math.max(1,Math.floor(Number(old.stage?.[difficulty])||1)));
 let advancing=false,timeout=null,seq=0;
 const stageSelected={easy:1,normal:1,hard:1,...old.stage};
 stageSelected[difficulty]=stage;
 const persist=()=>G.store("campaign-v1",{difficulty,stage:stageSelected,highest,cleared,version:1});
 const api={
  get difficulty(){return difficulty},
  get stage(){return stage},
  get total(){return total},
  get index(){return order.indexOf(difficulty)},
  get shortLabel(){return "Πίστα "+stage+" · "+label[difficulty]},
  get busy(){return advancing},
  get cleared(){return cleared[difficulty]},
  get highest(){return highest[difficulty]},
  select(diff,num){
   if(!order.includes(diff))return false;
   const n=Math.floor(Number(num));
   if(n<1||n>highest[diff]||n>total)return false;
   seq++;if(timeout!==null)clearTimeout(timeout);timeout=null;advancing=false;
   difficulty=diff;viewing=diff;stage=n;stageSelected[diff]=n;persist();
   G.clear("round");
   document.querySelector(".game-help-dialog")?.close();
   renderSettings();
   restart();
   return true;
  },
  win(){
   if(advancing)return false;
   advancing=true;
   const diff=difficulty,completed=stage,serial=++seq;
   cleared[diff]=Math.max(cleared[diff],completed);
   highest[diff]=Math.max(highest[diff],Math.min(total,completed+1));
   stageSelected[diff]=Math.min(total,completed+1);
   persist();renderSettings();
   timeout=setTimeout(()=>{
     if(serial!==seq)return;
     if(completed<total){api.select(diff,completed+1);}
     else{
       advancing=false;
       G.msg("🏆 Ολοκλήρωσες όλες τις "+total+" πίστες στο "+label[diff]+"!");
     }
   },1050);
   setTimeout(()=>{if(serial===seq)G.msg("🏆 Πίστα "+completed+" ολοκληρώθηκε!"+(completed<total?" Επόμενη: "+(completed+1):""))},50);
   return true;
  }
 };
 window.G.activeProgress=api;
 let settings=document.querySelector(".game-help-dialog");
 const section=document.createElement("section");
 section.className="campaign-settings";
 const heading=document.createElement("h3");
 heading.textContent="Πίστες και δυσκολία";
 const summary=document.createElement("p");
 summary.className="campaign-summary";
 const switches=document.createElement("div");
 switches.className="campaign-difficulty";
 const stages=document.createElement("div");
 stages.className="campaign-levels";
 section.append(heading,summary,switches,stages);
 if(settings){const stats=settings.querySelector(".help-stats");settings.insertBefore(section,stats||settings.lastElementChild);}
 function renderSettings(){
  summary.textContent="Ολοκληρωμένες: "+cleared[viewing]+"/"+total+" · Ξεκλείδωτες: "+highest[viewing]+"/"+total;
  switches.replaceChildren();
  for(const k of order){
   const b=G.btn(label[k],()=>{viewing=k;renderSettings()},"secondary");
   b.setAttribute("aria-pressed",String(k===viewing));switches.append(b);
  }
  stages.replaceChildren();
  for(let n=1;n<=total;n++){
   const unlocked=n<=highest[viewing],done=n<=cleared[viewing];
   const b=G.btn(String(n),()=>api.select(viewing,n),unlocked?"":"secondary");
   b.className="campaign-level"+(viewing===difficulty&&n===stage?" selected":"")+(done?" completed":"");
   if(viewing===difficulty&&n===stage)b.setAttribute("aria-current","step");
   b.setAttribute("aria-label","Πίστα "+n+(done?" ολοκληρωμένη":unlocked?" διαθέσιμη":" κλειδωμένη"));
   b.disabled=!unlocked;b.title=!unlocked?"Κλειδωμένη πίστα":"Πίστα "+n;
   stages.append(b);
  }
 }
 renderSettings();persist();return api;
};

G.mount();
// The Applications launcher keeps game iframes mounted. Pause moving games
// when their tab or another game becomes active.
window.addEventListener("message",event=>{
 if(event.origin!==location.origin)return;
 const data=event.data;
 if(data&&typeof data.type==="string"&&data.type.endsWith(":visibility")&&data.active===false){
   window.dispatchEvent(new Event("game-paused"));
 }
});
// Each game can initialize the common offline cache even when opened directly.
if("serviceWorker" in navigator&&location.protocol==="https:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("../sw.js",{scope:"../"}).catch(e=>console.warn("Games offline cache:",e)));
}
/* The 14 game pages share one compact, responsive shell and help dialog. */
(()=>{
 const play=document.getElementById("play"),shell=document.querySelector("main.shell");
 if(!play||!shell)return;
 const key=new URL(".",location.href).pathname.split("/").filter(Boolean).pop();
 const help={
  "battleship":["Πάτησε στα τετράγωνα του αντίπαλου στόλου για να πυροβολήσεις. Μετά από κάθε βολή απαντά ο υπολογιστής.","Στόχος είναι να βυθίσεις όλα τα πλοία πριν χαθούν τα δικά σου. Στο κινητό άλλαξε ταμπλό με Αντίπαλος / Τα πλοία μου."],
  "pyramid-solitaire":["Αφαίρεσε έναν ρήγα μόνο του ή δύο ελεύθερα φύλλα που έχουν άθροισμα 13.","Χρησιμοποίησε το κουμπί τραβήγματος για νέα φύλλα. Καθάρισε ολόκληρη την πυραμίδα."],
  blackjack:["Πάρε φύλλα για να πλησιάσεις το 21 χωρίς να το ξεπεράσεις.","Με το Σταμάτα ολοκληρώνεις τη σειρά σου. Είναι παιχνίδι χωρίς πραγματικά χρήματα."],
  mahjong:["Διάλεξε δύο ίδια πλακίδια που έχουν ελεύθερη πλευρά αριστερά ή δεξιά.","Η βοήθεια προτείνει ζευγάρι, ενώ το ανακάτεμα αλλάζει τα διαθέσιμα πλακίδια."],
  "flow-connect":["Άγγιξε έναν αριθμημένο χρωματιστό κύκλο, κράτησε το δάχτυλο πατημένο και σύρε τη γραμμή στον ίδιο αριθμό.","Η γραμμή ακολουθεί μόνο γειτονικά κελιά. Μπορείς να γυρίσεις πίσω όσο σέρνεις. Ολοκλήρωσε και τα πέντε ζευγάρια."],
  "puzzle-15":["Σύρε νοερά τους αριθμούς προς την κενή θέση πατώντας γειτονικά πλακίδια.","Βάλε τους αριθμούς 1–15 στη σωστή σειρά με το κενό κάτω δεξιά."],
  "falling-blocks":["Κράτησε το ◀ ή το ▶ στις άκρες για συνεχόμενη οριζόντια κίνηση. Πάτησε μέσα στο ταμπλό για περιστροφή.","Συμπλήρωσε οριζόντιες σειρές. Στο πληκτρολόγιο: βελάκια και Space για άμεση πτώση."],
  "brick-breaker":["Μετακίνησε την μπάρα με άγγιγμα ή σύρσιμο πάνω στο παιχνίδι, ή με τα βελάκια.","Αναπήδησε την μπάλα και σπάσε όλα τα τουβλάκια χωρίς να τη χάσεις."],
  "space-invaders":["Το σκάφος πυροβολεί αυτόματα. Δεν υπάρχει κουμπί πυρός.","Κράτησε πατημένο το ◀ στην αριστερή άκρη ή το ▶ στη δεξιά άκρη της οθόνης για συνεχόμενη μετακίνηση. Απόφυγε τα εχθρικά πυρά."],
  "maze-chase":["Μάζεψε τις τελείες και απόφυγε τα φαντάσματα.","Ο χαρακτήρας κινείται συνεχώς μόνος του. Με ένα βελάκι ή σύρσιμο αλλάζεις κατεύθυνση και συνεχίζει αυτόματα."],
  frogger:["Πέρνα τον δρόμο αποφεύγοντας τα αυτοκίνητα και ανέβα στους κορμούς στο ποτάμι.","Όταν πατήσεις σε κορμό, ο βάτραχος μετακινείται αυτόματα μαζί του. Κινήσου με τα βελάκια ή με άγγιγμα και σύρσιμο."],
  "word-search":["Πάτησε το πρώτο και μετά το τελευταίο γράμμα της λέξης.","Οι λέξεις μπορούν να είναι οριζόντιες, κάθετες ή διαγώνιες, προς οποιαδήποτε κατεύθυνση."],
  hangman:["Διάλεξε ελληνικά γράμματα για να αποκαλύψεις την κρυφή λέξη.","Πρόσεξε τις λανθασμένες προσπάθειες πριν ολοκληρωθεί η κρεμάλα."],
  "memory-match":["Γύρισε δύο κλειστές κάρτες τη φορά.","Βρες και τα 16 ζευγάρια στις 8 σειρές των 4 καρτών."]
 };
 document.body.classList.add("game-screen");
 const back=shell.querySelector(".back"),hero=shell.querySelector(".hero");
 const title=hero?.querySelector("h1");
 if(back&&hero&&title){
  const top=document.createElement("header");top.className="game-topbar";
  back.textContent="← Παιχνίδια";back.setAttribute("aria-label","Πίσω στη συλλογή παιχνιδιών");
  const gear=document.createElement("button");gear.type="button";gear.className="gear-button";gear.textContent="⚙";gear.setAttribute("aria-label","Οδηγίες παιχνιδιού");gear.title="Οδηγίες";
  top.append(back,title,gear);hero.replaceWith(top);
  const dialog=document.createElement("dialog");dialog.className="game-help-dialog";dialog.setAttribute("aria-label","Οδηγίες παιχνιδιού");
  const heading=document.createElement("h2");heading.textContent="⚙ "+title.textContent;
  dialog.append(heading);
  for(const line of (help[key]||["Διάβασε τους κανόνες και χρησιμοποίησε τα χειριστήρια του παιχνιδιού."])){
   const p=document.createElement("p");p.textContent=line;dialog.append(p);
  }
  const fullStats=document.createElement("p");fullStats.className="help-stats";dialog.append(fullStats);
  const close=document.createElement("button");close.type="button";close.className="btn";close.textContent="Κλείσιμο";close.addEventListener("click",()=>dialog.close());dialog.append(close);
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  gear.addEventListener("click",()=>{fullStats.textContent=document.getElementById("score")?.dataset.fullScore||"";dialog.showModal()});
  document.body.append(dialog);
 }
 shell.querySelector(".foot")?.remove();
 window.G.resizeArcade=()=>{
  const bounds=play.getBoundingClientRect();
  if(bounds.width<=0||bounds.height<=0)return;
  for(const canvas of play.querySelectorAll("canvas.arcade")){
   const parent=canvas.parentElement,others=Array.from(parent.children).filter(n=>n!==canvas);
   const gap=parseFloat(getComputedStyle(parent).gap)||0;
   const used=others.reduce((sum,n)=>sum+n.getBoundingClientRect().height,0)+gap*others.length;
   const h=Math.max(75,Math.min(bounds.height-used-7,(bounds.width-9)*canvas.height/canvas.width));
   const scale=h/canvas.height;
   canvas.style.width=Math.floor(canvas.width*scale)+"px";
   canvas.style.height=Math.floor(canvas.height*scale)+"px";
  }
 };
 new ResizeObserver(()=>window.G.resizeArcade()).observe(play);
})();
