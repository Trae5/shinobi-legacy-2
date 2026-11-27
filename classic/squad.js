/* ============================================================
   Shinobi Legacy: Remastered - AI Squad, D-S Missions, Chunin Exams
   Squad generation + persistence (2 teammates + sensei), bonding,
   the daily mission board (D through S), turn-based squad battles,
   the chunin exam and rank progression.
   Loaded from academy.js. Depends on phase1.js helpers + CSS.
   ============================================================ */
import { hh, $q, toast, pLv, pName, fmtN, clampN, rnd, pick, CSS } from "./phase1.js?v=p1135";

const C = () => window.__SL2academyCtx || null;
const prof = () => (window.SL && window.SL.profile) || null;

/* ---------- flavor pools ---------- */
const FIRST_M = ["Daichi","Kenji","Ryo","Haru","Takumi","Sora","Kaito","Renji","Genji","Izaru","Shinji","Toru","Yasuo","Kohei","Bandou"];
const FIRST_F = ["Aiko","Hana","Suzu","Kaede","Mio","Rina","Ayame","Nanami","Tsubaki","Mei","Kirie","Sana","Rika","Tsukino","Emi"];
const SURNAMES = ["Kurogane","Amagiri","Hoshino","Tsukikage","Aokaze","Ryuzaki","Kazama","Shirai","Uzuki","Kagami","Fubuki","Mizushima","Takeda","Iwasaki","Konoe"];
const CLANS = {
  leaf:   ["Sarutobi","Yamanaka","Akimichi","Nara","Inuzuka","Aburame","Hyuga"],
  sand:   ["Sabaku","Fuyutsuki","Kazamatsuri","Isamu"],
  mist:   ["Momochi","Hoshigaki","Kaguya","Shirogane"],
  cloud:  ["Yotsuki","Kaminari","Raiga","Amatori"],
  stone:  ["Kamizuru","Ishikawa","Tsuchi","Ganzo"]
};
const VILLAGE_CLAN_FALLBACK = ["Kurogane","Amagiri","Hoshino","Tsukikage"];

const ARCHETYPES = [
  { id:"brawler",   name:"Brawler",   blurb:"Front-line heavy hitter. Loves a scrap, never leaves your side." },
  { id:"duelist",   name:"Duelist",   blurb:"Precision strikes that occasionally land twice." },
  { id:"tracker",   name:"Tracker",   blurb:"Reads the field and calls out enemy openings." },
  { id:"medic",     name:"Medic",     blurb:"Keeps the squad standing with field medicine." },
  { id:"tactician", name:"Tactician", blurb:"Wears enemies down before they wear you down." },
  { id:"support",   name:"Support",   blurb:"Lifts the whole squad's resolve mid-fight." }
];
const SENSEI_LINES = [
  "Drills basics until they are reflexes. Accepts no shortcuts.",
  "Quiet, watchful, and always three steps ahead of the mission.",
  "Believes squads are built in the field, not in the classroom.",
  "Fierce about protecting the squad. Fiercer about the mission.",
  "Laughs easy, fights hard, and never wastes a ration.",
  "Old-school jonin. Every mistake is a lesson, every win a debt."
];
const HAIR_C = ["#16161c","#5a3a26","#7a5234","#2b2b33","#8a6a3a","#3a3a44","#a8352f","#e8e4da"];
const OUT_C  = ["#2b3a55","#3c4a63","#4a3a55","#3a4a55","#243a4a","#46324a","#33503f"];
const SKIN_C = ["#e8c7a6","#d9b08c","#c99b74","#f0d6bb"];

/* ---------- mission ranks ---------- */
const RANK_DEF = [
  { rank:"D", minBond:0,  minLv:1,  ryo:[60,110],   enemies:[1,2], lvOff:-1, xp:30,  tag:"Chores and errands with teeth" },
  { rank:"C", minBond:25, minLv:1,  ryo:[130,190],  enemies:[1,3], lvOff:0,  xp:60,  tag:"Real work outside the walls" },
  { rank:"B", minBond:45, minLv:4,  ryo:[260,360],  enemies:[2,3], lvOff:1,  xp:120, tag:"Confirmed hostile contacts" },
  { rank:"A", minBond:60, minLv:7,  ryo:[480,680],  enemies:[2,4], lvOff:2,  xp:220, tag:"Journeyman risk. Jonin sign-off" },
  { rank:"S", minBond:78, minLv:11, ryo:[950,1500], enemies:[3,4], lvOff:3,  xp:400, tag:"Village-secret. Do not die" }
];
const TITLES = {
  D: ["Find the merchant's missing cart","Clear cats from the granary","Weed the herb gardens of the hospital quarter","Deliver sealed letters to the gate watch","Repair the training dummies on the north field"],
  C: ["Escort a merchant caravan to the border post","Rogue genin sighting near the river","Pest control in the eastern farms","Guard the survey crew for a week","Retrieve a stolen ledger from the toll house"],
  B: ["Bandit camp at the old quarry","Ambush on the trade road","Hunt the deserter chunin","Raid on a frontier outpost","Track the smugglers' night convoy"],
  A: ["Missing-nin with a bounty on their head","Saboteurs inside the village walls","Escort a diplomat through contested land","Storm the rebel hideout at Kurogane Pass","Recover the stolen village scroll"],
  S: ["Assassination order on a rogue jonin","Coup attempt in a client village","The beast that emptied three towns","Infiltrate the enemy stronghold alone","Stop the forbidden ritual at the shrine"]
};
const ENEMY_KINDS = ["Rogue Genin","Bandit Scout","Missing-nin","Brigand Archer","Deserter Chunin","Mercenary Blade","Highway Ronin","Smuggler Enforcer"];
const ENEMY_LEADS = ["Vex the Cleaver","Dosu Maru","Kagemaru","The Red Sash","Ronin Gasho","Fang of the Marsh","Kuroba","The Ledger Thief"];

