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
 score:text=>{document.getElementById("score").textContent=text},
 msg:text=>{document.getElementById("msg").textContent=text},
 ctrl:(...items)=>{const p=document.getElementById("controls");p.replaceChildren(...items)},
 render:node=>{document.getElementById("play").replaceChildren(node)},
 grid:(n,cells,click,cl="")=>{const root=document.createElement("div");root.className="grid-board "+cl;root.style.gridTemplateColumns="repeat("+n+",minmax(0,1fr))";cells.forEach((item,i)=>{const b=document.createElement("button");b.type="button";b.className="tile "+(item.cls||"");b.textContent=item.label??"";b.disabled=!!item.disabled;b.setAttribute("aria-label",item.aria||String(item.label||"Θέση "+(i+1)));b.onclick=()=>click(i);root.appendChild(b)});return root},
 card:(rank,suit,fn)=>{const c=document.createElement("button");c.type="button";c.className="playing-card"+("♥♦".includes(suit)?" red":"");c.innerHTML="<span></span><span></span>";c.children[0].textContent=rank;c.children[1].textContent=suit;c.setAttribute("aria-label",rank+" "+suit);if(fn)c.onclick=fn;return c},
 mount:()=>{window.addEventListener("pagehide",()=>{window.dispatchEvent(new Event("game-paused"))});}
};
G.mount();
// Each game can initialize the common offline cache even when opened directly.
if("serviceWorker" in navigator&&location.protocol==="https:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("../sw.js",{scope:"../"}).catch(e=>console.warn("Games offline cache:",e)));
}