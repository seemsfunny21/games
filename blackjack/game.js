(()=>{const {el,btn,shuffle,card}=G;let s;const P=G.progress(startRound);const SUITS=["♠","♥","♦","♣"];function make(stage=P.stage,difficulty=P.difficulty){
 for(let attempt=1;attempt<=1200;attempt++){
  const candidate=G.shuffleStage(Array.from({length:52},(_,i)=>({v:i%13+1,s:SUITS[Math.floor(i/13)]})),"blackjack-"+attempt,stage,difficulty);
  const hits=winningHits(candidate,difficulty);
  const minimum=hits[0];
  const valid=difficulty==="easy"?minimum<=1:difficulty==="normal"?minimum>=1&&minimum<=2:minimum>=(stage<=10?2:3)&&minimum<=5;
  if(hits.length&&valid)return candidate;
 }
 throw Error("Could not construct a playable Blackjack deal for "+difficulty+"/"+stage);
}
window.BlackjackLevels={deck:make};
function winningHits(deck,difficulty){
 const remain=deck.slice(),player=[remain.pop(),remain.pop()],dealer=[remain.pop(),remain.pop()],wins=[];
 for(let hits=0;hits<=7;hits++){
  const total=value(player);if(total>21)break;
  const shoe=remain.slice(),house=dealer.slice();
  while(value(house)<({easy:16,normal:17,hard:17}[difficulty]))house.push(shoe.pop());
  if(value(house)>21||total>value(house))wins.push(hits);
  if(total===21)break;
  player.push(remain.pop());
 }
 return wins;
}
window.BlackjackLevels.winningHits=winningHits;function value(cards){let v=cards.reduce((n,c)=>n+(c.v===1?11:Math.min(c.v,10)),0),aces=cards.filter(c=>c.v===1).length;while(v>21&&aces){v-=10;aces--;}return v;}const rank=n=>n===1?"A":n===11?"J":n===12?"Q":n===13?"K":String(n);
function startRound(){if(!s)s={wins:0,losses:0,ties:0};s.deck=make();s.player=[s.deck.pop(),s.deck.pop()];s.dealer=[s.deck.pop(),s.deck.pop()];s.phase="play";s.result="";if(value(s.player)===21)stand();else finish();}
function finish(){G.store("round",s);render()}
function hit(){if(s.phase!=="play")return;s.player.push(s.deck.pop());if(value(s.player)>21){s.phase="end";s.result="Κάηκες!";s.losses++;}else if(value(s.player)===21){stand();return;}finish();}
function stand(){if(s.phase!=="play")return;const dealerLimit={easy:16,normal:17,hard:17}[P.difficulty];while(value(s.dealer)<dealerLimit)s.dealer.push(s.deck.pop());const p=value(s.player),d=value(s.dealer);s.result=d>21||p>d?"Κέρδισες!":p===d?"Ισοπαλία":"Κέρδισε ο dealer";if(d>21||p>d)s.wins++;else if(p===d)s.ties++;else s.losses++;s.phase="end";finish();if(s.result==="Κέρδισες!")P.win();}
function hand(label,cards,hide){const part=el("section");part.style.textAlign="center";part.append(el("h3","",label+" · "+(hide?"?":value(cards))));const row=el("div","cards-row");for(let i=0;i<cards.length;i++){if(hide&&i===1){row.append(el("div","playing-card back","★"));continue;}row.append(card(rank(cards[i].v),cards[i].s));}part.appendChild(row);return part;}
function render(){G.score("Νίκες: "+s.wins+" · Ήττες: "+s.losses+" · Ισοπαλίες: "+s.ties);G.ctrl(btn("↻ Νέα παρτίδα",startRound));const root=el("div");root.style.cssText="display:flex;flex-direction:column;gap:10px;align-items:center;padding:5px";root.append(hand("Dealer",s.dealer,s.phase==="play"),hand("Τα φύλλα σου",s.player,false));const actions=el("div","group blackjack-hand-actions");const hitButton=btn("Ακόμη φύλλο",hit,"secondary"),standButton=btn("Σταμάτα",stand,"secondary");hitButton.disabled=standButton.disabled=s.phase!=="play";actions.append(hitButton,standButton);root.append(actions);G.render(root);G.msg(s.phase==="end"?s.result:"Στόχος: έως 21, χωρίς να το ξεπεράσεις. Δεν υπάρχουν πραγματικά χρήματα.");}
s=G.load("round");if(!s?.player)startRound();else render();})();