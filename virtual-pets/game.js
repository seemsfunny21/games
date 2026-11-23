import * as THREE from 'three';

const KEY='my-virtual-pet-3d-v1', DAY=86400000, MAX_OFFLINE=14*DAY;
const defaults=()=>({version:1,name:'Πίκο',born:Date.now(),last:Date.now(),food:85,water:85,happy:80,energy:85,clean:90,health:100,coins:20,xp:0,level:1,sleeping:false,actions:0,trained:0,trainingSkills:{come:0,fly:0,perch:0},bestStars:0,bestMemory:0,lastReward:0});
const clamp=(n)=>Math.max(0,Math.min(100,n));
const safe=(n,fallback)=>Number.isFinite(n)?n:fallback;
function restore(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const v=JSON.parse(raw);if(v.version!==1||typeof v.name!=='string')return null;const d=defaults();for(const k of Object.keys(d)){if(k in v&&typeof v[k]===typeof d[k])d[k]=v[k]}d.name=d.name.slice(0,20);for(const k of ['food','water','happy','energy','clean','health'])d[k]=clamp(safe(d[k],75));d.last=safe(d.last,Date.now());d.born=safe(d.born,Date.now());d.coins=Math.max(0,Math.floor(safe(d.coins,0)));d.xp=Math.max(0,Math.floor(safe(d.xp,0)));if(v.trainingSkills&&typeof v.trainingSkills==='object'){for(const k of ['come','fly','perch'])d.trainingSkills[k]=Math.max(0,Math.min(100,Math.floor(Number(v.trainingSkills[k])||0)))}return d}catch(e){return null}}
let pet=restore()||defaults(),ready=!!localStorage.getItem(KEY);
let noticeTimer=0,anim={type:'idle',until:0},idlePhase=0,orbit=0.28,zoom=11.5,drag=null;
const $=id=>document.getElementById(id), sceneEl=$('scene');

