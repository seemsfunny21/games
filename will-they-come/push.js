"use strict";
(()=>{
const ENDPOINT="https://zrbmsziipzabnniqcpav.supabase.co/functions/v1/arrival-push";
const SESSION_KEY="games-arrival-session-v2";
const $=id=>document.getElementById(id);
const supported=()=>window.isSecureContext&&"Notification" in window&&"serviceWorker" in navigator&&"PushManager" in window;
let account="",enabled=false,working=false,statusLoading=false;
function token(){return localStorage.getItem(SESSION_KEY)||"";}
async function request(action,data={}){
 const headers={"Content-Type":"application/json","X-Arrival-Session":token()};
 const response=await fetch(ENDPOINT,{method:"POST",headers,body:JSON.stringify({action,...data}),cache:"no-store"});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||"Πρόβλημα στην υπηρεσία ειδοποιήσεων.");
 return result;
}
function say(value,bad=false){
 const output=$("pushMessage");if(!output)return;
 output.textContent=value;output.className="muted"+(bad?" error":"");
}
function draw(){
 const available=supported();
 $("pushPanel").classList.toggle("hidden",!account);
 if(!account)return;
 const blocked=available&&Notification.permission==="denied";
 const label=!available?"Η συσκευή δεν υποστηρίζει push":
   blocked?"Οι ειδοποιήσεις έχουν αποκλειστεί από τον browser":
   enabled?"Ειδοποιήσεις ενεργές":"Ειδοποιήσεις ανενεργές";
 $("pushStatus").textContent=label;
 $("pushEnable").classList.toggle("hidden",enabled);
 $("pushDisable").classList.toggle("hidden",!enabled);
 $("pushTest").classList.toggle("hidden",!enabled);
 $("pushEnable").disabled=working||statusLoading||!available||blocked;
 $("pushDisable").disabled=working||statusLoading;
 $("pushTest").disabled=working||statusLoading;
}
async function registration(create=false){
 if(!supported())throw new Error("Αυτός ο browser δεν υποστηρίζει ειδοποιήσεις push.");
 if(create)return navigator.serviceWorker.register("../sw.js",{scope:"../",updateViaCache:"none"});
 return navigator.serviceWorker.getRegistration("../");
}
async function currentSubscription(){
 const reg=await registration(false);
 return reg?reg.pushManager.getSubscription():null;
}
function decodeKey(str){
 const clean=str.replace(/-/g,"+").replace(/_/g,"/");
 const padding="=".repeat((4-clean.length%4)%4);
 const raw=atob(clean+padding);
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function check(){
 if(!account||!supported()||statusLoading)return;
 statusLoading=true;draw();
 try{
  const sub=await currentSubscription();
  enabled=!!(sub&&Notification.permission==="granted"&&(await request("status",{endpoint:sub.endpoint})).enabled);
 }catch(err){say("Δεν ήταν δυνατός ο έλεγχος ειδοποιήσεων.",true);}
 finally{statusLoading=false;draw();}
}
async function toggleOn(){
 if(working||!account)return;
 if(!supported()){say("Η συσκευή δεν υποστηρίζει push.",true);return;}
 // Request permission within a direct click handler before any unrelated await.
 let permission=Notification.permission;
 try{if(permission==="default")permission=await Notification.requestPermission();}
 catch{say("Άνοιξε το παιχνίδι απευθείας στον Chrome και επίτρεψε τις ειδοποιήσεις.",true);draw();return;}
 if(permission!=="granted"){say("Πρέπει να επιτρέψεις τις ειδοποιήσεις από τον browser.",true);draw();return;}
 working=true;draw();say("Ενεργοποίηση ειδοποιήσεων…");
 try{
  const reg=await registration(true);
  let sub=await reg.pushManager.getSubscription();
  if(!sub){
   const response=await fetch(ENDPOINT,{method:"GET",cache:"no-store"});
   const data=await response.json();
   if(!response.ok||typeof data.vapidPublicKey!=="string")throw new Error("Δεν είναι διαθέσιμο το κλειδί ειδοποιήσεων.");
   sub=await reg.pushManager.subscribe({userVisibleOnly:true,
     applicationServerKey:decodeKey(data.vapidPublicKey)});
  }
  await request("subscribe",{subscription:sub.toJSON()});
  enabled=true;say("Οι ειδοποιήσεις νέων στοιχημάτων ενεργοποιήθηκαν.");
 }catch(err){say(err?.message||"Απέτυχε η ενεργοποίηση.",true);}
 finally{working=false;draw();}
}
async function disable(silent=false){
 if(!supported()){enabled=false;draw();return;}
 if(working&&!silent)return;
 working=true;draw();
 try{
  const sub=await currentSubscription();
  if(sub){
   // If the server is unavailable, still unsubscribe this device.
   try{await request("disable",{endpoint:sub.endpoint});}
   catch(err){if(!silent)throw err;}
   await sub.unsubscribe();
  }
  enabled=false;
  if(!silent)say("Οι ειδοποιήσεις απενεργοποιήθηκαν.");
 }catch(err){if(!silent)say(err?.message||"Δεν ήταν δυνατή η απενεργοποίηση.",true);}
 finally{working=false;draw();}
}
async function test(){
 if(!enabled||working)return;
 working=true;draw();say("Αποστολή δοκιμαστικού push…");
 try{
  const sub=await currentSubscription();
  if(!sub)throw new Error("Δεν υπάρχει ενεργή συνδρομή ειδοποιήσεων.");
  await request("test",{endpoint:sub.endpoint});
  say("Η δοκιμαστική ειδοποίηση στάλθηκε. Έλεγξε τις ειδοποιήσεις του κινητού.");
 }catch(err){say(err?.message||"Δεν ήταν δυνατή η αποστολή.",true);}
 finally{working=false;draw();}
}
$("pushEnable").addEventListener("click",toggleOn);
$("pushDisable").addEventListener("click",()=>disable(false));
$("pushTest").addEventListener("click",test);
window.arrivalPushUI={
 renderState:(session,model)=>{
  const next=model?.player?.id&&session?String(model.player.id):"";
  if(next!==account){
    account=next;enabled=false;say("");draw();
    if(account)void check();
  } else draw();
 },
 disableForLogout:()=>disable(true)
};
if(typeof state!=="undefined")window.arrivalPushUI.renderState(token(),state);
})();
