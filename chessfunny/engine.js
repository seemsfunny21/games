/* ChessFunny chess rules, offline, no dependencies. */
(function(root){'use strict';
const D=[[1,0],[-1,0],[0,1],[0,-1]],X=[[1,1],[1,-1],[-1,1],[-1,-1]],N=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]],V={p:100,n:320,b:330,r:500,q:900,k:20000};
const file=i=>i%8,row=i=>Math.floor(i/8),on=(x,y)=>x>=0&&x<8&&y>=0&&y<8,ix=(x,y)=>y*8+x;
const side=p=>!p?null:p===p.toUpperCase()?'w':'b',other=s=>s==='w'?'b':'w',name=i=>'abcdefgh'[file(i)]+(8-row(i));
function start(){return{b:'rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR'.split('').map(c=>c==='.'?null:c),turn:'w',castle:'KQkq',ep:-1,half:0,full:1};}
function attacked(g,pos,s){
 const b=g.b,x=file(pos),y=row(pos),py=y+(s==='w'?1:-1);
 for(const dx of [-1,1])if(on(x+dx,py)&&b[ix(x+dx,py)]===(s==='w'?'P':'p'))return true;
 for(const [dx,dy] of N)if(on(x+dx,y+dy)&&b[ix(x+dx,y+dy)]===(s==='w'?'N':'n'))return true;
 for(const [dx,dy] of D.concat(X)){
  let xx=x+dx,yy=y+dy,d=1;
  while(on(xx,yy)){
   let p=b[ix(xx,yy)];
   if(p){if(side(p)===s){const t=p.toLowerCase(),straight=dx===0||dy===0;
    if(t==='q'||straight&&t==='r'||!straight&&t==='b'||d===1&&t==='k')return true;
   }break;}
   xx+=dx;yy+=dy;d++;
  }
 }
 return false;
}
function check(g,s){const k=g.b.indexOf(s==='w'?'K':'k');return k<0||attacked(g,k,other(s));}
function pseudo(g){
 const out=[],b=g.b,s=g.turn;
 const add=(a,z,promo=null,kind='')=>{if(b[z]?.toLowerCase()==='k')return;out.push({from:a,to:z,...(promo?{promo}:{}),...(kind?{kind}:{})});};
 for(let a=0;a<64;a++){
  const p=b[a];if(!p||side(p)!==s)continue;
  const t=p.toLowerCase(),x=file(a),y=row(a);
  if(t==='p'){
   const d=s==='w'?-1:1,yy=y+d,pr=yy===(s==='w'?0:7)?['q','r','b','n']:[null];
   if(on(x,yy)&&!b[ix(x,yy)]){
    for(const promotion of pr)add(a,ix(x,yy),promotion);
    if(y===(s==='w'?6:1)&&!b[ix(x,y+2*d)])add(a,ix(x,y+2*d));
   }
   for(const dx of [-1,1])if(on(x+dx,yy)){
    const z=ix(x+dx,yy);
    if(b[z]&&side(b[z])!==s){for(const promotion of pr)add(a,z,promotion);}
    else if(z===g.ep&&!b[z])add(a,z,null,'ep');
   }
  }else if(t==='n'){
   for(const [dx,dy] of N)if(on(x+dx,y+dy)&&side(b[ix(x+dx,y+dy)])!==s)add(a,ix(x+dx,y+dy));
  }else{
   const dirs=t==='b'?X:t==='r'?D:D.concat(X);
   for(const [dx,dy] of dirs){
    let xx=x+dx,yy=y+dy;
    while(on(xx,yy)){
     const z=ix(xx,yy);if(side(b[z])!==s)add(a,z);
     if(b[z]||t==='k')break;
     xx+=dx;yy+=dy;
    }
   }
   if(t==='k'&&!check(g,s)){
    if(s==='w'&&a===60){
     if(g.castle.includes('K')&&b[63]==='R'&&!b[61]&&!b[62]&&!attacked(g,61,'b')&&!attacked(g,62,'b'))add(60,62,null,'castle');
     if(g.castle.includes('Q')&&b[56]==='R'&&!b[59]&&!b[58]&&!b[57]&&!attacked(g,59,'b')&&!attacked(g,58,'b'))add(60,58,null,'castle');
    }
    if(s==='b'&&a===4){
     if(g.castle.includes('k')&&b[7]==='r'&&!b[5]&&!b[6]&&!attacked(g,5,'w')&&!attacked(g,6,'w'))add(4,6,null,'castle');
     if(g.castle.includes('q')&&b[0]==='r'&&!b[3]&&!b[2]&&!b[1]&&!attacked(g,3,'w')&&!attacked(g,2,'w'))add(4,2,null,'castle');
    }
   }
  }
 }
 return out;
}
function make(g,m){
 const b=g.b.slice(),p=b[m.from],captured=b[m.to],s=g.turn;
 b[m.to]=m.promo?(s==='w'?m.promo.toUpperCase():m.promo):p;b[m.from]=null;
 if(m.kind==='ep')b[m.to+(s==='w'?8:-8)]=null;
 if(m.kind==='castle'){const rook=m.to===62?[63,61]:m.to===58?[56,59]:m.to===6?[7,5]:[0,3];b[rook[1]]=b[rook[0]];b[rook[0]]=null;}
 let castle=g.castle;
 if(p==='K')castle=castle.replace(/[KQ]/g,'');
 if(p==='k')castle=castle.replace(/[kq]/g,'');
 for(const [z,r] of [[63,'K'],[56,'Q'],[7,'k'],[0,'q']])if(z===m.from||z===m.to)castle=castle.replace(r,'');
 const ep=p.toLowerCase()==='p'&&Math.abs(m.from-m.to)===16?(m.to+m.from)/2:-1;
 return{b,turn:other(s),castle,ep,half:p.toLowerCase()==='p'||captured||m.kind==='ep'?0:g.half+1,full:g.full+(s==='b'?1:0)};
}
function legal(g){return pseudo(g).filter(m=>!check(make(g,m),g.turn));}
function status(g){
 const opts=legal(g),inDanger=check(g,g.turn);
 if(!opts.length)return{over:true,reason:inDanger?'mate':'stalemate',winner:inDanger?other(g.turn):null,check:inDanger};
 if(g.half>=100)return{over:true,reason:'fifty',winner:null,check:inDanger};
 const material=g.b.filter(Boolean),others=material.filter(p=>!['k','K'].includes(p));
 if(!others.length||(others.length===1&&'bBnN'.includes(others[0])))
  return{over:true,reason:'insufficient',winner:null,check:inDanger};
 return{over:false,reason:inDanger?'check':'playing',winner:null,check:inDanger};
}
function evalBoard(g){
 let n=0;for(let i=0;i<64;i++){const p=g.b[i];if(!p)continue;
 const t=p.toLowerCase(),cx=3.5-Math.abs(file(i)-3.5),cy=3.5-Math.abs(row(i)-3.5);
 n+=(side(p)==='b'?1:-1)*(V[t]+(t==='b'||t==='n'?7:2)*(cx+cy)+(t==='p'?4*(side(p)==='w'?6-row(i):row(i)-1):0));
 }return n;
}
function ai(g,depth=2){
 const opts=legal(g);if(!opts.length)return null;
 let nodes=0;const limit=depth>=3?25000:5000;
 const priority=(pos,m)=>(pos.b[m.to]?V[pos.b[m.to].toLowerCase()]:0)+(m.promo?800:0);
 function search(pos,n,alpha,beta){
  nodes++;if(n===0||nodes>limit)return evalBoard(pos);
  const list=legal(pos);if(!list.length)return check(pos,pos.turn)?(pos.turn==='w'?200000:-200000):0;
  list.sort((a,b)=>priority(pos,b)-priority(pos,a));
  let best=pos.turn==='b'?-Infinity:Infinity;
  for(const m of list){
   const v=search(make(pos,m),n-1,alpha,beta);
   if(pos.turn==='b'){best=Math.max(best,v);alpha=Math.max(alpha,best);}else{best=Math.min(best,v);beta=Math.min(beta,best);}
   if(alpha>=beta||nodes>limit)break;
  }
  return best;
 }
 opts.sort((a,b)=>priority(g,b)-priority(g,a));
 let best=opts[0],v=g.turn==='b'?-Infinity:Infinity;
 for(const m of opts){
  const score=search(make(g,m),Math.max(0,depth-1),-Infinity,Infinity)+(Math.random()-.5)*(depth===1?35:3);
  if(g.turn==='b'?score>v:score<v){best=m;v=score;}
 }
 return best;
}
root.ChessEngine=Object.freeze({start,legal,make,check,status,ai,side,name,evalBoard});
})(typeof window!=='undefined'?window:globalThis);