/* ---------- chunin written pool ---------- */
const CHUNIN_Q = [
  { q:"A squad is pinned by archers on high ground. Best call?", o:["Smoke, split, flank from two sides","Charge straight up the hill","All three hide behind one rock","Scream for reinforcements and wait"], a:0 },
  { q:"Your teammate panics mid-fight. You…", o:["Bark one clear order and cover them","Leave them and finish the job","Freeze and wait for the sensei","Throw them at the enemy"], a:0 },
  { q:"The mission says 'no witnesses'. You interpret that as…", o:["Avoid being seen at all","Silence everyone who looks at you","Only silence enemy shinobi","Ignore it, it's ceremonial"], a:0 },
  { q:"Best time to break off a losing fight?", o:["When the objective is no longer worth the cost","Never","When one squadmate falls","When you run out of shuriken"], a:0 },
  { q:"A chunin's first duty on a joint mission is…", o:["The mission's success and the squad's survival","Personal glory","Collecting the largest bounty","Proving the sensei wrong"], a:0 },
  { q:"Enemy numbers: four to your three, better ground. You…", o:["Deny them the ground advantage first","Spread out wide and thin","Send one to negotiate","All attack the strongest"], a:0 },
  { q:"Rations for three days, squad of four. You…", o:["Split evenly, sensei takes least","Sensei eats first, always","Fight for your share","Skip rations entirely"], a:0 },
  { q:"A genin under you freezes in real combat. Afterwards you…", o:["Debrief calmly and drill it again","Demote them on the spot","Never speak of it","Report them for cowardice immediately"], a:0 },
  { q:"Intel says the target is left-handed. You…", o:["Assume nothing, verify in the field","Tell everyone, always trust intel","Ignore intel entirely","Attack from the left only"], a:0 },
  { q:"The extraction window closes in ten minutes. Two objectives remain.", o:["Secure the primary, mark the rest","Split the squad to do both","Do neither and hide","Attempt both alone, in order"], a:0 }
];

/* ---------- rank display ---------- */
function rankText(a) {
  const lv = pLv();
  if (!a.exam.passed) return "Academy Student";
  if (!a.chunin.passed) return "Genin";
  const R = [["Chunin",6],["Jonin",10],["Special Jonin",14],["ANBU",18],["Kage-level",25]];
  let r = "Chunin";
  for (const [n,m] of R) if (lv >= m) r = n;
  return r;
}

/* ---------- squad generation ---------- */
function apFor(sex, headband) {
  return {
    body: sex ? "female" : "male",
    hairstyle: pick(["short","spiky","ponytail","messy"]),
    hair: pick(HAIR_C), eyes: "#2b2b33", outfit: pick(OUT_C),
    headband: headband || "forehead", skin: pick(SKIN_C),
    build: pick(["lean","slim","sturdy","athletic"])
  };
}
function genSquad(a) {
  if (a.squad.generated) return a.squad;
  const p = prof();
  const vid = (p && (p.at || p.village)) || "leaf";
  const pool = CLANS[vid] || VILLAGE_CLAN_FALLBACK;
  const lv = Math.max(1, pLv());
  const used = new Set();
  const mkName = () => { let n; do { n = pick(SURNAMES) + " " + pick(Math.random() < 0.5 ? FIRST_F : FIRST_M); } while (used.has(n)); used.add(n); return n; };
  const mkMember = () => {
    const female = Math.random() < 0.5;
    const arch = pick(ARCHETYPES);
    return {
      name: mkName(),
      ap: apFor(female, "forehead"),
      clan: pick(pool),
      nature: pick(C().NATURES),
      archetype: arch.name,
      blurb: arch.blurb,
      level: clampN(lv + ((Math.random()*3|0) - 1), 1, 99),
      xp: 0, bond: 15 + (Math.random()*11|0),
      memories: ["Day one - squad assigned by the " + (C().VILLAGE_FULL[vid] || vid) + " council."]
    };
  };
  const femaleS = Math.random() < 0.5;
  a.squad = {
    generated: true,
    number: "Squad " + (2 + (Math.random()*97|0)),
    members: [mkMember(), mkMember()],
    sensei: {
      name: mkName(),
      ap: apFor(femaleS, "forehead"),
      clan: pick(pool),
      nature: pick(C().NATURES),
      personality: pick(SENSEI_LINES),
      level: clampN(lv + 6, 3, 99), xp: 0, bond: 30,
      memories: ["Took the squad the day they graduated."]
    }
  };
  C().aSave();
  return a.squad;
}
function avgBond(a) {
  const s = a.squad;
  if (!s || !s.members || !s.members.length) return 0;
  let t = s.sensei ? (s.sensei.bond || 0) : 0, n = s.members.length + (s.sensei ? 1 : 0);
  for (const m of s.members) t += (m.bond || 0);
  return Math.round(t / Math.max(1, n));
}
function memberXpNeed(m) { return Math.max(60, (m.level || 1) * 100); }

