'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const E = require('../src/arcade-party-expedition-v43.js');

function storage() {
  const items = new Map();
  return {getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value)};
}
const baseline = {droneDamage:1, archerDamage:1, archonCooldown:1, wardCapacity:0, powerCharge:1, reformTime:1, evadeSeconds:0};

test('expedition drafts offer upgrades for the deployed wing and keep the drawn choices after a swap', () => {
  const ledger = E.open('campaign',storage());
  const lineup = ['archer','archon','angel'];
  const offered = new Set();
  for (let seed=1;seed<=24;seed++) {
    const run = ledger.start({seed, difficulty:'hell'});
    const stop = ledger.clear(run.id,1,null,lineup);
    for (const id of stop.offers) {
      assert.notEqual(E.cards[id].role,'drone');
      offered.add(id);
    }
    assert.deepEqual(ledger.clear(run.id,1,null,['drone','angel','archon']).offers,stop.offers);
    if (stop.offers.includes('archer-string')) {
      const next = ledger.choose(run.id,1,'archer-string');
      assert.equal(E.effects(next).archerDamage,1.12);
    }
  }
  assert(offered.has('archer-string'));
});

test('a single clear yields three stat families, and the saved highlight survives without granting a boon', () => {
  const data = storage(), a = E.open('trial', data);
  const run = a.start({startStage:40, endStage:42, seed:42, hero:'seoha', difficulty:'gentle', auto:true});
  const carry = {lives:2, bombs:0, union:true, fragments:2, allyWounds:[0,2,0]};
  let stop = a.clear(run.id,40,carry);
  assert.equal(stop.status, 'rest');
  assert.equal(new Set(stop.offers.map(id => E.cards[id].stat)).size,3);
  assert(stop.offers.every(id => !E.cards[id].temporary));
  assert.deepEqual(E.effects(stop), baseline);
  assert.equal(a.choose(run.id,40).stage, 40);
  const choice = stop.offers[1];
  a.select(run.id, 40, choice);
  const b = E.open('trial',data);
  stop = b.clear(run.id,40,{lives:3,bombs:9});
  assert.equal(stop.selected, choice);
  assert.deepEqual(stop.carry,carry);
  assert.deepEqual(E.effects(stop), baseline);
  assert.deepEqual(b.checkpoint(run.id,40,{lives:9}).carry,carry);
  const next = b.choose(run.id,40);
  assert.equal(next.stage,41);
  assert.equal(next.status,'battle');
  assert.equal(next.selected,null);
  assert.equal(next.auto,true);
  assert.equal(next.hero,'seoha');
  assert.equal(E.rank(next,choice),1);
  const card = E.cards[choice];
  assert.equal(E.effects(next)[card.stat], Number((baseline[card.stat]+card.amount).toFixed(2)));
  assert.deepEqual(next.carry,carry);
  assert.deepEqual(a.choose(run.id,40,stop.offers[0]),next);
  assert.deepEqual(b.clear(run.id,40),next);
  const gone = b.lose(run.id,41);
  assert.equal(gone.status,'lost');
  assert.deepEqual(E.effects(gone),baseline);
  assert.deepEqual(a.clear(run.id,41),gone);
});

test('stage checkpoint persists and a same-seed new run has independent identity and rewards', () => {
  const data=storage(), c=E.open('campaign',data), t=E.open('trial',data);
  const first=c.start({seed:1454, endStage:3});
  const snap={lives:1, bombs:2, party:{allies:[{kind:'angel', health:1}]}};
  c.checkpoint(first.id,1,snap);
  snap.party.allies[0].health=9;
  assert.equal(E.open('campaign',data).read().carry.party.allies[0].health,1);
  assert.equal(t.read(),null);
  const original=c.clear(first.id,1);
  c.choose(first.id,1,original.offers[0]);
  const second=c.start({seed:1454,endStage:3});
  assert.notEqual(second.id,first.id);
  assert.deepEqual(c.lose(first.id,2),second);
  assert.equal(second.carry,null);
  assert.deepEqual(E.effects(second),baseline);
  assert.deepEqual(c.clear(second.id,1).offers,original.offers);
  const other=t.start({endStage:1});
  assert.equal(t.clear(other.id,1).status,'won');
  assert.equal(c.read().status,'rest');
  assert(!Object.keys(E.keys).some(k=>E.keys[k]==='hapil.ai-party.campaign.v1'));
});

