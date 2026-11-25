/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 1
   Systems: Summoning Contracts + Chakra Nature Mastery
   Modular, self-contained. Loaded from the Remastered menu.
   Phase 1b (next): Training Simulator + Weapon Forging.
   ============================================================ */
const P1V = "1";
const LS_KEY = "sl2_phase1_v" + P1V;

/* ---------- tiny DOM helpers ---------- */
function hh(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v === false || v == null) { /* skip */ }
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const k of kids.flat(9)) {
    if (k == null || k === false) continue;
    e.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return e;
}
const $q = (sel) => document.querySelector(sel);
const fmtN = (n) => Math.round(n).toLocaleString("en-US");
const clampN = (n, a, b) => Math.max(a, Math.min(b, n));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------- persistence ---------- */
let ROOT = null;
function p1load() {
  try { ROOT = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { ROOT = null; }
  if (!ROOT || typeof ROOT !== "object") ROOT = { v: P1V, chars: {} };
  if (!ROOT.chars) ROOT.chars = {};
}
function charKey(save) {
  const nm = (save && (save.name || save.charName)) || "unknown";
  return String(nm).toLowerCase().slice(0, 40) || "unknown";
}
function p1char(save) {
  if (!save) save = SAVE;
  p1load();
  const k = charKey(save);
  if (!ROOT.chars[k]) ROOT.chars[k] = {
    sum: { signed: {}, active: null, frags: {}, lastHunt: 0 },
    chm: { xp: { fire: 0, water: 0, wind: 0, earth: 0, lightning: 0, yin: 0 }, drills: {} },
    mats: { ore: 0, scrollDust: 0, beastClaw: 0, jade: 0 }
  };
  const c = ROOT.chars[k];
  c.sum = c.sum || { signed: {}, active: null, frags: {}, lastHunt: 0 };
  c.chm = c.chm || { xp: { fire: 0, water: 0, wind: 0, earth: 0, lightning: 0, yin: 0 }, drills: {} };
  c.mats = c.mats || { ore: 0, scrollDust: 0, beastClaw: 0, jade: 0 };
  return c;
}
function p1save() { try { localStorage.setItem(LS_KEY, JSON.stringify(ROOT)); } catch {} }

/* ---------- player context (passed from the menu) ---------- */
let SAVE = null;
function pLv() { return clampN((SAVE && SAVE.level) || 1, 1, 10000); }
function pName() { return (SAVE && (SAVE.name || SAVE.charName)) || "Shinobi"; }
function pVillage() { return (SAVE && (SAVE.village || SAVE.at || "leaf")) || "leaf"; }

/* ---------- style ---------- */
const CSS = `
.p1ov{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(2,5,12,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:"Segoe UI",system-ui,sans-serif;color:#e8f2ff}
.p1m{width:min(860px,94vw);max-height:88vh;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(9,15,32,.97),rgba(6,10,24,.97));border:1px solid rgba(70,183,255,.45);border-radius:14px;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 18px 60px rgba(0,0,0,.6),0 0 40px rgba(70,183,255,.12);clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px));overflow:hidden}
.p1head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(70,183,255,.3);background:linear-gradient(90deg,rgba(70,183,255,.08),transparent)}
.p1head h2{margin:0;font-size:1.05rem;letter-spacing:.14em;text-transform:uppercase;color:#a8e4ff;font-style:italic;font-weight:900}
.p1head .p1who{margin-left:auto;font-size:.72rem;color:#8fb8d8;letter-spacing:.06em}
.p1x{all:unset;cursor:pointer;color:#a8e4ff;font-size:1.1rem;padding:2px 10px;border:1px solid rgba(70,183,255,.35);border-radius:8px;line-height:1.4}
.p1x:hover{background:rgba(70,183,255,.15)}
.p1tabs{display:flex;gap:6px;padding:10px 18px 0;flex-wrap:wrap}
.p1tab{all:unset;cursor:pointer;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:7px 13px;border:1px solid rgba(70,183,255,.28);border-radius:9px;color:#9cc6e8;background:rgba(10,18,36,.6)}
.p1tab.on{color:#04121f;background:#46b7ff;border-color:#46b7ff}
.p1body{padding:14px 18px 18px;overflow-y:auto;min-height:280px}
.p1foot{padding:10px 18px;border-top:1px solid rgba(70,183,255,.22);font-size:.68rem;color:#7fa6c4;display:flex;gap:14px;flex-wrap:wrap}
.p1grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.p1card{position:relative;border:1px solid rgba(70,183,255,.3);border-radius:12px;background:rgba(12,20,40,.72);padding:12px;display:flex;flex-direction:column;gap:6px}
.p1card.locked{opacity:.62;border-style:dashed}
.p1card h4{margin:0;font-size:.86rem;color:#dcecff;display:flex;gap:8px;align-items:baseline}
.p1card .p1rar{font-size:.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border-radius:20px;border:1px solid}
.p1card p{margin:0;font-size:.72rem;line-height:1.5;color:#a8c4de}
.p1stat{display:flex;justify-content:space-between;font-size:.7rem;color:#9cc6e8}
.p1stat b{color:#dcecff}
.p1bar{height:7px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}
.p1bar i{display:block;height:100%;background:linear-gradient(90deg,#2b8fd8,#46b7ff,#a8e4ff)}
.p1btn{all:unset;cursor:pointer;text-align:center;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:8px 12px;border-radius:9px;border:1px solid #46b7ff;color:#04121f;background:#46b7ff}
.p1btn:hover{filter:brightness(1.12)}
.p1btn:disabled{opacity:.4;cursor:not-allowed}
.p1btn.ghost{background:transparent;color:#a8e4ff;border-color:rgba(70,183,255,.4)}
.p1btn.danger{background:#ff5f7a;border-color:#ff5f7a;color:#1f060c}
.p1log{border:1px solid rgba(70,183,255,.25);border-radius:10px;background:rgba(4,8,18,.7);padding:10px 12px;font-size:.74rem;line-height:1.65;max-height:180px;overflow-y:auto;white-space:pre-wrap}
.p1log b{color:#a8e4ff}
.p1log .bad{color:#ff9aa8}.p1log .good{color:#8ef2b8}.p1log .dim{color:#7fa6c4}
.p1row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.p1pill{font-size:.66rem;padding:3px 9px;border-radius:20px;border:1px solid rgba(70,183,255,.35);color:#a8e4ff;background:rgba(70,183,255,.08)}
.p1toast{position:fixed;left:50%;bottom:9vh;transform:translateX(-50%);z-index:9100;background:rgba(8,14,30,.95);border:1px solid #46b7ff;color:#dcecff;padding:9px 18px;border-radius:10px;font-size:.8rem;font-weight:700;letter-spacing:.03em;box-shadow:0 8px 30px rgba(0,0,0,.5);opacity:0;transition:opacity .25s;pointer-events:none;max-width:80vw;text-align:center}
.p1toast.show{opacity:1}
.p1timer{font-size:.66rem;color:#7fa6c4}
.p1combo{display:flex;flex-direction:column;gap:8px}
.p1comboline{display:flex;gap:10px;align-items:center;border:1px solid rgba(70,183,255,.22);border-radius:10px;padding:8px 12px;background:rgba(10,17,34,.6)}
.p1comboline.on{border-color:#46b7ff;background:rgba(70,183,255,.1)}
.p1comboline .req{font-size:.64rem;color:#7fa6c4}
.p1drill{border:1px solid rgba(70,183,255,.3);border-radius:12px;padding:14px;background:rgba(10,17,34,.65);display:flex;flex-direction:column;gap:10px}
.p1zone{position:relative;height:30px;border-radius:8px;background:rgba(255,255,255,.07);overflow:hidden;cursor:pointer}
.p1zone .tgt{position:absolute;top:0;bottom:0;background:linear-gradient(180deg,rgba(70,183,255,.55),rgba(70,183,255,.25));border-left:1px solid #a8e4ff;border-right:1px solid #a8e4ff}
.p1zone .mk{position:absolute;top:-3px;bottom:-3px;width:4px;background:#ffd34a;border-radius:2px;box-shadow:0 0 8px #ffd34a}
.p1title{font-size:.8rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#a8e4ff;margin:4px 0 2px}
`;

/* ============================================================
   SHARED: status effects + turn-based trial combat engine
   ============================================================ */
let WEAPON_HOOKS = [];
let TRAIN_HOOKS = [];
function setWeaponHook(fn) { if (!WEAPON_HOOKS.includes(fn)) WEAPON_HOOKS.push(fn); }
function setTrainHook(fn) { if (!TRAIN_HOOKS.includes(fn)) TRAIN_HOOKS.push(fn); }
function fxList() { return []; }
function makeFx(kind, turns, val) { return { kind, turns, val }; }
/* battle state: {php, pmax, ghp, gmax, gatk, turn, log[], fxP[], fxG[], sum, combo, over, win, flavor} */
function battleStart(species, guardianName, opts) {
  opts = opts || {};
  const lv = pLv();
  const c = p1char(SAVE);
  const bond = (c.sum.signed[species.id] || { bond: 0 });
  const b = bondLvl(bond.bond || 0);
  const sumBonus = species ? (0.25 + b * 0.05) : 0;
  const chBonus = chakraBattleBonus();
  const wBonusX = WEAPON_HOOKS.reduce((a, f) => a + (f() || 0), 0);
  const php = 60 + lv * 5;
  const pmax = php;
  const ghp = 80 + lv * 7 + (opts.gmul || 1) * 40;
  const gmax = ghp;
  return {
    php, pmax, ghp, gmax,
    patk: (9 + lv * 1.35) * (1 + sumBonus) * (1 + chBonus + wBonusX),
    gatk: 9 + lv * 1.45 + (opts.gmul || 1) * 6,
    turn: 1, log: [], fxP: [], fxG: [],
    sum: species ? { sp: species, bond: b } : null,
    combo: opts.combo || null,
    usedCombo: false, usedSumAb: false, guardStance: false,
    over: false, win: false,
    gname: guardianName || "Contract Guardian",
    reward: opts.reward || null, onWin: opts.onWin || null, onLose: opts.onLose || null
  };
}
function logAdd(b, text, cls) { b.log.push((cls ? '<span class="' + cls + '">' : "<span>") + text + "</span>"); if (b.log.length > 60) b.log.shift(); }
function bondLvl(xp) { let l = 1; while (xp >= l * 60 && l < 10) { xp -= l * 60; l++; } return l; }
function bondNext(l) { return l * 60; }
function fxApply(list, dmgBase) {
  let mult = 1, flat = 0;
  for (const f of list) {
    if (f.kind === "atkUp") mult += 0.3; else if (f.kind === "atkDown") mult -= 0.3;
    else if (f.kind === "guard") mult -= 0.45;
  }
  return { mult: Math.max(0.25, mult), flat };
}
function chakraBattleBonus() {
  const c = p1char(SAVE);
  let t = 0;
  for (const e in c.chm.xp) t += chmLvl(c.chm.xp[e]);
  return Math.min(0.5, t * 0.02);
}

/* one player action; returns whether battle is over */
function battleAct(b, action) {
  if (b.over) return true;
  const P = [], G = [];
  let pdmg = 0, note = "";
  if (action === "strike") {
    pdmg = b.patk * rnd(0.85, 1.15);
    note = "You strike true.";
  } else if (action === "guard") {
    b.guardStance = true; note = "You set your guard.";
  } else if (action === "jutsu" && action.ok !== false) {
    const el = strongestElement();
    pdmg = b.patk * (1.15 + 0.07 * (el ? el.lvl : 0));
    note = el ? "You channel " + el.name + " chakra into a jutsu." : "You channel chakra into a jutsu.";
  } else if (action === "summon" && b.sum) {
    const sp = b.sum.sp;
    pdmg = b.patk * (0.55 + b.sum.bond * 0.09) * rnd(0.9, 1.15);
    note = sp.name + " lashes out at your command.";
  } else if (action === "combo" && b.combo && !b.usedCombo) {
    b.usedCombo = true;
    pdmg = b.patk * 2.0;
    note = "COMBINED ATTACK — " + b.combo.name + "!";
    if (Math.random() < 0.5) G.push(makeFx("stun", 1, 0));
  } else if (action === "sumAb" && b.sum && !b.usedSumAb) {
    b.usedSumAb = true;
    const sp = b.sum.sp;
    if (sp.abil.kind === "heal") { b.php = Math.min(b.pmax, b.php + b.pmax * 0.3); note = sp.name + " — " + sp.abil.name + ": you recover."; }
    else if (sp.abil.kind === "debuff") { b.fxG.push(makeFx("atkDown", 2, 0)); note = sp.name + " — " + sp.abil.name + ": the guardian staggers."; }
    else if (sp.abil.kind === "stun") { b.fxG.push(makeFx("stun", 1, 0)); note = sp.name + " — " + sp.abil.name + ": the guardian is stunned!"; }
    else { pdmg = b.patk * 1.35; note = sp.name + " — " + sp.abil.name + "!"; }
  }
  /* guardian effects tick */
  for (const f of b.fxG) if (f.kind === "burn" || f.kind === "poison") { b.ghp -= f.val; }
  b.fxG = b.fxG.filter((f) => { f.turns--; return f.turns > 0; });
  const gm = fxApply(b.fxG).mult;
  pdmg *= gm;
  if (G.some((f) => f.kind === "stun")) { b.fxG.push(...G.filter((f) => f.kind === "stun")); pdmg *= 0.5; }
  b.ghp -= pdmg;
  if (pdmg > 0) logAdd(b, note + " <b>-" + fmtN(pdmg) + "</b>", "good");
  else logAdd(b, note, "dim");
  if (b.ghp <= 0) { b.over = true; b.win = true; const wc = p1char(); if (wc.w2 && wc.w2.counters) wc.w2.counters.trial++; logAdd(b, "The " + b.gname + " yields. Victory.", "good"); return true; }
  /* guardian turn */
  const gStunned = b.fxG.some((f) => f.kind === "stun");
  let gdmg = 0;
  if (gStunned) logAdd(b, "The " + b.gname + " reels, unable to act.", "dim");
  else {
    gdmg = b.gatk * rnd(0.85, 1.2);
    if (b.guardStance) { gdmg *= 0.5; logAdd(b, "You brace behind your guard.", "dim"); }
    const eva = b.fxP.some((f) => f.kind === "evade");
    if (eva && Math.random() < 0.45) { gdmg = 0; logAdd(b, "You slip aside — miss!", "dim"); }
    b.fxP = b.fxP.filter((f) => { f.turns--; return f.turns > 0; });
    b.php -= gdmg;
    if (gdmg > 0) logAdd(b, "The " + b.gname + " strikes. <b>-" + fmtN(gdmg) + "</b>", "bad");
  }
  b.turn++;
  if (b.php <= 0) { b.over = true; b.win = false; logAdd(b, "You fall back, wounded. The trial is lost — try again.", "bad"); return true; }
  return false;
}

/* ============================================================
   SYSTEM 1 — SUMMONING CONTRACTS
   ============================================================ */
const SPECIES = [
  { id: "toads", name: "Toads", icon: "🐸", rarity: "Common", elem: "water", desc: "Stout, loyal, loud. Old masters of sage arts.", abil: { name: "Water Gun", kind: "dmg" }, passive: "Steady Stance — +guard", reqLv: 1 },
  { id: "wolves", name: "Wolves", icon: "🐺", rarity: "Common", elem: "wind", desc: "Pack hunters of the high passes. Fast and fearless.", abil: { name: "Pack Rush", kind: "dmg" }, passive: "Keen Senses — evade chance", reqLv: 3 },
  { id: "snakes", name: "Snakes", icon: "🐍", rarity: "Uncommon", elem: "yin", desc: "Silent, patient, venomous. Strike from the dark.", abil: { name: "Venom Fangs", kind: "dmg" }, passive: "Shed Skin — mend wounds", reqLv: 6 },
  { id: "hawks", name: "Hawks", icon: "🦅", rarity: "Uncommon", elem: "wind", desc: "Eyes of the sky. They see what you cannot.", abil: { name: "Dive Bomb", kind: "dmg" }, passive: "Sky Watch — read the next move", reqLv: 9 },
  { id: "slugs", name: "Slugs", icon: "🐌", rarity: "Rare", elem: "water", desc: "Gentle giants that split and mend. Hard to put down.", abil: { name: "Healing Slime", kind: "heal" }, passive: "Acid Coat — corrode armor", reqLv: 12 },
  { id: "foxes", name: "Foxes", icon: "🦊", rarity: "Mythic", elem: "yin", desc: "Nine-tailed tricksters. Illusion is their home ground.", abil: { name: "Illusion Veil", kind: "stun" }, passive: "Foxfire — burning tails", reqLv: 18 },
  { id: "komainu", name: "Komainu", icon: "🦁", rarity: "Legendary", elem: "earth", desc: "Ancient stone guardians sworn to old shrines.", abil: { name: "Stone Roar", kind: "debuff" }, passive: "Aegis — legendary guard", reqLv: 24 },
  { id: "raiju", name: "Raiju", icon: "⚡", rarity: "Legendary", elem: "lightning", desc: "The thunder beast. It rides the storm down.", abil: { name: "Thunder Pounce", kind: "dmg" }, passive: "Static Coat — retaliation", reqLv: 30 },
  { id: "dragons", name: "Dragons", icon: "🐲", rarity: "Legendary", elem: "fire", desc: "The old kings of sky and flame. Contracts sworn in fire.", abil: { name: "Elemental Breath", kind: "dmg" }, passive: "Dragon Will — raw power", reqLv: 36 }
];
const FRAGS_NEED = 5;
const HUNT_COOLDOWN_MS = 6 * 60 * 1000;
function spById(id) { return SPECIES.find((s) => s.id === id); }
function rarColor(r) { return r === "Mythic" ? "#c58bff" : r === "Legendary" ? "#ffb347" : r === "Rare" ? "#5fb0ff" : "#8fd2a0"; }

function sSigned(c, id) { return !!(c.sum.signed[id]); }
function sFragCount(c, id) { return c.sum.frags[id] || 0; }
function sTrialReady(c, id) { return sFragCount(c, id) >= FRAGS_NEED; }
function sSpDiscoverable(c, sp) {
  return pLv() >= sp.reqLv && !sSigned(c, sp.id) && !sTrialReady(c, sp.id);
}
function sDiscoverPool(c) { return SPECIES.filter((sp) => sSpDiscoverable(c, sp)); }

function doHunt() {
  const c = p1char(SAVE);
  const now = Date.now();
  const left = c.sum.lastHunt + HUNT_COOLDOWN_MS - now;
  if (left > 0) { toast("Rest. The trails go quiet for " + Math.ceil(left / 60000) + " more min."); return false; }
  const pool = sDiscoverPool(c);
  const lv = pLv();
  const out = [];
  if (Math.random() < 0.42 + Math.min(0.3, lv * 0.008)) {
    if (pool.length) {
      const sp = pick(pool);
      const n = (c.sum.frags[sp.id] || 0) + 1;
      c.sum.frags[sp.id] = n;
      out.push('<span class="good">You pull a worn scroll fragment from the ruins. <b>' + sp.icon + " " + sp.name + " fragment " + n + "/" + FRAGS_NEED + "</b></span>");
      if (n >= FRAGS_NEED) out.push('<span class="good">The fragments form a whole contract scroll. <b>The ' + sp.name + " trial awaits.</b></span>");
      if (Math.random() < 0.35) { c.mats.ore++; c.mats.beastClaw++; }
      if (Math.random() < 0.12) { c.mats.jade++; out.push('<span class="good">Deep in the ruin: a vein of <b>jade</b>.</span>'); }
      if (c.w2 && c.w2.counters) c.w2.counters.hunt++;
    } else {
      out.push('<span class="dim">Nothing new out there — but you bring back materials.</span>');
      c.mats.ore += 2; c.mats.scrollDust++;
    }
    if (c.sum.active && sSigned(c, c.sum.active)) {
      const before = bondLvl((c.sum.signed[c.sum.active] || {}).bond || 0);
      addBond(c.sum.active, 10 + Math.floor(lv * 0.5));
      const after = bondLvl((c.sum.signed[c.sum.active] || {}).bond || 0);
      out.push('<span class="dim">Your ' + spById(c.sum.active).icon + " " + spById(c.sum.active).name + " hunts beside you." + (after > before ? " <b>Bond Lv " + after + "!</b>" : " +bond xp") + "</span>");
    }
  } else {
    out.push('<span class="dim">The trail goes cold. Nothing this time.</span>');
    if (c.sum.active && sSigned(c, c.sum.active)) addBond(c.sum.active, 4);
  }
  c.sum.lastHunt = now;
  c.sum.lastLog = (c.sum.lastLog || []).concat(out).slice(-10);
  p1save();
  return true;
}
function addBond(id, xp) {
  const c = p1char(SAVE);
  const s = c.sum.signed[id];
  if (!s) return;
  const before = bondLvl(s.bond || 0);
  s.bond = (s.bond || 0) + xp;
  const after = bondLvl(s.bond);
  if (after > before) toast(spById(id).icon + " " + spById(id).name + " bond reached Lv " + after + "!");
  p1save();
}

/* ---------- summoning UI ---------- */
function renderSummons() {
  const c = p1char(SAVE);
  const body = $q("#p1body");
  body.textContent = "";
  const lv = pLv();
  /* header stats */
  const active = c.sum.active && spById(c.sum.active);
  const huntLeft = Math.max(0, c.sum.lastHunt + HUNT_COOLDOWN_MS - Date.now());
  const head = hh("div", { class: "p1row", style: { marginBottom: "12px" } },
    hh("span", { class: "p1pill" }, "Active: " + (active ? active.icon + " " + active.name : "none")),
    hh("span", { class: "p1pill" }, "Contracts signed: " + Object.keys(c.sum.signed).length + "/" + SPECIES.length),
    huntLeft > 0 ? hh("span", { class: "p1timer" }, "Next expedition: " + Math.ceil(huntLeft / 60000) + " min") : hh("span", { class: "p1pill", style: { color: "#8ef2b8", borderColor: "#3fbf7a" } }, "Trails open — scout for contracts")
  );
  body.append(head);
  const grid = hh("div", { class: "p1grid" });
  for (const sp of SPECIES) {
    const signed = sSigned(c, sp.id);
    const frags = sFragCount(c, sp.id);
    const bond = signed ? bondLvl((c.sum.signed[sp.id] || {}).bond || 0) : 0;
    const bxp = signed ? ((c.sum.signed[sp.id] || {}).bond || 0) : 0;
    const prevNeed = bond > 1 ? (bond - 1) * 60 : 0;
    const need = bondNext(bond < 10 ? bond : 9);
    const bx = clampN(bxp - (bond < 10 ? prevNeed : 0), 0, need);
    const levelOk = lv >= sp.reqLv;
    const isActive = c.sum.active === sp.id;
    const card = hh("div", { class: "p1card" + (signed ? "" : " locked") });
    card.append(hh("h4", {}, sp.icon + " " + sp.name,
      hh("span", { class: "p1rar", style: { color: rarColor(sp.rarity), borderColor: rarColor(sp.rarity) } }, sp.rarity)));
    card.append(hh("p", {}, sp.desc));
    card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Nature"), hh("b", {}, cap(sp.elem))));
    card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Ability"), hh("b", {}, sp.abil.name)));
    card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Passive"), hh("b", {}, sp.passive)));
    if (signed) {
      card.append(hh("div", { style: { marginTop: "4px" } },
        hh("div", { class: "p1stat" }, hh("span", {}, "Bond Lv " + bond + "/10"), hh("b", {}, bond < 10 ? fmtN(bx) + "/" + fmtN(need) + " xp" : "MAX")),
        hh("div", { class: "p1bar", style: { marginTop: "4px" } }, hh("i", { style: { width: (bond >= 10 ? 100 : (bx / need) * 100) + "%" } }))));
      card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Bond perks"),
        hh("b", {}, bond >= 7 ? "Combined attack" : bond >= 5 ? "Both abilities" : bond >= 3 ? "Ability I" : "Follow")));
      const row = hh("div", { class: "p1row", style: { marginTop: "6px" } });
      row.append(hh("button", { class: "p1btn" + (isActive ? " ghost" : ""), onclick: () => { V_ui(); c.sum.active = isActive ? null : sp.id; p1save(); rerender(); } }, isActive ? "Summon away" : "Summon"));
      row.append(hh("button", { class: "p1btn ghost", onclick: () => startTrial(sp, { type: "bond" }) }, "Trial: bond"));
      card.append(row);
    } else {
      card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Scroll fragments"), hh("b", {}, frags + "/" + FRAGS_NEED)));
      if (!levelOk) card.append(hh("p", { class: "req", style: { color: "#7fa6c4" } }, "Unlocks at Lv " + sp.reqLv + ". Keep growing."));
      else if (sTrialReady(c, sp.id)) card.append(hh("button", { class: "p1btn", style: { marginTop: "6px" }, onclick: () => startTrial(sp, { type: "sign" }) }, "Enter the guardian trial"));
      else card.append(hh("p", { style: { color: "#7fa6c4", fontSize: ".68rem" } }, "Scout the world to find its contract fragments."));
    }
    grid.append(card);
  }
  body.append(grid);
  const actions = hh("div", { class: "p1row", style: { marginTop: "14px" } },
    hh("button", { class: "p1btn", disabled: huntLeft > 0, onclick: () => { if (doHunt()) rerender(); } }, "🧭 Scout for contracts"),
    hh("button", { class: "p1btn ghost", onclick: () => { rerender(); } }, "Refresh"));
  body.append(actions);
  const logEl = hh("div", { class: "p1log", id: "p1slog", style: { marginTop: "12px" } });
  const hist = (c.sum.lastLog && c.sum.lastLog.length) ? c.sum.lastLog : ['<span class="dim">The wilds hold nine bloodlines of summons. Scout for contract fragments, face the guardian, sign the contract. Summons fight beside you in trials and expeditions.</span>'];
  logEl.innerHTML = hist.map((l) => "<div>" + l + "</div>").join("");
  body.append(logEl);
}