/* ---------- mission board ---------- */
function buildBoard(a) {
  const b = avgBond(a), lv = pLv();
  const pool = RANK_DEF.filter(r => b >= r.minBond && lv >= r.minLv);
  const out = [];
  const ranks = [];
  ranks.push("D", "D", "C");
  if (pool.some(r => r.rank === "B")) ranks.push("B");
  if (pool.some(r => r.rank === "A")) ranks.push("A");
  if (pool.some(r => r.rank === "S") && Math.random() < 0.35) ranks.push("S");
  for (const rk of ranks) {
    const def = RANK_DEF.find(r => r.rank === rk);
    const nEn = def.enemies[0] + (Math.random() * (def.enemies[1] - def.enemies[0] + 1) | 0);
    const lv0 = Math.max(1, lv + def.lvOff);
    const enemies = [];
    const lead = def.rank !== "D" && Math.random() < 0.6;
    for (let i = 0; i < nEn; i++) enemies.push({ name: (i === 0 && lead) ? pick(ENEMY_LEADS) : pick(ENEMY_KINDS), lv: lv0 + (i === 0 && lead ? 1 : 0) });
    out.push({
      id: "m" + Date.now().toString(36) + (out.length),
      rank: rk, title: pick(TITLES[rk]), tag: def.tag,
      enemies, ryo: def.ryo[0] + (Math.random() * (def.ryo[1] - def.ryo[0]) | 0), xp: def.xp
    });
  }
  return out;
}
function ensureBoard(a) {
  const now = Date.now();
  if (!a.missions.board || !a.missions.board.length || now - (a.missions.refreshedAt || 0) > 20 * 3600 * 1000) {
    a.missions.board = buildBoard(a);
    a.missions.refreshedAt = now;
    C().aSave();
  }
}

/* ---------- battle engine (turn-based, overlay) ---------- */
let BTL = null;
function battleOverlay() {
  let ov = $q("#sqadOv");
  if (ov) ov.remove();
  ov = hh("div", { id: "sqadOv", class: "sqadOv", role: "dialog", "aria-label": "Squad battle" },
    hh("div", { class: "sqadCard" },
      hh("div", { class: "sqadHead" }, hh("b", { id: "sqadTitle" }, ""), hh("button", { class: "sqadX", "aria-label": "Close", onclick: () => closeBattle(true) }, "\u00d7")),
      hh("div", { id: "sqadBody" })));
  document.body.append(ov);
  return ov;
}
function closeBattle(force) {
  if (BTL && !force && !BTL.over) return;
  const ov = $q("#sqadOv"); if (ov) ov.remove();
  BTL = null;
}
function bar(label, cur, max, cls) {
  const pct = clampN(Math.round(100 * Math.max(0, cur) / Math.max(1, max)), 0, 100);
  return hh("div", { class: "sqadBar" },
    hh("span", { class: "sqadBarL" }, label),
    hh("div", { class: "sqadBarT" }, hh("div", { class: "sqadBarF " + (cls || ""), style: { width: pct + "%" } })),
    hh("span", { class: "sqadBarV" }, Math.max(0, Math.round(cur)) + " / " + Math.round(max)));
}
function logAdd(html, cls) { if (BTL) { BTL.log.push({ html, cls }); if (BTL.log.length > 60) BTL.log.shift(); } }
function aliveEnemies() { return BTL.enemies.filter(e => e.hp > 0); }
function pickEnemy() { const es = aliveEnemies(); return es.length ? es.reduce((a, b) => (a.hp <= b.hp ? a : b)) : null; }
function dmgOf(base) { return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3))); }