function save(){try{localStorage.setItem(KEY,JSON.stringify(pet))}catch(e){toast('Δεν ήταν δυνατή η αποθήκευση. Έλεγξε τον διαθέσιμο χώρο.')}}
function advance(now=Date.now()){
 const elapsed=Math.max(0,Math.min(MAX_OFFLINE,now-pet.last));
 if(elapsed<1000)return;
 const hours=elapsed/3600000;
 pet.food=clamp(pet.food-hours*3.1);pet.water=clamp(pet.water-hours*4.2);
 pet.happy=clamp(pet.happy-hours*2.1);pet.clean=clamp(pet.clean-hours*1.35);
 pet.energy=clamp(pet.energy+(pet.sleeping?hours*11:-hours*2.5));
 if(pet.food<15||pet.water<15)pet.health=clamp(pet.health-hours*1.8);
 else if(pet.food>50&&pet.water>50&&pet.energy>35)pet.health=clamp(pet.health+hours*.65);
 pet.last=now;
}
function ageDays(){return Math.max(1,Math.floor(Math.max(0,Date.now()-pet.born)/DAY)+1)}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),3200)}
function modal(title,body,buttons){$('modalTitle').textContent=title;$('modalBody').replaceChildren();if(typeof body==='string'){const p=document.createElement('p');p.textContent=body;$('modalBody').append(p)}else $('modalBody').append(body);$('modalButtons').replaceChildren();for(const b of buttons){const btn=document.createElement('button');btn.textContent=b.text;btn.className=b.danger?'danger':'';btn.addEventListener('click',b.action);$('modalButtons').append(btn)}$('modal').hidden=false}
function closeModal(){$('modal').hidden=true}
function adoption(){const box=document.createElement('div'),p=document.createElement('p'),input=document.createElement('input');p.textContent='Καλώς ήρθες! Δώσε όνομα στο παπαγαλάκι σου.';input.maxLength=20;input.value=pet.name;input.setAttribute('aria-label','Όνομα παπαγάλου');box.append(p,input);modal('Υιοθεσία 🦜',box,[{text:'Υιοθεσία',action:()=>{const name=input.value.trim();if(!name){input.focus();return}pet.name=name;ready=true;save();closeModal();refresh();toast('Καλώς ήρθες, '+pet.name+'!')}}]);input.focus()}
const labels=[['food','🌻 Τροφή','#e9b55d'],['water','💧 Νερό','#67c9ed'],['happy','💚 Ευτυχία','#8bd49e'],['energy','🌙 Ενέργεια','#d6b5f3'],['clean','✨ Καθαριότητα','#85d7c8'],['health','❤️ Υγεία','#ee9e9e']];
function refresh(){
 $('petName').textContent=pet.name;$('age').textContent='Ημέρα '+ageDays()+' · Lv '+pet.level;
 for(const [key] of labels){const elements=document.querySelectorAll('[data-meter="'+key+'"]');const value=Math.round(pet[key]);for(const el of elements){el.textContent=value+'%';el.classList.toggle('low',value<20);el.setAttribute('aria-label',key+' '+value+'%')}}
 const critical=pet.water<20?'Χρειάζεται επειγόντως νερό!':pet.food<20?'Πεινάει πολύ!':pet.health<30?'Χρειάζεται ξεκούραση και φροντίδα.':null;
 $('status').textContent=critical|| (pet.sleeping?'💤 Κοιμάται και ανακτά ενέργεια.':'🪙 '+pet.coins+' νομίσματα · ✦ '+pet.xp+' XP · '+(pet.happy>65?'Είναι χαρούμενο!':'Θέλει λίγη παρέα.'));
}
function award(xp=2){pet.xp+=xp;while(pet.xp>=pet.level*25){pet.xp-=pet.level*25;pet.level++;pet.coins+=10;toast('Νέο επίπεδο '+pet.level+'! +10 νομίσματα')}}
function act(type){
 if(!ready){adoption();return}
 advance();const before=pet[type];
 if(type==='feed'){if(pet.coins<2){toast('Χρειάζεσαι 2 νομίσματα για τροφή. Παίξε για να κερδίσεις!');return}pet.coins-=2;pet.food=clamp(pet.food+27);pet.clean=clamp(pet.clean-2);award(2);animate('eat');toast('🌻 Το '+pet.name+' τρώει σπόρους!')}
 if(type==='water'){pet.water=clamp(pet.water+32);award(1);animate('drink');toast('💧 Ήπιε φρέσκο νερό!')}
 if(type==='play'){if(pet.energy<10){toast('Είναι κουρασμένο. Άφησέ το να κοιμηθεί.');return}pet.happy=clamp(pet.happy+18);pet.energy=clamp(pet.energy-9);pet.food=clamp(pet.food-3);pet.clean=clamp(pet.clean-3);pet.coins+=4;award(6);animate('play');toast('🪀 Παίξατε! +4 νομίσματα · +6 XP')}
 if(type==='pet'){pet.happy=clamp(pet.happy+9);award(1);animate('pet');toast('💚 Του άρεσε το χάδι!')}
 if(type==='sleep'){pet.sleeping=!pet.sleeping;animate(pet.sleeping?'sleep':'wake');toast(pet.sleeping?'🌙 Ώρα για ύπνο.':'☀️ Καλημέρα!')}
 if(type!=='sleep'&&pet.sleeping)pet.sleeping=false;
 pet.actions++;pet.last=Date.now();save();refresh();
}
function animate(type){const duration=type==='eat'||type==='drink'?5200:type==='play'?3300:type==='pet'?2300:type.startsWith('train-')?3600:1800;anim={type,start:performance.now(),until:performance.now()+duration}}
// Short touch-friendly mini-game. Catch moving stars before the countdown ends.
let mini=null, memoryRound=null;
function stopMini(reward=true){
 if(!mini)return;
 const game=mini;mini=null;clearInterval(game.timer);
 $('miniGame').hidden=true;$('miniTargets').replaceChildren();
 if(reward&&game.score>0){pet.bestStars=Math.max(pet.bestStars||0,game.score);pet.coins+=game.score*2;pet.happy=clamp(pet.happy+Math.min(18,game.score*3));award(game.score*2);save();refresh();toast('⭐ '+game.score+' αστέρια · +'+(game.score*2)+' νομίσματα!')}
}
function startMini(){
 if(!ready){adoption();return}
 if(mini)return;
 advance();if(pet.sleeping){toast('Ξύπνησε το παπαγαλάκι για να παίξετε.');return}
 // Accessible even at low energy, but it costs a little energy to play.
 pet.energy=clamp(pet.energy-3);save();refresh();
 const panel=$('miniGame'),field=$('miniTargets');field.replaceChildren();panel.hidden=false;
 mini={score:0,end:Date.now()+20000,timer:0};
 function spawn(){if(!mini)return;field.replaceChildren();const star=document.createElement('button');star.type='button';star.className='mini-star';star.textContent='⭐';star.setAttribute('aria-label','Πιάσε το αστέρι');star.style.left=(10+Math.random()*78)+'%';star.style.top=(12+Math.random()*68)+'%';star.addEventListener('click',()=>{if(!mini)return;mini.score++;$('miniScore').textContent=mini.score;animate('play');spawn()});field.append(star)}
 $('miniScore').textContent='0';$('miniTime').textContent='20';spawn();
 mini.timer=setInterval(()=>{if(!mini)return;const left=Math.max(0,Math.ceil((mini.end-Date.now())/1000));$('miniTime').textContent=left;if(left===0)stopMini(true)},200);
}
function memoryGame(){
 if(!ready){adoption();return}if(pet.sleeping){toast('Ξύπνησέ το πρώτα.');return}
 if(mini)stopMini(false);
 const icons=['🌻','💧','🦜','⭐','🌿','💚'];
 const pairs=[...icons.slice(0,4),...icons.slice(0,4)].sort(()=>Math.random()-.5);
 const wrap=document.createElement('div');wrap.className='memory-grid';
 const status=document.createElement('p');status.textContent='Βρες τα 4 ζευγάρια!';
 const box=document.createElement('div');box.append(status,wrap);
 let open=[],matched=0,moves=0,locked=false,finished=false;
 pairs.forEach((symbol,i)=>{const btn=document.createElement('button');btn.textContent='❔';btn.setAttribute('aria-label','Κρυμμένη κάρτα '+(i+1));btn.addEventListener('click',()=>{
  if(locked||finished||btn.dataset.done==='1'||open.some(x=>x.btn===btn))return;
  btn.textContent=symbol;open.push({btn,symbol});if(open.length<2)return;
  moves++;if(open[0].symbol===open[1].symbol){open.forEach(x=>{x.btn.dataset.done='1';x.btn.classList.add('matched')});open=[];matched++;status.textContent='Ζευγάρια '+matched+'/4 · Κινήσεις '+moves;
   if(matched===4){finished=true;const reward=Math.max(4,16-moves);pet.coins+=reward;pet.bestMemory=Math.max(pet.bestMemory||0,reward);pet.happy=clamp(pet.happy+12);award(8);save();refresh();status.textContent='🎉 Μπράβο! +'+reward+' νομίσματα · +8 XP';}}
  else{locked=true;setTimeout(()=>{if(!box.isConnected)return;open.forEach(x=>x.btn.textContent='❔');open=[];locked=false},750)}
 });wrap.append(btn)});
 modal('🧠 Παιχνίδι μνήμης',box,[{text:'Κλείσιμο',action:closeModal}]);
}
function progressPanel(){
 const box=document.createElement('div');box.className='progress-list';
 const entries=[['🦜 Έλα',pet.trainingSkills?.come||0],['🪽 Πέτα',pet.trainingSkills?.fly||0],['🌿 Στο κλαδί',pet.trainingSkills?.perch||0]];
 for(const [name,value] of entries){const p=document.createElement('p');p.textContent=name+' · '+value+'/100';const bar=document.createElement('div');bar.className='skill-track';const fill=document.createElement('div');fill.style.width=value+'%';bar.append(fill);box.append(p,bar)}
 const stats=document.createElement('p');stats.textContent='🎓 Εκπαιδεύσεις: '+pet.trained+' · ⭐ Ρεκόρ αστεριών: '+(pet.bestStars||0)+' · 🧠 Καλύτερη μνήμη: '+(pet.bestMemory||0)+' νομίσματα';box.append(stats);
 modal('🏆 Πρόοδος',box,[{text:'Κλείσιμο',action:closeModal}]);
}
function training(){
 if(!ready){adoption();return}
 const wrap=document.createElement('div');const info=document.createElement('p');info.textContent='Εντολές που γνωρίζει: Έλα · Πέτα · Στο κλαδί. Κάθε εκτέλεση δίνει +3 XP και +1 νόμισμα. Εκπαιδεύσεις: '+pet.trained;wrap.append(info);
 modal('🎓 Εκπαίδευση',wrap,[
  {text:'🦜 Έλα',action:()=>train('come')},
  {text:'🪽 Πέτα',action:()=>train('fly')},
  {text:'🌿 Στο κλαδί',action:()=>train('perch')},
  {text:'Κλείσιμο',action:closeModal}
 ]);
}
function train(command){
 advance();if(pet.sleeping){toast('Ξύπνησέ το πρώτα για εκπαίδευση.');return}
 if(pet.energy<12){toast('Χρειάζεται περισσότερη ενέργεια για εκπαίδευση.');return}
 pet.energy=clamp(pet.energy-4);pet.happy=clamp(pet.happy+3);pet.coins++;pet.trained=(pet.trained||0)+1;pet.trainingSkills=pet.trainingSkills||{come:0,fly:0,perch:0};pet.trainingSkills[command]=Math.min(100,(pet.trainingSkills[command]||0)+10);award(3);
 animate('train-'+command);save();refresh();closeModal();
 toast(command==='come'?'🦜 Έρχεται κοντά σου!':command==='fly'?'🪽 Πετάει με την εντολή σου!':'🌿 Επιστρέφει στο κλαδί!');
}
function settings(){
 const p=document.createElement('div'),text=document.createElement('p');text.textContent='Η πρόοδος αποθηκεύεται μόνο σε αυτή τη συσκευή. Το κατοικίδιο συνεχίζει να έχει ανάγκες όσο λείπεις (έως 14 ημέρες υπολογισμού ανά επιστροφή).';p.append(text);
 const info=document.createElement('p');info.textContent='🪙 '+pet.coins+' νομίσματα · Επίπεδο '+pet.level+' · Ημέρα '+ageDays();p.append(info);
 modal('Ρυθμίσεις',p,[{text:'Εξαγωγή backup',action:()=>{const blob=new Blob([JSON.stringify(pet,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='virtual-pet-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Το αντίγραφο ασφαλείας ετοιμάστηκε.')}},
 {text:'Αλλαγή ονόματος',action:()=>{const input=document.createElement('input');input.value=pet.name;input.maxLength=20;modal('✏️ Όνομα',input,[{text:'Αποθήκευση',action:()=>{if(!input.value.trim())return;pet.name=input.value.trim().slice(0,20);save();refresh();closeModal()}},{text:'Άκυρο',action:closeModal}]);input.focus()}},
 {text:'Εισαγωγή backup',action:()=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{try{const raw=JSON.parse(await input.files[0].text());if(raw.version!==1||typeof raw.name!=='string'||!Number.isFinite(raw.born))throw Error('bad backup');const confirmed=window.confirm('Επαναφορά αποθηκευμένου κατοικιδίου; Η τωρινή πρόοδος θα αντικατασταθεί.');if(!confirmed)return;localStorage.setItem(KEY,JSON.stringify(raw));location.reload()}catch(e){toast('Μη έγκυρο αντίγραφο ασφαλείας.')}});input.click()}},
 {text:'Κλείσιμο',action:closeModal}])
}
$('training').addEventListener('click',training);
$('miniStart').addEventListener('click',startMini);
$('memoryStart').addEventListener('click',memoryGame);
$('progressStart').addEventListener('click',progressPanel);
$('miniClose').addEventListener('click',()=>stopMini(true));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.action)));
$('settings').addEventListener('click',settings);
if(!ready)adoption();else{advance();save();refresh();}