test('52 stages support a distinct useful draft at every stop, cap permanent stacks and expire supplies', () => {
  const c=E.open('campaign',storage());
  let state=c.start({seed:1234});
  const lateSets=new Set(), ranks={};
  let usedSupplies=0;
  for(let stage=1;stage<=52;stage++){
    state=c.clear(state.id,stage);
    if(stage===52){
      assert.equal(state.status,'won');assert.deepEqual(state.offers,[]);break;
    }
    const opts=state.offers.map(id=>E.cards[id]);
    assert.equal(opts.length,3);
    assert.equal(new Set(opts.map(card=>card.stat)).size,3);
    assert(opts.every(card=>card.temporary || E.rank(state,card.id)<card.maxRank));
    if(stage>30)lateSets.add([...state.offers].sort().join(','));
    const card=opts.find(o=>!o.temporary)||opts[0];
    state=c.choose(state.id,stage,card.id);
    if(card.temporary)usedSupplies++;
    else ranks[card.id]=(ranks[card.id]||0)+1;
    const expected={...baseline};
    for(const [id,n] of Object.entries(ranks))expected[E.cards[id].stat]+=E.cards[id].amount*n;
    if(card.temporary)expected[card.stat]+=card.amount;
    for(const stat of Object.keys(expected))expected[stat]=Number(expected[stat].toFixed(2));
    assert.deepEqual(E.effects(state),expected);
  }
  assert.equal(state.picks.length,51);
  assert(usedSupplies>20);assert(lateSets.size>1);
  assert.deepEqual(E.effects(state),baseline);
  assert.deepEqual(c.clear(state.id,52),state);
});

test('invalid actions do not damage the run and blocked storage keeps the session playable', () => {
  assert.throws(()=>E.open('__proto__'));
  const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  const c=E.open('campaign',broken);
  assert.throws(()=>c.start({startStage:2,endStage:1}));
  const start=c.start({seed:4,endStage:3});
  assert.deepEqual(E.open('campaign',broken).read(),start);
  assert.throws(()=>c.checkpoint(start.id,1,{extra:'x'.repeat(40000)}));
  assert.deepEqual(c.read(),start);
  const stop=c.clear(start.id,1,{bombs:0});
  assert.deepEqual(c.choose(start.id,1,'__proto__'),stop);
  const other=E.open('campaign',storage());
  assert.equal(other.read(),null);
});

test('redraft spends one token per expedition and replaces a stored selection without granting it', () => {
  const data=storage(), a=E.open('campaign',data), b=E.open('campaign',data);
  const deployed=['angel','archer','archon'];
  const run=a.start({seed:21,endStage:4});
  assert.equal(E.redraftsLeft(run),1);
  assert.deepEqual(a.redraft(run.id,1),run);
  const first=a.clear(run.id,1,null,deployed);
  a.select(run.id,1,first.offers[1]);
  const second=b.redraft(run.id,1);
  assert.equal(E.redraftsLeft(second),0);
  assert.equal(second.selected,null);assert.deepEqual(second.picks,[]);
  assert(second.offers.every(id=>!first.offers.includes(id)&&E.cards[id].role!=='drone'));
  assert.equal(new Set(second.offers.map(id=>E.cards[id].stat)).size,3);
  assert.deepEqual(a.redraft(run.id,1),second);
  assert.deepEqual(a.choose(run.id,1,first.offers[1]),second);
  assert.deepEqual(E.open('campaign',data).read(),second);
  a.choose(run.id,1,second.offers[0]);
  const later=a.clear(run.id,2,null,['drone','archer','archon']);
  assert.deepEqual(b.redraft(run.id,2),later);
  const next=b.start({seed:21,endStage:4});
  b.clear(next.id,1,null,deployed);
  assert.deepEqual(b.redraft(next.id,1).offers,second.offers);
  assert.deepEqual(a.redraft(run.id,2),b.read());
});