function startMission(m, a) {
  if (BTL) return;
  const p = prof(), lv = pLv();
  const sq = a.squad;
  battleOverlay();
  BTL = {
    kind: "mission", mission: m, acd: a,
    pmax: Math.max(60, (p && p.hp) || 120), php: Math.max(60, (p && p.hp) || 120),
    pcmax: Math.max(40, (p && p.chakra) || 92), pc: Math.max(40, (p && p.chakra) || 92),
    allies: sq.members.map(mm => ({ ref: mm, name: mm.name, hp: 70 + (mm.level || 1) * 12, max: 70 + (mm.level || 1) * 12, atk: 6 + (mm.level || 1) * 2, archetype: mm.archetype, nature: mm.nature })),
    enemies: m.enemies.map(e => ({ name: e.name, lv: e.lv, hp: 55 + e.lv * 14, max: 55 + e.lv * 14, atk: 7 + e.lv * 2 })),
    turn: 1, coord: 0, cmds: 2, pills: 2, log: [], over: false
  };
  logAdd("Mission: <b>" + m.rank + "-rank</b> " + m.title + ". The squad moves out.", "dim");
  logAdd(sq.sensei.name + " (sensei) watches from overwatch.", "dim");
  paint();
}
function paint() {
  const body = $q("#sqadBody"); if (!body || !BTL) return;
  body.textContent = "";
  const t = $q("#sqadTitle");
  if (t) t.textContent = (BTL.kind === "chunin" ? BTL.stageName : "D-S Mission") + " - Turn " + BTL.turn;
  body.append(hh("div", { class: "sqadBars" },
    bar("You", BTL.php, BTL.pmax, "hp"), bar("Chakra", BTL.pc, BTL.pcmax, "ck")));
  for (const al of BTL.allies) body.append(bar(al.name + " (" + al.archetype + ")", al.hp, al.max, al.hp > 0 ? "hp" : "down"));
  body.append(hh("div", { class: "sqadSep" }));
  for (const en of BTL.enemies) if (en.hp > 0) body.append(bar(en.name + " (Lv " + en.lv + ")", en.hp, en.max, "en"));
  const logEl = hh("div", { class: "sqadLog" });
  logEl.innerHTML = BTL.log.map(l => '<div class="' + (l.cls || "") + '">' + l.html + "</div>").join("");
  body.append(logEl);
  const row = hh("div", { class: "sqadRow" });
  if (BTL.over) {
    row.append(hh("button", { class: "sqadBtn primary", onclick: () => closeBattle(true) }, "Close"));
  } else {
    row.append(hh("button", { class: "sqadBtn", onclick: actStrike }, "Strike"));
    row.append(hh("button", { class: "sqadBtn", onclick: actJutsu, disabled: BTL.pc < 14 ? true : null }, "Jutsu (14)"));
    row.append(hh("button", { class: "sqadBtn", onclick: actCommand, disabled: BTL.cmds <= 0 ? true : null }, "Coordinate (" + BTL.cmds + ")"));
    row.append(hh("button", { class: "sqadBtn", onclick: actPill, disabled: BTL.pills <= 0 ? true : null }, "Pill (" + BTL.pills + ")"));
    row.append(hh("button", { class: "sqadBtn ghost", onclick: actRetreat }, "Retreat"));
  }
  body.append(row);
}
function playerHit(base) {
  const e = pickEnemy(); if (!e) return;
  const d = dmgOf(base + (BTL.coord > 0 ? 4 : 0));
  e.hp = Math.max(0, e.hp - d);
  logAdd("You hit <b>" + e.name + "</b> for " + d + ".", "");
  if (e.hp <= 0) logAdd("<b>" + e.name + "</b> goes down.", "good");
}
function allyAct(al) {
  if (al.hp <= 0) return;
  const e = pickEnemy(); if (!e) return;
  let d = dmgOf(al.atk + (BTL.coord > 0 ? Math.round(al.atk * 0.5) : 0));
  let line = "";
  if (al.archetype === "Duelist" && Math.random() < 0.3) { const d2 = dmgOf(al.atk); d += d2; line = " A second cut lands for " + d2 + "!"; }
  if (al.archetype === "Tracker" && Math.random() < 0.35) { line = " Their opening is called out - bonus hit!"; d += dmgOf(Math.round(al.atk * 0.6)); }
  e.hp = Math.max(0, e.hp - d);
  logAdd(al.name + " strikes <b>" + e.name + "</b> for " + d + "." + line, "");
  if (e.hp <= 0) logAdd("<b>" + e.name + "</b> goes down.", "good");
  if (al.archetype === "Medic") {
    const hurt = [ { name: "You", hp: BTL.php, max: BTL.pmax, heal: (v) => { BTL.php = Math.min(BTL.pmax, v); } } ]
      .concat(BTL.allies.filter(x => x.hp > 0).map(x => ({ name: x.name, hp: x.hp, max: x.max, heal: (v) => { x.hp = Math.min(x.max, v); } })));
    const tgt = hurt.filter(h => h.hp < h.max).sort((a, b) => (a.hp / a.max) - (b.hp / b.max))[0];
    if (tgt) { const h = 10 + Math.round((al.ref.level || 1) * 2); tgt.heal(tgt.hp + h); logAdd(al.name + " patches up <b>" + tgt.name + "</b> for " + h + ".", "good"); }
  }
  if (al.archetype === "Support" && Math.random() < 0.4) { BTL.coord = Math.max(BTL.coord, 1); logAdd(al.name + " rallies the squad - coordination up!", "good"); }
  if (al.archetype === "Tactician" && Math.random() < 0.35) { e.atk = Math.max(3, e.atk - 1); logAdd(al.name + " wears <b>" + e.name + "</b> down (atk -1).", "dim"); }
}
function enemyTurn() {
  for (const e of aliveEnemies()) {
    const side = [{ name: "You", hp: () => BTL.php, hit: (d) => { BTL.php = Math.max(0, BTL.php - d); } }]
      .concat(BTL.allies.filter(x => x.hp > 0).map(x => ({ name: x.name, hp: () => x.hp, hit: (d) => { x.hp = Math.max(0, x.hp - d); } })));
    const t = side[Math.random() * side.length | 0];
    const d = dmgOf(e.atk);
    t.hit(d);
    logAdd("<b>" + e.name + "</b> hits " + t.name + " for " + d + ".", t.name === "You" ? "bad" : "");
  }
}
function checkEnd() {
  if (aliveEnemies().length === 0) { winBattle(); return true; }
  if (BTL.php <= 0) { loseBattle(); return true; }
  return false;
}
function winBattle() {
  BTL.over = true;
  if (BTL.kind === "chunin") { chuninBattleWon(); paint(); return; }
  const m = BTL.mission, a = BTL.acd;
  const p = prof();
  if (p) p.ryo = Math.max(0, Math.floor((p.ryo || 0) + m.ryo));
  const bondGain = { D: 2, C: 3, B: 4, A: 5, S: 6 }[m.rank] || 2;
  for (const al of BTL.allies) {
    const mm = al.ref;
    mm.bond = clampN((mm.bond || 0) + (al.hp > 0 ? bondGain : 1), 0, 100);
    mm.xp = (mm.xp || 0) + m.xp;
    while (mm.xp >= memberXpNeed(mm)) { mm.xp -= memberXpNeed(mm); mm.level = (mm.level || 1) + 1; logAdd("<b>" + mm.name + "</b> reached level " + mm.level + "!", "good"); }
  }
  if (a.squad.sensei) a.squad.sensei.bond = clampN((a.squad.sensei.bond || 0) + 2, 0, 100);
  a.missions.done = (a.missions.done || 0) + 1;
  const order = ["D", "C", "B", "A", "S"];
  if (order.indexOf(m.rank) > order.indexOf(a.missions.best || "D")) a.missions.best = m.rank;
  a.missions.board = (a.missions.board || []).filter(x => x.id !== m.id);
  if (a.missions.done % 5 === 0) for (const mm of a.squad.members) mm.memories.push("Cleared mission #" + a.missions.done + " together.");
  C().aSave();
  logAdd("<b>Mission complete!</b> +" + fmtN(m.ryo) + " ryo, squad bond up.", "good");
  toast("Mission complete: " + m.rank + "-rank. +" + fmtN(m.ryo) + " ryo.");
  try { window.SL.hud && window.SL.hud.banner && window.SL.hud.banner("Mission complete", m.rank + "-rank cleared", 2600); } catch (e) {}
  paint();
}
function loseBattle() {
  BTL.over = true;
  if (BTL.kind === "chunin") { chuninBattleLost(); paint(); return; }
  logAdd("<b>Mission failed.</b> The squad patches you up and pulls back. Bond takes a knock.", "bad");
  const a = BTL.acd;
  for (const mm of a.squad.members) mm.bond = clampN((mm.bond || 0) - 1, 0, 100);
  C().aSave();
  paint();
}
function afterPlayer(kind) {
  if (!BTL || BTL.over) return;
  for (const al of BTL.allies) allyAct(al);
  if (BTL.coord > 0) BTL.coord--;
  if (!checkEnd()) { enemyTurn(); if (!checkEnd()) { BTL.turn++; paint(); } }
  else paint();
}
function actStrike() { if (!BTL || BTL.over) return; playerHit(8 + pLv() * 2); afterPlayer(); }
function actJutsu() { if (!BTL || BTL.over || BTL.pc < 14) return; BTL.pc -= 14; const nat = BTL.acd.natures.primary; playerHit(15 + pLv() * 3); logAdd("Nature strike" + (nat ? " (" + (C().NATURE_NAME[nat] || nat) + ")" : "") + "!", "good"); afterPlayer(); }
function actCommand() { if (!BTL || BTL.over || BTL.cmds <= 0) return; BTL.cmds--; BTL.coord = 2; logAdd("<b>Coordinate!</b> The squad fights as one this round.", "good"); afterPlayer(); }
function actPill() { if (!BTL || BTL.over || BTL.pills <= 0) return; BTL.pills--; BTL.php = Math.min(BTL.pmax, BTL.php + 40); logAdd("Healing pill: +40 HP.", "good"); afterPlayer(); }
function actRetreat() { if (!BTL) return; BTL.over = true; logAdd("You signal a retreat. The squad covers the pull-back.", "dim"); paint(); }

