import * as THREE from 'three';

const KEY='my-virtual-pet-3d-v1', DAY=86400000, MAX_OFFLINE=14*DAY;
const defaults=()=>({version:1,name:'Πίκο',born:Date.now(),last:Date.now(),food:85,water:85,happy:80,energy:85,clean:90,health:100,coins:20,xp:0,level:1,sleeping:false,actions:0});
const clamp=(n)=>Math.max(0,Math.min(100,n));
const safe=(n,fallback)=>Number.isFinite(n)?n:fallback;
function restore(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const v=JSON.parse(raw);if(v.version!==1||typeof v.name!=='string')return null;const d=defaults();for(const k of Object.keys(d)){if(k in v&&typeof v[k]===typeof d[k])d[k]=v[k]}d.name=d.name.slice(0,20);for(const k of ['food','water','happy','energy','clean','health'])d[k]=clamp(safe(d[k],75));d.last=safe(d.last,Date.now());d.born=safe(d.born,Date.now());d.coins=Math.max(0,Math.floor(safe(d.coins,0)));d.xp=Math.max(0,Math.floor(safe(d.xp,0)));return d}catch(e){return null}}
let pet=restore()||defaults(),ready=!!localStorage.getItem(KEY);
let noticeTimer=0,anim={type:'idle',until:0},idlePhase=0,orbit=0.28,zoom=8.5,drag=null;
const $=id=>document.getElementById(id), sceneEl=$('scene');
$('needsToggle').addEventListener('click',()=>{const collapsed=$('needs').classList.toggle('collapsed');$('needsToggle').textContent=collapsed?'▾ Ανάγκες':'▴ Απόκρυψη';$('needsToggle').setAttribute('aria-expanded',String(!collapsed))});
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
 $('meters').replaceChildren();
 for(const [key,label,color] of labels){const v=Math.round(pet[key]),wrap=document.createElement('div');wrap.className='meter'+(v<20?' critical':'');const line=document.createElement('div');line.className='line';const l=document.createElement('span'),r=document.createElement('span');l.textContent=label;r.textContent=v+'%';line.append(l,r);const track=document.createElement('div'),fill=document.createElement('div');track.className='track';fill.className='fill';fill.style.width=v+'%';fill.style.background=color;track.append(fill);wrap.append(line,track);$('meters').append(wrap)}
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
function animate(type){anim={type,until:performance.now()+1800}}
function settings(){
 const p=document.createElement('div'),text=document.createElement('p');text.textContent='Η πρόοδος αποθηκεύεται μόνο σε αυτή τη συσκευή. Το κατοικίδιο συνεχίζει να έχει ανάγκες όσο λείπεις (έως 14 ημέρες υπολογισμού ανά επιστροφή).';p.append(text);
 const info=document.createElement('p');info.textContent='🪙 '+pet.coins+' νομίσματα · Επίπεδο '+pet.level+' · Ημέρα '+ageDays();p.append(info);
 modal('Ρυθμίσεις',p,[{text:'Εξαγωγή backup',action:()=>{const blob=new Blob([JSON.stringify(pet,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='virtual-pet-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Το αντίγραφο ασφαλείας ετοιμάστηκε.')}},
 {text:'Αλλαγή ονόματος',action:()=>{const n=prompt('Νέο όνομα',pet.name);if(n&&n.trim()){pet.name=n.trim().slice(0,20);save();refresh();closeModal()}}},
 {text:'Κλείσιμο',action:closeModal}])
}
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.action)));
$('settings').addEventListener('click',settings);
if(!ready)adoption();else{advance();save();refresh();}

// Original procedurally modeled parrot and room; actual THREE.js 3D geometry.
let scene,camera,renderer,bird,wingL,wingR,head,tail,eyeL,eyeR,body,bowlFood,bowlWater,perch;
try{
 scene=new THREE.Scene();scene.background=new THREE.Color('#a4d4e8');scene.fog=new THREE.Fog('#a4d4e8',15,28);
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
 box(12,.3,10,floor,0,-.18,0);box(12,5,.24,wall,0,2.35,-5);box(.24,5,10,mat('#b8d9de'),-6,2.35,0);
 // Floor rug, window, wall decor
 const rug=add(new THREE.CylinderGeometry(2.8,2.8,.035,64),mat('#82c4c3'),0,.015,.8);rug.receiveShadow=true;
 box(2.5,2, .08,mat('#6da5c4'),2.7,2.75,-4.84);box(2.7,.13,.14,white,2.7,3.75,-4.72);box(2.7,.13,.14,white,2.7,1.77,-4.72);
 box(.13,2,.14,white,2.7,2.75,-4.7);
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
 // Scene loop
 let previous=performance.now(),lastUI=0;
 function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;idlePhase+=dt;
  const ageScale=ageDays()<=7?.82:ageDays()<=30?.9:1;
  bird.scale.setScalar(ageScale);
  const t=idlePhase,active=now<anim.until?anim.type:'idle';
  bird.position.y=2.55+Math.sin(t*2.5)*.045+(active==='play'?Math.abs(Math.sin(t*9))*.32:0);
  bird.rotation.y=Math.sin(t*.6)*.16+(active==='pet'?Math.sin(t*7)*.13:0);
  head.rotation.z=Math.sin(t*1.9)*.055;head.rotation.x=active==='eat'?.3:active==='drink'?.4:pet.sleeping?.16:0;
  wingL.rotation.z=active==='play'?Math.sin(t*15)*.8:Math.sin(t*2)*.035;
  wingR.rotation.z=-wingL.rotation.z;tail.rotation.x=Math.sin(t*2)*.09;
  if(pet.sleeping){head.rotation.x=.2;bird.position.y=2.48}
  camera.position.set(Math.sin(orbit)*zoom,4.4+(zoom-8.5)*.22,Math.cos(orbit)*zoom);
  camera.lookAt(0,1.45,0);renderer.render(scene,camera);
  if(now-lastUI>10000){lastUI=now;if(ready){advance();save();refresh()}}
 }
 function resize(){const w=sceneEl.clientWidth,h=sceneEl.clientHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
 window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);
 const surface=renderer.domElement;
 surface.addEventListener('pointerdown',e=>{surface.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY}});
 surface.addEventListener('pointermove',e=>{if(!drag)return;orbit=Math.max(-1.12,Math.min(1.12,orbit+(e.clientX-drag.x)*.006));drag={x:e.clientX,y:e.clientY}});
 surface.addEventListener('pointerup',()=>drag=null);surface.addEventListener('pointercancel',()=>drag=null);
 surface.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(5,Math.min(13,zoom+Math.sign(e.deltaY)*.6))},{passive:false});
}catch(error){console.error('3D initialization failed',error);sceneEl.innerHTML='<div style="position:absolute;top:45%;width:100%;text-align:center;padding:25px">Δεν ήταν δυνατή η φόρτωση του 3D. Χρειάζεται WebGL και σύνδεση για τη βιβλιοθήκη Three.js.</div>'}
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else if(ready){advance();save();refresh()}});
