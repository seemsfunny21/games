'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Sudoku=require('../sudokufunny/sudoku-engine.js');
const Reversi=require('../reversifunny/engine.js');

assert.deepEqual(Object.keys(Sudoku.LEVELS),['easy','medium','hard','expert']);
for(const difficulty of Object.keys(Sudoku.LEVELS)){
 const unique=new Set();
 for(let i=0;i<5;i++){
  const puzzle=Sudoku.generate(difficulty);
  assert.equal(puzzle.puzzle.length,81);
  assert.equal(puzzle.solution.length,81);
  assert.ok(puzzle.puzzle.every((value,index)=>!value||value===puzzle.solution[index]));
  assert.equal(Sudoku.countSolutions(puzzle.puzzle,2),1,'Sudoku has exactly one solution');
  assert.equal(Sudoku.countSolutions(puzzle.solution,2),1,'Sudoku final grid is valid');
  assert.ok(puzzle.clues>=Sudoku.LEVELS[difficulty].clues,'Enough given clues');
  unique.add(puzzle.puzzle.join(''));
 }
 assert.equal(unique.size,5,'Five different generated Sudoku boards for '+difficulty);
 console.log('PASS Sudoku '+difficulty+' unique solvable boards');
}

const first=Reversi.initial();
assert.deepEqual(Reversi.score(first),{black:2,white:2,empty:60});
assert.deepEqual(Reversi.legal(first,1).map(x=>x.index),[19,26,37,44]);
for(const difficulty of ['easy','medium','hard']){
 const legal=Reversi.legal(first,1).map(x=>x.index);
 const move=Reversi.chooseMove(first,1,difficulty,()=>.38);
 assert.ok(legal.includes(move),'Reversi AI move must be legal: '+difficulty);
}
for(let game=0;game<24;game++){
 let board=Reversi.initial(),player=1,moves=0;
 while(moves<61){
  const options=Reversi.legal(board,player);
  if(!options.length){const info=Reversi.nextTurn(board,3-player);if(info.over)break;player=3-player;continue;}
  const target=options[(game*3+moves*7)%options.length].index;
  const next=Reversi.apply(board,player,target);
  assert.ok(next&&Reversi.valid(next),'Reversi only applies legal moves');
  const score=Reversi.score(next);
  assert.equal(score.empty,60-moves-1,'Each Reversi turn adds one disc');
  board=next;moves++;
  const info=Reversi.nextTurn(board,player);
  if(info.over)break;
  player=info.turn;
 }
 const total=Reversi.score(board);assert.equal(total.black+total.white+total.empty,64);
}
console.log('PASS Reversi three difficulties, 24 legal complete/near-complete simulations');

const sandbox={window:{}},code=fs.readFileSync(path.join(__dirname,'../quizfunny/questions.js'),'utf8');
vm.runInNewContext(code,sandbox,{timeout:1000});
const bank=sandbox.window.QUIZ_QUESTIONS;
assert.ok(Array.isArray(bank)&&bank.length>=120,'Quiz needs at least 120 questions');
const ids=new Set(),phrases=new Set();
for(const q of bank){
 assert.ok(Number.isInteger(q.id)&&!ids.has(q.id),'Unique Quiz ID');
 assert.ok(typeof q.q==='string'&&q.q.length>8,'Full Quiz prompt');
 assert.ok(!phrases.has(q.q),'No repeated Quiz questions');
 assert.ok(Array.isArray(q.options)&&q.options.length===4,'Quiz has four answer choices');
 assert.equal(new Set(q.options).size,4,'Quiz alternatives must differ');
 assert.ok(q.correct>=0&&q.correct<4,'Quiz correct index valid');
 assert.ok(q.level>=1&&q.level<=15,'Quiz level between one and 15');
 ids.add(q.id);phrases.add(q.q);
}
for(let stage=1;stage<=15;stage++)
 assert.ok(bank.filter(q=>q.level===stage).length>=8,'Each Quiz level offers 8 or more choices');
console.log('PASS '+bank.length+' Quiz questions, 15 difficulty levels, unique IDs and answers');