/* ---------- chunin exam ---------- */
function chuninOpen() {
  const a = C().acdOf();
  if (a.chunin.passed) { toast("You are already a chunin."); return; }
  const lv = pLv();
  if (lv < 6) { toast("The chunin exams open at level 6 (you are " + lv + ")."); return; }
  if (BTL) return;
  const ov = battleOverlay();
  BTL = { kind: "chunin", stage: a.chunin.stage || 0, acd: a, stageName: "Chunin Exams", log: [], over: false, turn: 1 };
  chuninPaint();
}
function chuninPaint() {
  const body = $q("#sqadBody"); if (!body || !BTL) return;
  const a = BTL.acd;
  const t = $q("#sqadTitle"); if (t) t.textContent = "Chunin Exams";
  body.textContent = "";
  const stage = BTL.stage;
  const names = ["Written gauntlet", "Survival round", "Final bout"];
  body.append(hh("div", { class: "sqadIntro" },
    hh("h4", {}, "🏆 Chunin Exams - " + (stage < 3 ? "Stage " + (stage + 1) + " of 3: " + names[stage] : "Complete")),
    hh("p", {}, stage === 0 ? "Three stages: the written gauntlet, a survival round against multiple opponents, and a final bout with the proctor. Pass all three to make chunin."
      : stage === 1 ? "Written gauntlet cleared. Next: the survival round. Hold your own until the proctor calls it."
      : stage === 2 ? "Survival cleared. One bout stands between you and the vest: the proctor."
      : "You passed. The vest is yours.")));
  const row = hh("div", { class: "sqadRow" });
  if (stage === 0) row.append(hh("button", { class: "sqadBtn primary", onclick: chuninWritten }, "Begin written gauntlet"));
  else if (stage === 1) row.append(hh("button", { class: "sqadBtn primary", onclick: chuninSurvival }, "Enter the survival round"));
  else if (stage === 2) row.append(hh("button", { class: "sqadBtn primary", onclick: chuninBout }, "Face the proctor"));
  else row.append(hh("button", { class: "sqadBtn primary", onclick: () => closeBattle(true) }, "Close"));
  body.append(row);
  if (stage > 0) body.append(hh("p", { class: "sqadMuted" }, "Previous stages: " + (a.chunin.scores || []).map(s => s + "/100").join(" · ")));
}
function chuninWritten() {
  const qs = []; const pool = CHUNIN_Q.slice();
  for (let i = 0; i < 5 && pool.length; i++) qs.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  let i = 0, right = 0;
  const paintQ = () => {
    const body = $q("#sqadBody"); if (!body) return;
    body.textContent = "";
    const t = $q("#sqadTitle"); if (t) t.textContent = "Chunin Exams - Written " + (i + 1) + "/5";
    if (i >= 5) {
      const score = Math.round(100 * right / 5);
      const a = BTL.acd;
      a.chunin.scores = a.chunin.scores || []; a.chunin.scores[0] = score; C().aSave();
      if (right >= 3) { BTL.stage = 1; logAdd("Written gauntlet: " + right + "/5. You advance.", "good"); chuninPaint(); }
      else { BTL.over = true; logAdd("Written gauntlet: " + right + "/5. Not enough. Study and re-enter next time.", "bad"); paintChuninOver(); }
      return;
    }
    const q = qs[i];
    body.append(hh("div", { class: "sqadIntro" }, hh("h4", {}, "Q" + (i + 1) + ": " + q.q)));
    const opts = hh("div", { class: "sqadOpts" });
    q.o.forEach((o, oi) => opts.append(hh("button", { class: "sqadOpt", onclick: () => { if (oi === q.a) right++; i++; paintQ(); } }, o)));
    body.append(opts);
  };
  paintQ();
}
function paintChuninOver() {
  const body = $q("#sqadBody"); if (!body) return;
  body.textContent = "";
  const logEl = hh("div", { class: "sqadLog" });
  logEl.innerHTML = BTL.log.map(l => '<div class="' + (l.cls || "") + '">' + l.html + "</div>").join("");
  body.append(logEl, hh("div", { class: "sqadRow" }, hh("button", { class: "sqadBtn primary", onclick: () => closeBattle(true) }, "Close")));
}
function chuninSurvival() {
  const lv = pLv();
  BTL.pmax = Math.max(60, (prof() && prof().hp) || 120); BTL.php = BTL.pmax;
  BTL.pcmax = Math.max(40, (prof() && prof().chakra) || 92); BTL.pc = BTL.pcmax;
  BTL.allies = BTL.acd.squad.members.map(mm => ({ ref: mm, name: mm.name, hp: 70 + (mm.level || 1) * 12, max: 70 + (mm.level || 1) * 12, atk: 6 + (mm.level || 1) * 2, archetype: mm.archetype }));
  BTL.enemies = [0, 1, 2].map(i => ({ name: "Exam Opponent " + (i + 1), lv: lv + 2, hp: 55 + (lv + 2) * 14, max: 55 + (lv + 2) * 14, atk: 7 + (lv + 2) * 2 }));
  BTL.turn = 1; BTL.coord = 0; BTL.cmds = 2; BTL.pills = 2; BTL.stageName = "Survival Round";
  logAdd("Survival round: hold the field.", "dim");
  paint();
}
function chuninBout() {
  const lv = pLv();
  BTL.pmax = Math.max(60, (prof() && prof().hp) || 120); BTL.php = BTL.pmax;
  BTL.pcmax = Math.max(40, (prof() && prof().chakra) || 92); BTL.pc = BTL.pcmax;
  BTL.allies = []; // proctor bout: alone, as it should be
  BTL.enemies = [{ name: "Proctor Genzo", lv: lv + 4, hp: 90 + (lv + 4) * 16, max: 90 + (lv + 4) * 16, atk: 9 + (lv + 4) * 2 }];
  BTL.turn = 1; BTL.coord = 0; BTL.cmds = 2; BTL.pills = 3; BTL.stageName = "Final Bout";
  logAdd("The proctor takes his stance. Squad sits this one out.", "dim");
  paint();
}
function chuninBattleWon() {
  const a = BTL.acd;
  a.chunin.scores = a.chunin.scores || [];
  if (BTL.stageName === "Survival Round") { a.chunin.scores[1] = 100; a.chunin.stage = 2; C().aSave(); BTL.stage = 2; logAdd("Survival round cleared. The proctor awaits.", "good"); BTL.over = true; }
  else if (BTL.stageName === "Final Bout") {
    a.chunin.scores[2] = 100; a.chunin.passed = true; a.chunin.stage = 3; C().aSave(); BTL.over = true;
    logAdd("<b>You pass.</b> The vest is yours - chunin of the " + (C().VILLAGE_FULL[C().vid()] || "") + ".", "good");
    toast("Promoted: Chunin.");
    try { window.SL.hud && window.SL.hud.banner && window.SL.hud.banner("Chunin promoted", "The vest is yours", 3200); } catch (e) {}
  }
}
function chuninBattleLost() {
  const a = BTL.acd; a.chunin.scores = a.chunin.scores || [];
  if (BTL.stageName === "Survival Round") { a.chunin.scores[1] = 0; a.chunin.stage = 1; }
  else { a.chunin.scores[2] = 0; a.chunin.stage = 2; }
  C().aSave(); BTL.over = true;
  logAdd("You are pulled from the floor. The exam can be retaken.", "bad");
}