/* ============================================================
   SYSTEM 2 — CHAKRA NATURE MASTERY
   ============================================================ */
const ELEMENTS = [
  { id: "fire", name: "Fire", icon: "🔥" },
  { id: "water", name: "Water", icon: "💧" },
  { id: "wind", name: "Wind", icon: "🌪️" },
  { id: "earth", name: "Earth", icon: "🪨" },
  { id: "lightning", name: "Lightning", icon: "⚡" },
  { id: "yin", name: "Yin", icon: "🌑" }
];
const DRILL_COOLDOWN_MS = 90 * 1000;
function elById(id) { return ELEMENTS.find((e) => e.id === id); }
function chmLvl(xp) { let l = 0; let need = 40; let x = xp; while (x >= need && l < 10) { x -= need; l++; need = 40 + l * 35; } return { lvl: l, into: x, need: l >= 10 ? 0 : need }; }
function cap(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; }
function strongestElement() {
  const c = p1char(SAVE);
  let best = null;
  for (const e of ELEMENTS) {
    const st = chmLvl(c.chm.xp[e.id] || 0);
    if (st.lvl > 0 && (!best || st.lvl > best.lvl)) best = { id: e.id, name: e.name, icon: e.icon, lvl: st.lvl };
  }
  return best;
}
const COMBOS = [
  { id: "ice", name: "Ice Release", a: "water", aLv: 5, b: "wind", bLv: 5, icon: "❄️", ab: "Glacial Lock — freezes the guardian for a turn" },
  { id: "lava", name: "Lava Release", a: "fire", aLv: 6, b: "earth", bLv: 5, icon: "🌋", ab: "Molten Burst — heavy strike, burns after" },
  { id: "storm", name: "Storm Release", a: "lightning", aLv: 6, b: "wind", bLv: 5, icon: "🌩️", ab: "Tempest Lance — pierces the guardian's guard" },
  { id: "wood", name: "Wood Release", a: "water", aLv: 5, b: "earth", bLv: 6, icon: "🌳", ab: "Root Bind — weakens the guardian for two turns" },
  { id: "magnet", name: "Magnet Release", a: "lightning", aLv: 5, b: "earth", bLv: 6, icon: "🧲", ab: "Iron Pull — drags the guardian off balance" },
  { id: "scorch", name: "Scorch Release", a: "fire", aLv: 7, b: "wind", bLv: 4, icon: "☀️", ab: "Scorch Halo — searing damage over time" },
  { id: "steam", name: "Steam Release", a: "fire", aLv: 5, b: "water", bLv: 5, icon: "♨️", ab: "Steam Veil — mend wounds, harder to hit" },
  { id: "crystal", name: "Crystal Release", a: "earth", aLv: 6, b: "yin", bLv: 4, icon: "💠", ab: "Crystal Prison — roots and reflects" },
  { id: "sand", name: "Sandstorm Release", a: "wind", aLv: 5, b: "earth", bLv: 5, icon: "🏜️", ab: "Sand Shroud — high evade chance" }
];
function comboUnlocked(c, cb) { return chmLvl(c.chm.xp[cb.a] || 0).lvl >= cb.aLv && chmLvl(c.chm.xp[cb.b] || 0).lvl >= cb.bLv; }