// Original procedurally modeled parrot and room; actual THREE.js 3D geometry.
let scene,camera,renderer,bird,wingL,wingR,head,tail,eyeL,eyeR,body,bowlFood,bowlWater,perch;
try{
 scene=new THREE.Scene();scene.background=new THREE.Color('#a4d4e8');scene.fog=new THREE.Fog('#a4d4e8',26,65);
 camera=new THREE.PerspectiveCamera(40,1,.1,100);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;sceneEl.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0x8a9d9e,2.2));
 const light=new THREE.DirectionalLight(0xfff2d9,3);light.position.set(-4,8,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-8;light.shadow.camera.right=8;light.shadow.camera.top=8;light.shadow.camera.bottom=-8;scene.add(light);
 const mat=(c,rough=.7)=>new THREE.MeshStandardMaterial({color:c,roughness:rough});
 const add=(geo,m,x,y,z,parent=scene)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o};
 const box=(w,h,d,m,x,y,z,parent)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
 const sphere=(r,m,x,y,z,parent,s=24)=>add(new THREE.SphereGeometry(r,s,16),m,x,y,z,parent);
 const cylinder=(r1,r2,h,m,x,y,z,parent)=>add(new THREE.CylinderGeometry(r1,r2,h,24),m,x,y,z,parent);
 const wood=mat('#bc8b65'),floor=mat('#e4cba8'),wall=mat('#c8e6ea'),white=mat('#fff4dc'),leaf=mat('#6ab787');
 // Wall-free 360-degree play space. No room geometry can pass in front of the camera.
 box(70,.3,70,floor,0,-.18,0);
 const rug=add(new THREE.CylinderGeometry(2.8,2.8,.035,64),mat('#82c4c3'),0,.015,.8);rug.receiveShadow=true;
 // Perch and branch
 cylinder(.14,.18,2.0,wood,0,1.02,0);cylinder(.14,.14,2.2,wood,0,2.0,0).rotation.z=Math.PI/2;
 cylinder(.62,.7,.15,wood,0,.05,0);
 // Food and water bowls
 const bowl=(x,color)=>{const base=cylinder(.5,.55,.22,mat(color),x,.13,1.7);const top=cylinder(.38,.38,.01,mat('#f0f0d7'),x,.255,1.7);return {base,top}};
 bowlFood=bowl(-1.35,'#ffb960');bowlWater=bowl(1.35,'#64bfe4');
 for(let i=0;i<8;i++)sphere(.065,mat('#b88c3c'),-1.35+(i%4-.5)*.12,.29,1.7+Math.floor(i/4)*.15);
 const water=add(new THREE.CylinderGeometry(.36,.36,.015,24),mat('#3f9dce',.25),1.35,.285,1.7);
 // Toy
 sphere(.34,mat('#f6a8b6'),2.8,.34,1.7);sphere(.12,mat('#fff0a5'),2.75,.53,1.45);
 // Plant
 cylinder(.38,.28,.65,mat('#ce9778'),-4.6,.33,-3.2);
 for(let i=0;i<5;i++){const l=sphere(.48,leaf,-4.6+Math.sin(i*2.4)*.45,1.2+i*.12,-3.2+Math.cos(i*2.4)*.35);l.scale.set(.65,1.3,.5)}
 // Bird group
 bird=new THREE.Group();scene.add(bird);bird.position.set(0,2.55,0);
 const green=mat('#39b96d'),mint=mat('#68d996'),blue=mat('#2f9cc5'),beak=mat('#f7b850'),black=mat('#122537',.3),iris=mat('#fff8e9'),feet=mat('#e39d64');
 body=sphere(.62,green,0,0,0,bird);body.scale.set(.86,1.1,.77);
 sphere(.43,mint,0,-.06,.45,bird).scale.set(.9,1.15,.35);
 head=new THREE.Group();head.position.set(0,.78,.12);bird.add(head);
 sphere(.55,green,0,0,0,head);
 sphere(.17,beak,0,-.12,.56,head).scale.set(1, .65,1.35);
 const eye=(x)=>{sphere(.16,iris,x,.12,.43,head);sphere(.092,black,x,.12,.56,head);sphere(.028,white,x-.025,.155,.635,head)};
 eye(-.25);eye(.25);
 for(let i=0;i<3;i++){const crest=sphere(.095,mint,(i-1)*.15,.54+i*.035,-.05,head);crest.scale.set(.7,2.1,.7);crest.rotation.z=(i-1)*-.35}
 wingL=new THREE.Group();wingR=new THREE.Group();bird.add(wingL,wingR);
 wingL.position.set(-.5,.1,0);wingR.position.set(.5,.1,0);
 for(const [wing,sign] of [[wingL,-1],[wingR,1]]){const feather=sphere(.31,blue,sign*.17,-.22,0,wing);feather.scale.set(.75,1.7,.5);feather.rotation.z=sign*-.4;for(let i=0;i<3;i++){const tip=sphere(.12,mat(i===0?'#2389bd':'#4ec5c7'),sign*(.2+i*.07),-.57+i*.06,-.05,wing);tip.scale.set(.65,1.5,.6)}}
 tail=new THREE.Group();bird.add(tail);tail.position.set(0,-.34,-.5);
 for(let i=-1;i<=1;i++){const f=sphere(.15,blue,i*.16,-.3,-.22,tail);f.scale.set(.55,2.7,.55);f.rotation.x=-.3}
 for(const x of [-.27,.27]){cylinder(.045,.045,.36,feet,x,-.62,.12,bird);for(let i=-1;i<=1;i++){const toe=cylinder(.035,.035,.25,feet,x+i*.075,-.78,.19,bird);toe.rotation.x=Math.PI/2}}
 // Floating 3D sleep symbols: face the camera and drift upward above the head.
 const sleepSymbols=[];
 const zCanvas=document.createElement('canvas');zCanvas.width=256;zCanvas.height=128;
 const zCtx=zCanvas.getContext('2d');
 zCtx.clearRect(0,0,256,128);zCtx.font='bold 92px system-ui, sans-serif';zCtx.textAlign='center';zCtx.textBaseline='middle';
 zCtx.lineWidth=11;zCtx.strokeStyle='#173d59';zCtx.strokeText('Zzz',128,63);
 zCtx.fillStyle='#e8faff';zCtx.fillText('Zzz',128,63);
 const zTexture=new THREE.CanvasTexture(zCanvas);zTexture.colorSpace=THREE.SRGBColorSpace;
 for(let k=0;k<3;k++){
  const material=new THREE.SpriteMaterial({map:zTexture,transparent:true,depthWrite:false,opacity:0});
  const symbol=new THREE.Sprite(material);symbol.scale.set(1.18,.59,1);symbol.visible=false;
  scene.add(symbol);sleepSymbols.push(symbol);
 }
 // Motion system: perched idle, occasional hops, short flights, and bowl visits.
 // The bird is animated in world space; its original perch position is the home pose.
 const home=new THREE.Vector3(0,2.55,0);
 let roam={kind:'perch',start:performance.now(),until:performance.now()+2500,from:home.clone(),to:home.clone()};
 const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 const mix=(a,b,t)=>a+(b-a)*t;
 function chooseRoam(now){
  const roll=Math.random(),flight=roll>.7&&pet.energy>20;
  const target=flight?new THREE.Vector3((Math.random()-.5)*3.6,2.5+Math.random()*1.5,(Math.random()-.5)*2.5):new THREE.Vector3((Math.random()-.5)*.9,2.55,(Math.random()-.5)*.22);
  roam={kind:flight?'fly':'hop',start:now,until:now+(flight?3200:1700),from:bird.position.clone(),to:target};
 }
 let previous=performance.now(),lastUI=0;
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;idlePhase+=dt;
  const ageScale=ageDays()<=7?.82:ageDays()<=30?.9:1;
  bird.scale.setScalar(ageScale);
  const t=idlePhase,active=now<anim.until?anim.type:'idle';
  let flying=false,position=home.clone(),facing=0;
  if(pet.sleeping){position.set(0,2.48,0);roam.until=now+3000}
  else if(active==='eat'||active==='drink'){
   const total=anim.until-anim.start,progress=Math.max(0,Math.min(1,(now-anim.start)/total));
   const bowlX=active==='eat'?-1.35:1.35;
   const destination=new THREE.Vector3(bowlX,.98,1.38);
   // Take off, descend toward the bowl, eat/drink, then return to the perch.
   const travel=progress<.29?smooth(progress/.29):progress>.75?smooth((1-progress)/.25):1;
   position.lerpVectors(home,destination,travel);
   position.y+=Math.sin(Math.PI*travel)*.38;
   flying=progress<.29||progress>.75;
   facing=progress<.75?Math.atan2(bowlX,1.38):0;
   if(progress>.29&&progress<.75){position.y+=Math.sin(t*10)*.035;head.rotation.x=.35}
   roam.until=now+2500;
  }else if(active==='play'){
   const progress=(now-anim.start)/(anim.until-anim.start);
   position.set(Math.sin(progress*Math.PI*2)*1.15,2.7+Math.sin(progress*Math.PI*3)*.55,Math.cos(progress*Math.PI*2)*.65);
   facing=progress*Math.PI*2;flying=true;roam.until=now+2000;
  }else if(active.startsWith('train-')){
   const progress=Math.max(0,Math.min(1,(now-anim.start)/(anim.until-anim.start)));
   const motion=smooth(progress<.5?progress*2:(1-progress)*2);
   if(active==='train-come'){
    position.set(0,2.55-.65*motion,1.9*motion);facing=0;flying=progress<.3||progress>.7;
   }else if(active==='train-fly'){
    position.set(Math.sin(progress*Math.PI*2)*1.6,2.55+Math.sin(progress*Math.PI)*1.55,Math.sin(progress*Math.PI*2)*.7);
    facing=progress*Math.PI*2;flying=true;
   }else{
    position.set(Math.sin(progress*Math.PI)*.85,2.55+Math.sin(progress*Math.PI)*.65,Math.sin(progress*Math.PI)*.5);
    flying=progress<.8;
   }
   roam={kind:'perch',start:now,until:now+1600,from:home.clone(),to:home.clone()};
  }else if(active==='pet'){
   position.copy(home);position.y+=Math.sin(t*8)*.08;facing=Math.sin(t*8)*.2;roam.until=now+2000;
  }else{
   if(now>=roam.until){if(Math.hypot(bird.position.x,bird.position.z)>.45){roam={kind:'fly',start:now,until:now+2400,from:bird.position.clone(),to:home.clone()}}else chooseRoam(now)}
   const progress=smooth((now-roam.start)/(roam.until-roam.start));
   position.lerpVectors(roam.from,roam.to,progress);
   if(roam.kind==='fly'){flying=true;position.y+=Math.sin(Math.PI*progress)*.5}
   else position.y+=Math.sin(Math.PI*progress)*.17;
   
   // Periodically return to the perch, rather than drifting indefinitely.
   if(Math.hypot(position.x,position.z)>2.5){roam.to.copy(home)}
   facing=Math.atan2(roam.to.x-roam.from.x,roam.to.z-roam.from.z)*.5;
  }
  bird.position.copy(position);bird.position.y+=Math.sin(t*2.5)*.025;
  for(let k=0;k<sleepSymbols.length;k++){
   const symbol=sleepSymbols[k];symbol.visible=pet.sleeping;
   if(pet.sleeping){const phase=((now/2600)+k/3)%1;symbol.position.set(bird.position.x+.45+phase*.32,bird.position.y+1.36+phase*1.25,bird.position.z+.12);symbol.material.opacity=Math.min(1,phase*5,(1-phase)*4)*.92;const scale=.68+phase*.55;symbol.scale.set(scale*1.55,scale*.78,1)}
  }
  bird.rotation.y=facing+Math.sin(t*.6)*.09;
  head.rotation.z=active==='pet'?Math.sin(t*9)*.18:Math.sin(t*1.9)*.055;
  head.rotation.x=active==='eat'||active==='drink'?.3:pet.sleeping?.2:Math.sin(t*1.4)*.05;
  const flap=flying?Math.sin(t*20)*.85:Math.sin(t*2)*.04;
  wingL.rotation.z=flap;wingR.rotation.z=-flap;
  tail.rotation.x=Math.sin(t*(flying?12:2))*.13;
  camera.position.set(Math.sin(orbit)*zoom,4.4+(zoom-11.5)*.18,Math.cos(orbit)*zoom);
  camera.lookAt(0,1.45,0);renderer.render(scene,camera);
  if(now-lastUI>10000){lastUI=now;if(ready){advance();save();refresh();if(!pet.sleeping&&Math.random()<.09){const need=pet.water<35?'💧 Θέλω νερό!':pet.food<35?'🌻 Πεινάω!':pet.happy<35?'💚 Παίζουμε λίγο;':pet.energy<20?'🌙 Νυστάζω!':null;if(need)toast(need)}}}
 }
 function resize(){const w=sceneEl.clientWidth,h=sceneEl.clientHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
 window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
 $('zoomOut').addEventListener('click',()=>{zoom=Math.min(22,zoom+2)});
 $('zoomIn').addEventListener('click',()=>{zoom=Math.max(5,zoom-2)});
 const surface=renderer.domElement;
 const pointers=new Map();let pinchDistance=0;
 surface.addEventListener('pointerdown',e=>{surface.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};if(pointers.size>1)pinchDistance=0});
 surface.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)zoom=Math.max(5,Math.min(22,zoom*pinchDistance/Math.max(1,distance)));pinchDistance=distance;drag=null}
  else if(drag){orbit+=(e.clientX-drag.x)*.006;drag={x:e.clientX,y:e.clientY}}
 });
 const endPointer=e=>{pointers.delete(e.pointerId);pinchDistance=0;drag=null};
 surface.addEventListener('pointerup',endPointer);surface.addEventListener('pointercancel',endPointer);
 surface.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(5,Math.min(22,zoom+Math.sign(e.deltaY)*.8))},{passive:false});
}catch(error){console.error('3D initialization failed',error);sceneEl.innerHTML='<div style="position:absolute;top:45%;width:100%;text-align:center;padding:25px">Δεν ήταν δυνατή η φόρτωση του 3D. Χρειάζεται WebGL και σύνδεση για τη βιβλιοθήκη Three.js.</div>'}
window.addEventListener('pagehide',()=>{stopMini(false);save()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMini(false);save()}else if(ready){advance();save();refresh()}});