/* ---------- CSS ---------- */
const SQCSS = `
.sqadOv{position:fixed;inset:0;z-index:9100;display:flex;align-items:center;justify-content:center;background:rgba(2,5,12,.82);backdrop-filter:blur(5px);font-family:"Segoe UI",system-ui,sans-serif;color:#e8f2ff}
.sqadCard{width:min(760px,94vw);max-height:88vh;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(9,15,32,.98),rgba(6,10,24,.98));border:1px solid rgba(70,183,255,.45);border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.6);overflow:hidden}
.sqadHead{display:flex;align-items:center;gap:12px;padding:13px 18px;border-bottom:1px solid rgba(70,183,255,.3);font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#a8e4ff}
.sqadX{all:unset;cursor:pointer;margin-left:auto;color:#a8e4ff;font-size:1.05rem;padding:2px 10px;border:1px solid rgba(70,183,255,.35);border-radius:8px}
.sqadBody{padding:14px 18px 18px;overflow:auto}
.sqadBars{display:flex;flex-direction:column;gap:5px;margin-bottom:8px}
.sqadBar{display:grid;grid-template-columns:150px 1fr 92px;gap:8px;align-items:center;font-size:.78rem}
.sqadBarL{color:#8fb8d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sqadBarT{height:10px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}
.sqadBarF{height:100%;border-radius:6px;transition:width .25s}
.sqadBarF.hp{background:linear-gradient(90deg,#3ecf6f,#7ef29a)}
.sqadBarF.ck{background:linear-gradient(90deg,#46b7ff,#9fdcff)}
.sqadBarF.en{background:linear-gradient(90deg,#e05a5a,#f29a8a)}
.sqadBarF.down{background:#555}
.sqadBarV{color:#cfe6ff;text-align:right;font-variant-numeric:tabular-nums}
.sqadSep{height:1px;background:rgba(70,183,255,.18);margin:8px 0}
.sqadLog{max-height:190px;overflow:auto;margin:10px 0;font-size:.82rem;line-height:1.55;border:1px solid rgba(70,183,255,.2);border-radius:9px;padding:8px 10px;background:rgba(3,7,16,.6)}
.sqadLog .good{color:#8ef2b8}.sqadLog .bad{color:#ff9a9a}.sqadLog .dim{color:#8fb8d8}
.sqadRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.sqadBtn{all:unset;cursor:pointer;font-size:.74rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:9px 14px;border-radius:9px;border:1px solid rgba(70,183,255,.5);background:rgba(70,183,255,.12);color:#cfeaff}
.sqadBtn:hover{background:rgba(70,183,255,.22)}
.sqadBtn.primary{background:#46b7ff;color:#04121f;border-color:#46b7ff}
.sqadBtn.primary:hover{filter:brightness(1.12)}
.sqadBtn.ghost{background:transparent;color:#8fb8d8}
.sqadBtn[disabled]{opacity:.4;cursor:default}
.sqadIntro h4{margin:0 0 6px;font-size:.95rem;color:#a8e4ff}
.sqadIntro p{margin:0 0 8px;font-size:.85rem;color:#cfe6ff;line-height:1.5}
.sqadMuted{color:#8fb8d8;font-size:.78rem}
.sqadOpts{display:flex;flex-direction:column;gap:7px}
.sqadOpt{all:unset;cursor:pointer;font-size:.85rem;padding:10px 12px;border:1px solid rgba(70,183,255,.35);border-radius:9px;background:rgba(70,183,255,.07)}
.sqadOpt:hover{background:rgba(70,183,255,.18)}
.sqadCard2{border:1px solid rgba(70,183,255,.3);border-radius:11px;padding:11px 13px;background:rgba(9,15,32,.55);margin-bottom:10px}
.sqadCard2 h4{margin:0 0 7px;font-size:.88rem;color:#a8e4ff;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sqadPill{font-size:.68rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid rgba(70,183,255,.4);color:#a8e4ff}
.sqadPill.nat{border-color:rgba(255,255,255,.25)}
.sqadStat{display:flex;justify-content:space-between;font-size:.8rem;padding:2px 0;color:#cfe6ff}
.sqadStat b{color:#fff}
.sqadBond{height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;margin:5px 0 2px}
.sqadBondF{height:100%;background:linear-gradient(90deg,#e0a23e,#f2cf7e)}
.sqadRank{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;border-radius:9px;font-weight:900;border:1px solid rgba(70,183,255,.45);color:#a8e4ff;margin-right:8px}
.sqadRank.lock{opacity:.4}
.sqadMiss{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}
.sqadMiss h5{margin:0 0 3px;font-size:.85rem;color:#fff}
.sqadMiss p{margin:0;font-size:.78rem;color:#8fb8d8;line-height:1.45}
.sqadMem{font-size:.75rem;color:#8fb8d8;font-style:italic;margin-top:6px}
`;
function injectCss() {
  if (!$q("#sqadCss")) { const st = document.createElement("style"); st.id = "sqadCss"; st.textContent = SQCSS; document.head.append(st); }
}

