"use strict";
const API="https://zrbmsziipzabnniqcpav.supabase.co/functions/v1/arrival-game";
const KEY="games-arrival-session-v2";
const $=id=>document.getElementById(id);
let token=localStorage.getItem(KEY)||"",state=null,tab="events",pending=[],authMode="login",busy=false,removeConfirm="";
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const statusText={open:"Ανοιχτό",locked:"Έκλεισε στις 09:00",voting:"Ψηφοφορία",pending:"Εκκαθάριση",settled:"Ολοκληρώθηκε",cancelled:"Ακυρώθηκε"};
function msg(text="",bad=false){$("message").textContent=text;$("message").className="msg "+(bad?"error":"ok");}
function button(text,fn,disabled=false,secondary=true){const b=node("button",text,"action"+(secondary?" secondary":""));b.disabled=disabled||busy;b.addEventListener("click",fn);return b;}
function card(title,subtitle){const c=node("article",undefined,"card");c.append(node("div",title,"card-title"),node("div",subtitle,"card-sub"));return c;}
function line(parent,...children){const r=node("div",undefined,"row");for(const c of children)r.append(c);parent.append(r);return r;}
function localDate(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Athens",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function tomorrow(day){const d=new Date(day+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function dateLabel(s){if(!s)return "";const [y,m,d]=s.split("-");return d+"/"+m+"/"+y;}
function eventById(id){return state?.events.find(e=>e.id===id);}
function chosen(ids){return new Set(state?.tickets.flatMap(t=>t.picks.map(p=>p.event_id))||[]);}
async function api(action,extra={}){
 const headers={"Content-Type":"application/json"};
 if(token)headers["x-arrival-session"]=token;
 let response,body;
 try{response=await fetch(API,{method:"POST",headers,body:JSON.stringify({action,...extra}),cache:"no-store"});
 body=await response.json();}catch{throw new Error("Αποτυχία σύνδεσης. Έλεγξε το Internet και δοκίμασε ξανά.");}
 if(!response.ok){
   if(response.status===401&&action!=="login"){token="";state=null;localStorage.removeItem(KEY);render();}
   throw new Error(body?.error||"Η ενέργεια απέτυχε.");
 }
 return body;
}
async function perform(action,params={},success=""){
 if(busy)return;
 busy=true;msg("Επεξεργασία…");try{
  const res=await api(action,params);
  if(res.state)state=res.state;else if(token)state=await api("state");
  busy=false;render();msg(success||"Η αλλαγή αποθηκεύτηκε.");
 }catch(e){busy=false;render();msg(e.message,true);}
}
function renderAuth(){
 $("authPanel").classList.toggle("hidden",!!token&&!!state);
 $("appPanel").classList.toggle("hidden",!token||!state);
 $("authTitle").textContent=authMode==="login"?"Σύνδεση παίκτη":"Νέος παίκτης";
 $("authSubmit").textContent=authMode==="login"?"Σύνδεση":"Εγγραφή · 1.000 μάρκες";
 $("authToggle").textContent=authMode==="login"?"Δεν έχω λογαριασμό · Εγγραφή":"Έχω λογαριασμό · Σύνδεση";
 $("authHint").textContent=authMode==="login"?"Ένας λογαριασμός σε κινητό και υπολογιστή.":"Κάθε νέος παίκτης ξεκινά με 1.000 εικονικές μάρκες.";
}
function render(){
 renderAuth();
 if(window.arrivalPushUI)window.arrivalPushUI.renderState(token,state);
 if(!state||!token)return;
 $("playerName").textContent=state.player.nickname;
 $("balance").textContent=Number(state.player.chips).toLocaleString("el-GR");
 $("rescueBox").classList.toggle("hidden",Number(state.player.chips)>=10);
 $("rescue").disabled=!state.player.rescue_eligible||busy;
 $("rescue").textContent=state.player.rescue_eligible?"+100 μάρκες":"Διαθέσιμες από αύριο";
 for(const b of $("tabs").querySelectorAll("[data-tab]"))b.className="action"+(b.dataset.tab===tab?"":" secondary");
 for(const s of ["events","ticket","votes","ranking","workers"])$(s).classList.toggle("hidden",tab!==s);
 renderWorkers();renderEvents();renderTicket();renderVotes();renderRanking();
}
function renderWorkers(){
 const selected=$("eventWorker").value;
 const workerSelect=$("eventWorker");workerSelect.replaceChildren();
 if(!state.workers.length){const opt=node("option","Πρόσθεσε εργαζόμενο πρώτα");opt.value="";workerSelect.append(opt);}
 const next=tomorrow(state.now.slice(0,10));
 const occupied=new Set(state.events.filter(e=>e.date===next).map(e=>e.worker_id));
 const openWorkers=state.workers.filter(w=>!occupied.has(w.id));
 for(const w of openWorkers){const o=node("option",w.name);o.value=w.id;workerSelect.append(o);}
 if(openWorkers.some(w=>w.id===selected))workerSelect.value=selected;
 const list=$("workerList");list.replaceChildren();
 for(const w of state.workers){
  const c=card(w.name,"Ενεργός εργαζόμενος");
  const b=button(removeConfirm===w.id?"Επιβεβαίωση αφαίρεσης":"Αφαίρεση",()=>{
   if(removeConfirm!==w.id){removeConfirm=w.id;render();return;}
   removeConfirm="";perform("worker",{operation:"remove",worker_id:w.id},"Ο εργαζόμενος αφαιρέθηκε.");
  });
  line(c,b);list.append(c);
 }
}
function renderEvents(){
 const day=state.now.slice(0,10);
 const target=tomorrow(day);
 const count=state.events.filter(e=>e.date===target).length;
 const unusedWorkers=state.workers.filter(w=>!state.events.some(e=>e.date===target&&e.worker_id===w.id));
 const beforeNoon=state.now.slice(11,13)<"12";
 $("eventDate").min=target;
 $("eventDate").max=target;
 $("eventDate").value=target;
 $("eventDate").disabled=true;
 const canCreate=beforeNoon&&count<3&&unusedWorkers.length>0;
 $("openEvent").disabled=!canCreate||busy;
 $("eventCreationInfo").textContent=count>=3
  ?"Έχουν επιλεγεί και οι 3 εργαζόμενοι για αύριο."
  :!beforeNoon
    ?"Η προσθήκη νέων γεγονότων για αύριο έκλεισε στις 12:00. Μπορείς να ποντάρεις στα υπάρχοντα έως τις 09:00 αύριο."
    :count===0
      ?"Δεν έχει προταθεί εργαζόμενος για αύριο. Αν δεν προτείνει κανείς, το πρόγραμμα επιλέγει έναν στις 11:30."
      :count+"/3 εργαζόμενοι για αύριο · Μπορείς να προσθέσεις άλλον μέχρι τις 12:00.";
 const list=$("eventList");list.replaceChildren();
 const ordered=[...state.events].sort((a,b)=>(a.status==="open"?0:1)-(b.status==="open"?0:1)||b.date.localeCompare(a.date));
 if(!ordered.length)list.append(node("p","Δεν υπάρχουν ακόμη γεγονότα. Άνοιξε το πρώτο!","muted"));
 for(const e of ordered.slice(0,120)){
  const c=card(e.name,dateLabel(e.date)+" · "+statusText[e.status]);
  if(e.source==="system")c.append(node("span","🎲 Αυτόματη επιλογή","tag good"));
  c.append(node("span",e.status==="open"?"Στοιχήματα έως 09:00":"Κλειστά στοιχήματα","tag"+(e.status==="open"?" good":"")));
  if(e.already_bet)c.append(node("span","Έχεις ήδη ποντάρει","tag good"));
  if(e.totals&&e.status!=="open")c.append(node("div","Προβλέψεις: ΘΑ ΕΡΘΕΙ "+e.totals.yes+" · ΔΕΝ ΘΑ ΕΡΘΕΙ "+e.totals.no,"muted"));
  if(e.status==="settled"||e.status==="cancelled")c.append(node("div",e.result==="yes"?"Αποτέλεσμα: Ήρθε":e.result==="no"?"Αποτέλεσμα: Δεν ήρθε":"Ακύρωση · Επιστροφή σύμφωνα με τους κανόνες","muted"));
  if(e.status==="open"&&!e.already_bet){
   const active=pending.some(p=>p.id===e.id);
   const r=node("div",undefined,"buttons");
   r.style.marginTop="9px";
   r.append(button("✓ ΘΑ ΕΡΘΕΙ",()=>addPick(e.id,"yes"),active),button("✕ ΔΕΝ ΘΑ ΕΡΘΕΙ",()=>addPick(e.id,"no"),active));
   c.append(r);
  }
  list.append(c);
 }
}
function addPick(id,side){
 if(pending.some(x=>x.id===id)){msg("Έχεις ήδη επιλέξει αυτό το γεγονός.",true);return;}
 if(pending.length>=5){msg("Μέχρι 5 γεγονότα σε κάθε δελτίο.",true);return;}
 pending.push({id,side});tab="ticket";render();msg("Η πρόβλεψη μπήκε στο δελτίο. Μπορείς να προσθέσεις κι άλλες.");
}
function renderTicket(){
 const box=$("picks");box.replaceChildren();
 if(!pending.length)box.append(node("p","Δεν έχεις επιλέξει γεγονότα. Πήγαινε στα Γεγονότα.","muted"));
 for(const p of pending){
  const e=eventById(p.id);
  const r=node("div",undefined,"ticket-pick");
  r.append(node("span",(e?.name||"Εργαζόμενος")+" · "+(p.side==="yes"?"ΘΑ ΕΡΘΕΙ":"ΔΕΝ ΘΑ ΕΡΘΕΙ")+" · "+dateLabel(e?.date)));
  r.append(button("×",()=>{pending=pending.filter(x=>x.id!==p.id);render();}));
  box.append(r);
 }
 $("placeTicket").disabled=!pending.length||busy;
 const my=$("myTickets");my.replaceChildren();
 if(!state.tickets.length)my.append(node("p","Δεν έχεις ακόμη δελτία.","muted"));
 for(const t of state.tickets.slice(0,50)){
  const c=card((t.picks.length>1?"Συνδυαστικό":"Μονό")+" · "+t.stake+" μάρκες",t.settled?"Επιστροφή: "+t.paid+" μάρκες":"Αναμονή αποτελέσματος");
  for(const p of t.picks){const e=eventById(p.event_id);c.append(node("div",(e?.name||"Εργαζόμενος")+" · "+(p.prediction==="yes"?"ΘΑ ΕΡΘΕΙ":"ΔΕΝ ΘΑ ΕΡΘΕΙ")+" · "+dateLabel(e?.date),"muted"));}
  my.append(c);
 }
}
function renderVotes(){
 const list=$("voteList");list.replaceChildren();
 const available=state.events.filter(e=>["voting","pending","settled","cancelled"].includes(e.status));
 if(!available.length)list.append(node("p","Δεν υπάρχουν ακόμη ψηφοφορίες.","muted"));
 for(const e of available.slice(0,60)){
  const c=card(e.name,dateLabel(e.date)+" · "+statusText[e.status]);
  if(e.status==="voting"){
   if(e.voted)c.append(node("div","Η ψήφος σου έχει καταχωριστεί. Τα αποτελέσματα παραμένουν κρυφά.","muted"));
   else{
    const r=node("div",undefined,"buttons");r.style.marginTop="8px";
    r.append(button("✓ ΉΡΘΕ",()=>perform("vote",{event_id:e.id,side:"yes"},"Η ψήφος καταχωρίστηκε.")),
      button("✕ ΔΕΝ ΗΡΘΕ",()=>perform("vote",{event_id:e.id,side:"no"},"Η ψήφος καταχωρίστηκε.")));
    c.append(r);
   }
  }else if(e.status==="pending")c.append(node("div","Αναμονή αυτόματης εκκαθάρισης.","muted"));
  else c.append(node("div",e.result==="yes"?"Αποτέλεσμα: Ήρθε":e.result==="no"?"Αποτέλεσμα: Δεν ήρθε":"Ακυρώθηκε (ισοψηφία ή λιγότερες από 3 ψήφοι).","muted"));
  list.append(c);
 }
}
function renderRanking(){
 const list=$("leaderboard");list.replaceChildren();
 state.players.forEach((p,i)=>{
  const c=card((i+1)+". "+p.nickname,Number(p.chips).toLocaleString("el-GR")+" μάρκες");
  if(p.id===state.player.id)c.append(node("span","Εσύ","tag good"));
  list.append(c);
 });
}
async function authSubmit(){
 if(busy)return;
 const nickname=$("nickname").value.trim(),pin=$("pin").value;
 if(!nickname||!/^\d{4,8}$/.test(pin)){msg("Συμπλήρωσε ψευδώνυμο και PIN 4–8 ψηφίων.",true);return;}
 busy=true;msg("Σύνδεση…");
 try{
  const result=await api(authMode==="login"?"login":"register",{nickname,pin});
  token=result.token;localStorage.setItem(KEY,token);
  state=await api("state");
  $("pin").value="";busy=false;render();msg("Καλώς ήρθες!");
 }catch(e){busy=false;render();msg(e.message,true);}
}
$("authSubmit").onclick=authSubmit;
$("authToggle").onclick=()=>{authMode=authMode==="login"?"register":"login";renderAuth();msg("");};
$("pin").addEventListener("keydown",e=>{if(e.key==="Enter")authSubmit();});
$("logout").onclick=async()=>{try{await window.arrivalPushUI?.disableForLogout?.();}catch{}try{await api("logout");}catch{}token="";state=null;pending=[];localStorage.removeItem(KEY);render();msg("Αποσυνδέθηκες.");};
$("tabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b){tab=b.dataset.tab;render();msg("");}});
$("openEvent").onclick=()=>{
 const stake=Number($("eventStake").value);
 if(!Number.isSafeInteger(stake)||stake<10){msg("Ελάχιστο ποντάρισμα 10 μάρκες.",true);return;}
 perform("open",{worker_id:$("eventWorker").value,date:$("eventDate").value,side:$("eventSide").value,stake},"Το γεγονός άνοιξε και το ποντάρισμα κλειδώθηκε.");
};
$("placeTicket").onclick=()=>{
 const stake=Number($("ticketStake").value);
 if(!Number.isSafeInteger(stake)||stake<10||!pending.length){msg("Ελάχιστο ποντάρισμα 10 μάρκες και μία πρόβλεψη.",true);return;}
 const selections=[...pending];
 perform("ticket",{ids:selections.map(x=>x.id),sides:selections.map(x=>x.side),stake},"Το δελτίο καταχωρίστηκε οριστικά.").then(()=>{
   if(state&&selections.every(x=>state.tickets.some(t=>t.picks.some(p=>p.event_id===x.id)))){pending=[];render();}
 });
};
$("addWorker").onclick=()=>{
 const name=$("newWorker").value.trim();
 if(name.length<2){msg("Συμπλήρωσε όνομα εργαζομένου.",true);return;}
 perform("worker",{operation:"add",name},"Ο εργαζόμενος προστέθηκε.").then(()=>{$("newWorker").value="";});
};
$("rescue").onclick=()=>perform("rescue",{},"Προστέθηκαν 100 μάρκες.");
async function refresh(){
 if(!token||busy||document.visibilityState==="hidden")return;
 try{state=await api("state");render();}catch(e){if(!token)msg("Η σύνδεσή σου έληξε.",true);else msg(e.message,true);}
}
render();
if(token)refresh();
setInterval(refresh,45000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")refresh();});
