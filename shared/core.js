"use strict";
window.G={
 $:id=>document.getElementById(id),
 store:(key,data)=>{try{localStorage.setItem("games:"+location.pathname+":"+key,JSON.stringify(data))}catch{}},
 load:(key,fallback=null)=>{try{const x=localStorage.getItem("games:"+location.pathname+":"+key);return x?JSON.parse(x):fallback}catch{return fallback}},
 clear:key=>{try{localStorage.removeItem("games:"+location.pathname+":"+key)}catch{}},
 rand:n=>Math.floor(Math.random()*n),
 shuffle:a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a},
 btn:(label,fn,cls="")=>{const b=document.createElement("button");b.type="button";b.className="btn "+cls;b.textContent=label;if(fn)b.addEventListener("click",fn);return b},
 el:(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x},
 score:value=>{const node=document.getElementById("score");if(!node)return;node.dataset.fullScore=String(value);const compact=String(value).replace(/\s*·\s*Ρεκόρ:\s*[^·]+/g,"");if(node.textContent!==compact)node.textContent=compact},
 msg:value=>{const node=document.getElementById("msg");if(!node)return;const message=String(value);if(node.textContent!==message)node.textContent=message;node.classList.toggle("game-hint",/^(Στόχευσε τον στόλο|Αφαίρεσε ρήγες|Στόχος:|Επίλεξε δύο ίδια|Πάτα αρχή χρώματος|Μετακίνησε αριθμούς|Βελάκια:|Κούνησε την μπάρα|Κίνησε το σκάφος|Μάζεψε τις τελείες|Πέρνα απέναντι|Πάτα το πρώτο|Επίλεξε γράμματα|Γύρισε δύο κάρτες)/.test(message))},
 ctrl:(...items)=>{const p=document.getElementById("controls");p.replaceChildren(...items)},
 render:node=>{const play=document.getElementById("play");play.replaceChildren(node);document.body.classList.toggle("arcade-game",!!play.querySelector("canvas.arcade"));requestAnimationFrame(()=>window.G.resizeArcade?.())},
 grid:(n,cells,click,cl="")=>{const root=document.createElement("div");root.className="grid-board "+cl;root.style.gridTemplateColumns="repeat("+n+",minmax(0,1fr))";cells.forEach((item,i)=>{const b=document.createElement("button");b.type="button";b.className="tile "+(item.cls||"");b.textContent=item.label??"";b.disabled=!!item.disabled;b.setAttribute("aria-label",item.aria||String(item.label||"Θέση "+(i+1)));b.onclick=()=>click(i);root.appendChild(b)});return root},
 card:(rank,suit,fn)=>{const c=document.createElement("button");c.type="button";c.className="playing-card"+("♥♦".includes(suit)?" red":"");c.innerHTML="<span></span><span></span>";c.children[0].textContent=rank;c.children[1].textContent=suit;c.setAttribute("aria-label",rank+" "+suit);if(fn)c.onclick=fn;return c},
 mount:()=>{window.addEventListener("pagehide",()=>{window.dispatchEvent(new Event("game-paused"))});}
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
  "battleship":["Πάτησε στα τετράγωνα του αντίπαλου στόλου για να πυροβολήσεις. Μετά από κάθε βολή απαντά ο υπολογιστής.","Στόχος είναι να βυθίσεις όλα τα πλοία πριν χαθούν τα δικά σου."],
  "pyramid-solitaire":["Αφαίρεσε έναν ρήγα μόνο του ή δύο ελεύθερα φύλλα που έχουν άθροισμα 13.","Χρησιμοποίησε το κουμπί τραβήγματος για νέα φύλλα. Καθάρισε ολόκληρη την πυραμίδα."],
  blackjack:["Πάρε φύλλα για να πλησιάσεις το 21 χωρίς να το ξεπεράσεις.","Με το Σταμάτα ολοκληρώνεις τη σειρά σου. Είναι παιχνίδι χωρίς πραγματικά χρήματα."],
  mahjong:["Διάλεξε δύο ίδια πλακίδια που έχουν ελεύθερη πλευρά αριστερά ή δεξιά.","Η βοήθεια προτείνει ζευγάρι, ενώ το ανακάτεμα αλλάζει τα διαθέσιμα πλακίδια."],
  "flow-connect":["Πάτησε έναν χρωματιστό κύκλο και σύνδεσέ τον με τον αντίστοιχο, πατώντας διαδοχικά γειτονικά τετράγωνα.","Ολοκλήρωσε όλες τις χρωματιστές γραμμές για να περάσεις στην επόμενη πίστα."],
  "puzzle-15":["Σύρε νοερά τους αριθμούς προς την κενή θέση πατώντας γειτονικά πλακίδια.","Βάλε τους αριθμούς 1–15 στη σωστή σειρά με το κενό κάτω δεξιά."],
  "falling-blocks":["Με ◀ ▶ κινείς τα τουβλάκια, με ⟳ τα περιστρέφεις και με ▼ τα κατεβάζεις.","Συμπλήρωσε οριζόντιες σειρές. Στο πληκτρολόγιο: βελάκια και Space για άμεση πτώση."],
  "brick-breaker":["Μετακίνησε την μπάρα με άγγιγμα ή σύρσιμο πάνω στο παιχνίδι, ή με τα βελάκια.","Αναπήδησε την μπάλα και σπάσε όλα τα τουβλάκια χωρίς να τη χάσεις."],
  "space-invaders":["Το σκάφος πυροβολεί αυτόματα. Δεν υπάρχει κουμπί πυρός.","Κράτησε πατημένο το ◀ στην αριστερή άκρη ή το ▶ στη δεξιά άκρη της οθόνης για συνεχόμενη μετακίνηση. Απόφυγε τα εχθρικά πυρά."],
  "maze-chase":["Μάζεψε τις τελείες και απόφυγε τα φαντάσματα.","Χρησιμοποίησε τα βελάκια ή σύρε το δάχτυλο προς την κατεύθυνση που θέλεις."],
  frogger:["Πέρνα τον δρόμο αποφεύγοντας τα αυτοκίνητα και ανέβα στους κορμούς στο ποτάμι.","Όταν πατήσεις σε κορμό, ο βάτραχος μετακινείται αυτόματα μαζί του. Κινήσου με τα βελάκια ή με άγγιγμα και σύρσιμο."],
  "word-search":["Πάτησε το πρώτο και μετά το τελευταίο γράμμα της λέξης.","Οι λέξεις μπορούν να είναι οριζόντιες, κάθετες ή διαγώνιες, προς οποιαδήποτε κατεύθυνση."],
  hangman:["Διάλεξε ελληνικά γράμματα για να αποκαλύψεις την κρυφή λέξη.","Πρόσεξε τις λανθασμένες προσπάθειες πριν ολοκληρωθεί η κρεμάλα."],
  "memory-match":["Γύρισε δύο κλειστές κάρτες τη φορά.","Θυμήσου τις θέσεις τους και βρες όλα τα ίδια ζευγάρια."]
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