function drillReady(c, elId) {
  const t = c.chm.drills[elId] || 0;
  return Date.now() >= t + DRILL_COOLDOWN_MS;
}
function chakraBattleBonusAlt() { return chakraBattleBonus(); }

function renderChakra() {
  const c = p1char(SAVE);
  const body = $q("#p1body");
  body.textContent = "";
  body.append(hh("div", { class: "p1title" }, "Elemental mastery"));
  body.append(hh("p", { style: { margin: "0 0 10px", fontSize: ".74rem", color: "#a8c4de" } }, "Drill each nature to raise its mastery (Lv 0-10). Mastery sharpens your jutsu in trials and unlocks advanced combinations. Awakening begins at Lv 8."));
  const grid = hh("div", { class: "p1grid" });
  for (const e of ELEMENTS) {
    const xp = c.chm.xp[e.id] || 0;
    const st = chmLvl(xp);
    const card = hh("div", { class: "p1card" });
    card.append(hh("h4", {}, e.icon + " " + e.name + " — Lv " + st.lvl + (st.lvl >= 8 ? " ✦ awakened" : "")));
    card.append(hh("div", { class: "p1bar" }, hh("i", { style: { width: (st.lvl >= 10 ? 100 : (st.into / Math.max(1, st.need)) * 100) + "%" } })));
    const cd = !drillReady(c, e.id);
    const left = Math.max(0, (c.chm.drills[e.id] || 0) + DRILL_COOLDOWN_MS - Date.now());
    card.append(hh("div", { class: "p1row" },
      hh("button", { class: "p1btn" + (cd ? " ghost" : ""), disabled: cd, onclick: () => startDrill(e) }, cd ? "Recover " + Math.ceil(left / 1000) + "s" : "Train drill"),
      hh("span", { class: "p1stat", style: { flex: "1" } }, hh("span", {}, st.lvl >= 10 ? "Mastered" : "next: " + fmtN(st.into) + "/" + fmtN(st.need)), hh("b", {}, st.lvl >= 10 ? "✦" : ""))));
    grid.append(card);
  }
  body.append(grid);
  body.append(hh("div", { class: "p1title", style: { marginTop: "16px" } }, "Advanced combinations"));
  const cw = hh("div", { class: "p1combo" });
  for (const cb of COMBOS) {
    const on = comboUnlocked(c, cb);
    const line = hh("div", { class: "p1comboline" + (on ? " on" : "") },
      hh("b", {}, cb.icon + " " + cb.name),
      hh("span", { class: "req" }, cap(cb.a) + " Lv " + cb.aLv + " + " + cap(cb.b) + " Lv " + cb.bLv + " — " + cb.ab),
      on ? hh("span", { class: "p1pill", style: { color: "#8ef2b8", borderColor: "#3fbf7a" } }, "Unlocked") : hh("span", { class: "p1pill" }, "Locked"));
    cw.append(line);
  }
  body.append(cw);
}