test('redraft finds three other distinct supply cards even when the active party has maxed every permanent boon', () => {
  const c=E.open('campaign',storage()), deployed=['drone','archer','angel'];
  let run=c.start({seed:36});
  for(let i=1;i<=40;i++){
    run=c.clear(run.id,i,null,deployed);
    const choice=run.offers.find(id=>!E.cards[id].temporary)||run.offers[0];
    c.choose(run.id,i,choice);
  }
  const stop=c.clear(run.id,41,null,deployed);
  assert(stop.offers.every(id=>E.cards[id].temporary));
  const next=c.redraft(run.id,41);
  assert.equal(E.redraftsLeft(next),0);
  assert(next.offers.every(id=>!stop.offers.includes(id)&&E.cards[id].temporary&&E.cards[id].role!=='archon'));
  assert.equal(new Set(next.offers.map(id=>E.cards[id].stat)).size,3);
});

test('a deployed v1 rest save retains its offers, earned boons and highlight on upgrade',()=>{
  const s=storage(), c=E.open('campaign',s), kinds=['archon','archer','angel'];
  const r=c.start({seed:9});
  const first=c.clear(r.id,1,null,kinds);
  c.choose(r.id,1,first.offers[0]);
  const carry={party:{allies:kinds.map(kind=>({kind})).concat({kind:'drone'})},lives:2};
  let old=c.clear(r.id,2,carry,kinds);
  old=c.select(r.id,2,old.offers[1]);
  delete old.deployed;delete old.rerollsLeft;
  s.setItem(E.keys.campaign,JSON.stringify(old));
  const restored=E.open('campaign',s);
  assert.deepEqual(restored.read(),old);
  assert.equal(E.redraftsLeft(restored.read()),1);
  const upgraded=restored.redraft(r.id,2);
  assert.equal(upgraded.rerollsLeft,0);assert.equal(upgraded.selected,null);
  assert.deepEqual(upgraded.carry,carry);assert.deepEqual(upgraded.picks,old.picks);
  assert.deepEqual(new Set(upgraded.deployed),new Set(kinds));
  assert(upgraded.offers.every(id=>!old.offers.includes(id)&&E.cards[id].role!=='drone'));
  assert.equal(E.open('trial',s).read(),null);
});

test('resonance previews the highlighted permanent role card and activates only on a supplied stage in the same run',()=>{
  const ledger=E.open('campaign',storage()), supplied=[{kind:'drone',slot:'wing',supply:1}];
  let run,stop;
  for(let seed=0;seed<100;seed++){
    run=ledger.start({seed});
    stop=ledger.clear(run.id,1);
    if(stop.offers.includes('drone-coil'))break;
  }
  assert(stop.offers.includes('drone-coil'));
  const expected={kind:'drone',stat:'droneDamage',amount:.12,cardId:'drone-coil'};
  assert.deepEqual(E.resonance(stop,supplied,'drone-coil'),expected);
  assert.equal(E.resonance(stop,[{kind:'archer',slot:'rear',supply:1}],'archer-string'),null);
  assert.equal(E.resonance(stop,supplied),null);
  assert.equal(E.effects(stop,supplied).droneDamage,1);
  const launched=ledger.choose(run.id,1,'drone-coil');
  for(const level of [1,2,3]){
    const config=[{kind:'drone',slot:'wing',supply:level}];
    assert.deepEqual(E.resonance(launched,config),expected);
    assert.equal(E.effects(launched,config).droneDamage,1.24);
  }
  assert.equal(E.effects(launched,[{kind:'drone',slot:'bench',supply:3}]).droneDamage,1.12);
  assert.equal(E.effects(launched,[{kind:'drone',slot:'wing',supply:0}]).droneDamage,1.12);
  assert.equal(E.resonance(ledger.lose(run.id,2),supplied),null);
  assert.equal(E.resonance(ledger.start({seed:42}),supplied),null);
});