/* ---------- squad tab render ---------- */
export function render(body) {
  injectCss();
  const c = C(); if (!c || !body) return;
  const a = c.acdOf();
  body.textContent = "";
  if (!a.exam.passed) {
    body.append(hh("div", { class: "p1title" }, "🤝 Your squad"),
      hh("div", { class: "p1card" }, hh("p", {}, "You graduate with a three-man squad and a sensei. Finish the graduation exam first.")));
    return;
  }
  if (!a.squad.generated) { genSquad(a); toast("🤝 " + a.squad.number + " assigned - meet your squad."); }
  a.missions = a.missions || { board: [], refreshedAt: 0, done: 0, best: "" };
  ensureBoard(a);
  const sq = a.squad;
  body.append(hh("div", { class: "p1title" }, "🤝 " + sq.number),
    hh("div", { class: "p1card" },
      hh("h4", {}, "Bond " + avgBond(a) + " / 100"),
      hh("div", { class: "sqadBond" }, hh("div", { class: "sqadBondF", style: { width: avgBond(a) + "%" } })),
      hh("p", {}, "Bonds grow on missions. Higher bonds unlock higher-rank postings and sharper coordination in the field.")));
  for (const m of sq.members) {
    const need = memberXpNeed(m);
    body.append(hh("div", { class: "sqadCard2" },
      hh("h4", {}, m.name,
        hh("span", { class: "sqadPill" }, m.archetype),
        hh("span", { class: "sqadPill nat" }, (c.NATURE_ICON[m.nature] || "🌀") + " " + (c.NATURE_NAME[m.nature] || m.nature)),
        hh("span", { class: "sqadPill" }, "clan " + m.clan)),
      hh("div", { class: "sqadStat" }, hh("span", {}, "Level"), hh("b", {}, String(m.level || 1))),
      hh("div", { class: "sqadStat" }, hh("span", {}, "XP"), hh("b", {}, (m.xp || 0) + " / " + need)),
      hh("div", { class: "sqadStat" }, hh("span", {}, "Bond"), hh("b", {}, (m.bond || 0) + " / 100")),
      hh("div", { class: "sqadBond" }, hh("div", { class: "sqadBondF", style: { width: (m.bond || 0) + "%" } })),
      hh("p", {}, m.blurb || ""),
      m.memories && m.memories.length ? hh("p", { class: "sqadMem" }, "“" + m.memories[m.memories.length - 1] + "”") : null));
  }
  if (sq.sensei) body.append(hh("div", { class: "sqadCard2" },
    hh("h4", {}, "🥷 " + sq.sensei.name + " (sensei)",
      hh("span", { class: "sqadPill nat" }, (c.NATURE_ICON[sq.sensei.nature] || "🌀") + " " + (c.NATURE_NAME[sq.sensei.nature] || ""))),
    hh("div", { class: "sqadStat" }, hh("span", {}, "Level"), hh("b", {}, String(sq.sensei.level || 1))),
    hh("div", { class: "sqadStat" }, hh("span", {}, "Bond"), hh("b", {}, (sq.sensei.bond || 0) + " / 100")),
    hh("p", {}, sq.sensei.personality || "")));
  /* mission board */
  const b = avgBond(a), lv = pLv();
  body.append(hh("div", { class: "p1title" }, "📜 Mission board"));
  for (const def of RANK_DEF) {
    const open = b >= def.minBond && lv >= def.minLv;
    const list = (a.missions.board || []).filter(x => x.rank === def.rank);
    if (!open && !list.length) {
      body.append(hh("div", { class: "sqadCard2" },
        hh("h4", {}, hh("span", { class: "sqadRank lock" }, def.rank), def.tag),
        hh("p", {}, "Locked - needs bond " + def.minBond + (def.minLv > 1 ? " and level " + def.minLv : "") + ".")));
      continue;
    }
    for (const m of list) {
      body.append(hh("div", { class: "sqadCard2" },
        hh("div", { class: "sqadMiss" },
          hh("div", {},
            hh("h5", {}, hh("span", { class: "sqadRank" }, def.rank), m.title),
            hh("p", {}, def.tag + " · " + m.enemies.length + " opponent" + (m.enemies.length > 1 ? "s" : "") + " · " + fmtN(m.ryo) + " ryo · +" + m.xp + " squad XP")),
          hh("button", { class: "sqadBtn primary", onclick: () => startMission(m, a) }, "Deploy"))));
    }
  }
  if (!(a.missions.board || []).length) body.append(hh("div", { class: "sqadCard2" }, hh("p", {}, "Board is clear. New postings arrive in the morning."),
    hh("button", { class: "sqadBtn", style: { marginTop: "8px" }, onclick: () => { a.missions.refreshedAt = 0; ensureBoard(a); render($q("#acadBody")); } }, "Request postings")));
  /* chunin exams */
  body.append(hh("div", { class: "p1title" }, "🏆 Chunin exams"));
  body.append(hh("div", { class: "sqadCard2" },
    a.chunin.passed
      ? hh("div", {}, hh("h4", {}, "🏆 Chunin - passed"), hh("p", {}, "Vest earned " + new Date(a.chunin.passedAt || Date.now()).toLocaleDateString() + ". Jonin opens at level 10."))
      : hh("div", {},
          hh("h4", {}, pLv() >= 6 ? "🏆 Open to you" : "🏆 Opens at level 6"),
          hh("p", {}, pLv() >= 6 ? "Three stages: written gauntlet, survival round, and the proctor's bout. Pass all three and wear the vest." : "The chunin exams open at level 6. Keep taking missions."),
          pLv() >= 6 ? hh("button", { class: "sqadBtn primary", style: { marginTop: "8px" }, onclick: chuninOpen }, "Enter the exams") : null)));
}