/* ---------- drill minigame ---------- */
function startDrill(e) {
  const c = p1char(SAVE);
  const modal = $q("#p1m");
  if (!modal) return;
  const pane = $q("#p1body");
  pane.textContent = "";
  pane.append(hh("div", { class: "p1title" }, e.icon + " " + e.name + " drill — chakra control"));
  pane.append(hh("p", { style: { margin: "0 0 8px", fontSize: ".74rem", color: "#a8c4de" } }, "Tap when the marker is inside the blue zone. Center hits are perfect."));
  const zone = hh("div", { class: "p1zone" });
  const tgtW = 22 + Math.max(0, 8 - chmLvl(c.chm.xp[e.id] || 0).lvl) * 1.2;
  const tgtL = rnd(12, 78);
  zone.append(hh("div", { class: "tgt", style: { left: tgtL + "%", width: tgtW + "%" } }));
  const mk = hh("div", { class: "mk", style: { left: "0%" } });
  zone.append(mk);
  pane.append(zone);
  const status = hh("div", { class: "p1stat" }, hh("span", {}, "3 attempts"), hh("b", {}, "0 xp"));
  pane.append(status);
  let pos = 0, dir = 1, speed = 0.55 + Math.min(0.5, chmLvl(c.chm.xp[e.id] || 0).lvl * 0.05), tries = 3, gained = 0, raf = null, done = false;
  function tick() {
    if (done) return;
    pos += dir * speed;
    if (pos > 100) { pos = 100; dir = -1; } if (pos < 0) { pos = 0; dir = 1; }
    mk.style.left = pos + "%";
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  zone.addEventListener("pointerdown", () => {
    if (done) return;
    const inT = pos >= tgtL && pos <= tgtL + tgtW;
    const center = Math.abs(pos - (tgtL + tgtW / 2)) < tgtW * 0.22;
    const xp = center ? 14 : inT ? 8 : 2;
    gained += xp; tries--;
    status.children[1].textContent = gained + " xp";
    if (center) toast("Perfect control! +" + xp);
    else if (inT) toast("In the zone. +" + xp);
    else toast("Wild. +" + xp);
    if (tries <= 0) {
      done = true; cancelAnimationFrame(raf);
      c.chm.xp[e.id] = (c.chm.xp[e.id] || 0) + gained;
      c.chm.drills[e.id] = Date.now();
      if (c.w2 && c.w2.counters) c.w2.counters.focus++;
      const before = chmLvl(c.chm.xp[e.id] - gained).lvl, after = chmLvl(c.chm.xp[e.id]).lvl;
      if (after > before) toast(e.icon + " " + e.name + " mastery Lv " + after + "!");
      p1save();
      setTimeout(() => { rerender("chakra"); }, 900);
    }
  });
}

/* ---------- trial battle UI ---------- */
let TRIAL = null;
function startTrial(sp, opts) {
  const c = p1char(SAVE);
  const lv = pLv();
  const rarMul = sp.rarity === "Mythic" ? 2.2 : sp.rarity === "Legendary" ? 1.8 : sp.rarity === "Rare" ? 1.4 : sp.rarity === "Uncommon" ? 1.15 : 1;
  const gNames = { toads: "Elder Toad Sage", wolves: "Alpha of the High Passes", snakes: "The Coiled Warden", hawks: "Talon Sovereign", slugs: "The Great Matriarch", foxes: "Nine-Tailed Trickster", komainu: "Shrine Sentinel", raiju: "Storm-Borne Raiju", dragons: "Ember King" };
  const activeSp = c.sum.active && spById(c.sum.active);
  TRIAL = battleStart(activeSp || null, gNames[sp.id] || "Contract Guardian", { gmul: rarMul, combo: bestCombo() });
  TRIAL.sp = sp; TRIAL.type = opts.type;
  logAdd(TRIAL, (opts.type === "sign" ? "Contract trial for " : "Bond trial for ") + sp.icon + " " + sp.name + " — the guardian takes its stance.", "dim");
  if (activeSp) logAdd(TRIAL, activeSp.icon + " " + activeSp.name + " fights at your side.", "good");
  renderTrial();
}
function bestCombo() {
  const c = p1char(SAVE);
  const on = COMBOS.filter((cb) => comboUnlocked(c, cb));
  return on.length ? on[on.length - 1] : null;
}
function renderTrial() {
  const body = $q("#p1body"); if (!body || !TRIAL) return;
  body.textContent = "";
  const b = TRIAL;
  body.append(hh("div", { class: "p1title" }, (b.type === "sign" ? "Contract trial — " : "Bond trial — ") + b.sp.icon + " " + b.sp.name));
  const bars = hh("div", { class: "p1row", style: { marginBottom: "10px" } },
    hpBar("You", b.php, b.pmax), hpBar(b.gname, b.ghp, b.gmax));
  body.append(bars);
  const logEl = hh("div", { class: "p1log", style: { maxHeight: "220px" } });
  for (const l of b.log) logEl.append(hh("div", {}, hh("span", {}, "")));
  logEl.innerHTML = b.log.map((l) => "<div>" + l + "</div>").join("");
  body.append(logEl);
  logEl.scrollTop = logEl.scrollHeight;
  if (!b.over) {
    const acts = hh("div", { class: "p1row", style: { marginTop: "10px" } },
      hh("button", { class: "p1btn", onclick: () => { battleAct(b, "strike"); renderTrial(); } }, "⚔ Strike"),
      hh("button", { class: "p1btn ghost", onclick: () => { battleAct(b, "guard"); renderTrial(); } }, "🛡 Guard"),
      hh("button", { class: "p1btn ghost", onclick: () => { battleAct(b, "jutsu"); renderTrial(); } }, "🌀 Jutsu"));
    if (b.sum && sSigned(p1char(SAVE), b.sum.sp.id)) acts.append(hh("button", { class: "p1btn ghost", onclick: () => { battleAct(b, "summon"); renderTrial(); } }, b.sum.sp.icon + " Attack"));
    if (b.combo && !b.usedCombo) acts.append(hh("button", { class: "p1btn", style: { background: "#c58bff", borderColor: "#c58bff" }, onclick: () => { battleAct(b, "combo"); renderTrial(); } }, "✨ " + b.combo.name));
    body.append(acts);
  } else {
    const done = hh("div", { class: "p1row", style: { marginTop: "10px" } });
    if (b.win) {
      const c = p1char(SAVE);
      if (b.type === "sign") {
        c.sum.signed[b.sp.id] = { bond: 30, at: Date.now() };
        c.sum.frags[b.sp.id] = 0;
        if (!c.sum.active) c.sum.active = b.sp.id;
        p1save();
        done.append(hh("div", { style: { fontSize: ".8rem", color: "#8ef2b8", fontWeight: 800 } }, "Contract signed — " + b.sp.name + " is yours."));
      } else {
        addBond(b.sp.id, 45);
        c.mats.beastClaw++; c.mats.scrollDust++;
        p1save();
        done.append(hh("div", { style: { fontSize: ".8rem", color: "#8ef2b8", fontWeight: 800 } }, "Bond grows: +45 xp, materials recovered."));
      }
    } else {
      done.append(hh("div", { style: { fontSize: ".8rem", color: "#ff9aa8", fontWeight: 800 } }, "The trial was lost. Train, grow, and return."));
    }
    done.append(hh("button", { class: "p1btn", onclick: () => { startTrial(b.sp, { type: b.type }); } }, "Retry"));
    done.append(hh("button", { class: "p1btn ghost", onclick: () => { TRIAL = null; rerender(); } }, "Back"));
    body.append(done);
  }
}
function hpBar(label, v, max) {
  const w = clampN((v / Math.max(1, max)) * 100, 0, 100);
  return hh("div", { style: { flex: "1", minWidth: "180px" } },
    hh("div", { class: "p1stat" }, hh("span", {}, label), hh("b", {}, fmtN(Math.max(0, v)) + "/" + fmtN(max))),
    hh("div", { class: "p1bar", style: { marginTop: "4px" } }, hh("i", { style: { width: w + "%" } })));
}

/* ---------- shell ---------- */
let CUR = "summons";
let SFX = null;
function V_ui() { if (SFX) { try { SFX(); } catch {} } }
function rerender(t) { CUR = t || CUR; if (CUR === "summons") renderSummons(); else renderChakra(); }
function toast(msg) {
  let t = $q("#p1toast");
  if (!t) { t = hh("div", { id: "p1toast", class: "p1toast" }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}
function open(system, save, sfx) {
  SAVE = save || null;
  SFX = sfx || null;
  p1load();
  if (system === "training" || system === "forge") { import("./phase1b.js?v=p1124").then(m => m.open(system, save, sfx)).catch(t => { console.error("phase1b", t); toast("Training suite failed to load."); }); return; }
  if (!$q("#p1css")) { const st = document.createElement("style"); st.id = "p1css"; st.textContent = CSS; document.head.append(st); }
  CUR = system === "chakra" ? "chakra" : "summons";
  let ov = $q("#p1ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p1ov" },
    hh("div", { class: "p1m", id: "p1m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "World Expansion · Phase 1"),
        hh("span", { class: "p1who" }, pName() + " · Lv " + pLv()),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeP1 }, "✕")),
      hh("div", { class: "p1tabs" },
        hh("button", { class: "p1tab", id: "p1tab-summons", onclick: () => { V_ui(); rerender("summons"); } }, "🧬 Summons"),
        hh("button", { class: "p1tab", id: "p1tab-chakra", onclick: () => { V_ui(); rerender("chakra"); } }, "🌀 Chakra Mastery")),
      hh("div", { class: "p1body", id: "p1body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Phase 1 — Summoning Contracts & Chakra Nature Mastery"),
        hh("span", {}, "Summoning · Chakra Mastery · Training · Forging"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeP1(); });
  rerender(CUR);
}
function closeP1() { const ov = $q("#p1ov"); if (ov) ov.remove(); TRIAL = null; }
export { open, hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, setWeaponHook, setTrainHook, V_ui };