/* ---------- diploma hook: meet your squad ---------- */
export function meetSquad() {
  injectCss();
  const c = C(); if (!c) return;
  const a = c.acdOf();
  if (!a.exam.passed) { toast("Finish the graduation exam first."); return; }
  if (!a.squad.generated) genSquad(a);
  const sq = a.squad;
  let ov = $q("#sqadMeet"); if (ov) ov.remove();
  ov = hh("div", { id: "sqadMeet", class: "sqadOv", role: "dialog", "aria-label": "Squad assignment" },
    hh("div", { class: "sqadCard" },
      hh("div", { class: "sqadHead" }, "🤝 " + sq.number, hh("span", { style: { marginLeft: "auto", fontSize: ".7rem", letterSpacing: ".08em" } }, "Squad assignment")),
      hh("div", { class: "sqadBody" },
        hh("div", { class: "sqadIntro" }, hh("h4", {}, "Your squad"), hh("p", {}, "The " + (c.VILLAGE_FULL[c.vid()] || "") + " council has placed you with two teammates and a sensei. Bonds grow on missions together.")),
        ...sq.members.map(m => hh("div", { class: "sqadCard2" },
          hh("h4", {}, m.name, hh("span", { class: "sqadPill" }, m.archetype), hh("span", { class: "sqadPill nat" }, (c.NATURE_ICON[m.nature] || "") + " " + (c.NATURE_NAME[m.nature] || ""))),
          hh("p", {}, m.blurb || ""))),
        sq.sensei ? hh("div", { class: "sqadCard2" }, hh("h4", {}, "🥷 " + sq.sensei.name + " (sensei)"), hh("p", {}, sq.sensei.personality || "")) : null,
        hh("div", { class: "sqadRow" }, hh("button", { class: "sqadBtn primary", onclick: () => { ov.remove(); } }, "Ready to work")))));
  document.body.append(ov);
}

export { rankText, avgBond, genSquad, chuninOpen, battleOverlay };
