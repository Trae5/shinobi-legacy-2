/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 1b
   Systems: Training Simulator + Weapon Forging
   Depends on phase1.js (shared helpers, mats, battle hook).
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, setWeaponHook, setTrainHook, V_ui } from "./phase1.js?v=p1129";

/* ---------- player-side store (same save object as phase 1) ---------- */
function trnChar() {
  const c = p1char();
  c.trn = c.trn || { xp: { tai: 0, gen: 0, nin: 0, shu: 0 }, last: {} };
  c.fr = c.fr || { owned: {}, eq: null };
  return c;
}
function trnLvl(xp) { let l = 0, into = xp, need = 40; while (into >= need && l < 10) { into -= need; l++; need = Math.round(need * 1.45); } return { lvl: l, into, need: l >= 10 ? 0 : need }; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function matsOf() { return trnChar().mats; }
function matsLine(m) { return "⚙ " + m.ore + " ore · ✻ " + m.scrollDust + " dust · 🐾 " + m.beastClaw + " claw · 🟢 " + m.jade + " jade"; }

/* ---------- weapon hook (battle bonus) ---------- */
setWeaponHook(() => {
  const c = trnChar();
  const w = c.fr && c.fr.eq ? WEAPONS.find(w => w.id === c.fr.eq) : null;
  let b = 0;
  if (w) b += w.bonus * (1 + 0.25 * ((c.fr.owned[w.id]) || 0));
  for (const k in c.trn.xp) b += trnLvl(c.trn.xp[k]).lvl * 0.012;
  return Math.min(0.6, b);
});

/* ============================================================
   SYSTEM 3 — TRAINING SIMULATOR
   ============================================================ */
const TRAININGS = [
  { id: "tai", name: "Taijutsu Gauntlet", icon: "🥊", kind: "timing", desc: "Strike the pads on the beat. Builds raw melee power.", game: "rings", speed: 900 },
  { id: "nin", name: "Ninjutsu Kata", icon: "🌀", kind: "precision", desc: "Hold your chakra in the seal band. Sharpens jutsu damage.", game: "zone", speed: 1400, w: 24 },
  { id: "shu", name: "Shuriken Range", icon: "🎯", kind: "reaction", desc: "Throw at the flash. Trains reflexes and evasion.", game: "flash", speed: 1000 },
  { id: "gen", name: "Genjutsu Labyrinth", icon: "👁", kind: "memory", desc: "Memorize the sigil path, then walk it back. Trains the mind.", game: "memory", speed: 0 }
];
const TRAIN_COOLDOWN_MS = 90 * 1000;
function trnReady(k) { const c = trnChar(); return (Date.now() - (c.trn.last[k] || 0)) >= TRAIN_COOLDOWN_MS; }
function trnNext(k) { const c = trnChar(); const left = (c.trn.last[k] || 0) + TRAIN_COOLDOWN_MS - Date.now(); return left > 0 ? Math.ceil(left / 1000) : 0; }

/* minigames return 0..100 score */
function runMinigame(t, done) {
  const body = $q("#p1body");
  body.textContent = "";
  const wrap = hh("div", { class: "p1drill", style: { gap: "14px" } });
  body.append(hh("div", { class: "p1title" }, t.icon + " " + t.name));
  body.append(wrap);
  let score = 0, rounds = 5, doneRounds = 0, alive = true;
  const finish = () => {
    if (!alive) return;
    alive = false;
    done(Math.round(score / rounds));
  };
  const nextRound = () => {
    if (!alive) return;
    if (doneRounds >= rounds) { finish(); return; }
    doneRounds++;
    if (t.game === "rings") gameRings(wrap, t, res => { score += res; nextRound(); });
    else if (t.game === "zone") gameZone(wrap, t, res => { score += res; nextRound(); });
    else if (t.game === "flash") gameFlash(wrap, t, res => { score += res; nextRound(); });
    else gameMemory(wrap, t, res => { score += res; nextRound(); });
  };
  const go = hh("div", { class: "p1row" }, hh("button", { class: "p1btn", onclick: () => { go.remove(); nextRound(); } }, "Begin"));
  wrap.append(hh("p", { style: { margin: "0", fontSize: ".74rem", color: "#a8c4de" } }, t.desc + " Five rounds. Score rolls into " + cap(t.id) + " training XP."));
  wrap.append(go);
  const cancel = hh("button", { class: "p1btn ghost", onclick: () => { alive = false; renderTraining(); } }, "Step out");
  wrap.append(cancel);
}
function gameRings(host, t, cb) {
  const line = hh("div", { class: "p1row" }, hh("span", { class: "p1stat" }, "Tap when the marker crosses the pad"));
  const zone = hh("div", { class: "p1zone" }, hh("i", { class: "mk", style: { left: "0%" } }));
  const pad = hh("i", { class: "tgt", style: { left: "62%", width: "16%" } });
  zone.append(pad);
  host.append(line, zone);
  let pos = 0, dir = 1, raf = null;
  const spd = (900 / 1000) * 60;
  const step = () => { pos += dir * spd / 60; if (pos >= 100) { pos = 100; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; } zone.querySelector(".mk").style.left = pos + "%"; raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
  zone.onclick = () => {
    cancelAnimationFrame(raf);
    const hit = pos >= 60 && pos <= 80;
    const res = hit ? Math.round(60 + (16 - Math.abs(pos - 70) * 2.4)) : Math.max(0, Math.round(30 - Math.abs(pos - 70) * 0.6));
    line.firstChild.textContent = hit ? "Hit! +" + res : "Off the pad (" + res + ")";
    setTimeout(() => { zone.remove(); line.remove(); cb(res); }, 550);
  };
}
function gameZone(host, t, cb) {
  const line = hh("div", { class: "p1row" }, hh("span", { class: "p1stat" }, "Stop the chakra inside the seal"));
  const zone = hh("div", { class: "p1zone" });
  const tgt = hh("i", { class: "tgt", style: { left: "40%", width: t.w + "%" } });
  const mk = hh("i", { class: "mk", style: { left: "0%" } });
  zone.append(tgt, mk);
  host.append(line, zone);
  let pos = 0, dir = 1, raf = null;
  const step = () => { pos += dir * (1400 / 1000) * 1.7; if (pos >= 100) { pos = 100; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; } mk.style.left = pos + "%"; raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
  zone.onclick = () => {
    cancelAnimationFrame(raf);
    const lo = 40, hi = 40 + t.w;
    const inBand = pos >= lo && pos <= hi;
    const res = inBand ? Math.round(100 - Math.abs(pos - (lo + hi) / 2) * 3) : 0;
    line.firstChild.textContent = inBand ? "Sealed! +" + res : "Chakra slipped (" + res + ")";
    setTimeout(() => { zone.remove(); line.remove(); cb(Math.max(0, res)); }, 550);
  };
}
function gameFlash(host, t, cb) {
  const line = hh("div", { class: "p1row" }, hh("span", { class: "p1stat" }, "Throw at the flash"));
  const zone = hh("div", { class: "p1zone", style: { height: "70px" } });
  host.append(line, zone);
  let lit = false, raf = null, answered = false;
  const schedule = () => {
    raf = setTimeout(() => {
      lit = true;
      zone.style.background = "linear-gradient(90deg,rgba(255,211,74,.55),rgba(255,211,74,.2))";
      zone._t0 = performance.now();
      const miss = setTimeout(() => { if (!answered) { answered = true; line.firstChild.textContent = "Too slow (0)"; setTimeout(() => { zone.remove(); line.remove(); cb(0); }, 450); } }, 650);
      zone._miss = miss;
    }, 500 + Math.random() * 1400);
  };
  zone.onclick = () => {
    if (answered) return;
    answered = true;
    clearTimeout(zone._miss);
    if (!lit) { clearTimeout(raf); line.firstChild.textContent = "Threw early (0)"; setTimeout(() => { zone.remove(); line.remove(); cb(0); }, 450); return; }
    const dt = performance.now() - zone._t0;
    const res = Math.max(10, Math.round(100 - dt / 6.5));
    line.firstChild.textContent = "Direct hit! +" + res;
    setTimeout(() => { zone.remove(); line.remove(); cb(res); }, 450);
  };
  schedule();
}
function gameMemory(host, t, cb) {
  const SIG = ["🔥", "💧", "🌬", "🪨", "⚡", "🌌"];
  const line = hh("div", { class: "p1row" }, hh("span", { class: "p1stat" }, "Watch the path…"));
  const grid = hh("div", { class: "p1row", style: { gap: "8px" } });
  host.append(line, grid);
  const seq = [];
  for (let i = 0; i < 4; i++) seq.push(Math.floor(Math.random() * SIG.length));
  const cells = seq.map(() => hh("button", { class: "p1tab", style: { fontSize: "1.1rem", padding: "10px 14px" } }, "…"));
  cells.forEach(c => grid.append(c));
  let idx = 0;
  const reveal = () => {
    if (idx >= seq.length) {
      line.firstChild.textContent = "Now walk it back.";
      let stepI = 0;
      cells.forEach((cell, ci) => {
        cell.textContent = SIG[ci];
        cell.onclick = () => {
          if (stepI >= seq.length || cell._lock) return;
          cell._lock = true;
          if (ci === seq[stepI]) { stepI++; cell.style.borderColor = "#3fbf7a"; if (stepI >= seq.length) { const res = 92 + Math.floor(Math.random() * 8); line.firstChild.textContent = "Path held. +" + res; setTimeout(() => { grid.remove(); line.remove(); cb(res); }, 500); } }
          else { const res = Math.round(stepI * 20); line.firstChild.textContent = "The genjutsu took you (" + res + ")"; setTimeout(() => { grid.remove(); line.remove(); cb(res); }, 500); }
        };
      });
      return;
    }
    const ci = seq[idx];
    cells.forEach((c, i) => { c.textContent = i === ci ? SIG[ci] : "…"; c.style.borderColor = i === ci ? "#46b7ff" : ""; });
    idx++;
    setTimeout(reveal, 620);
  };
  setTimeout(reveal, 400);
}
function finishTraining(t, score) {
  const c = trnChar();
  const trainMult = 1 + TRAIN_HOOKS.reduce((a, f) => a + (f() || 0), 0);
  const gain = Math.round((8 + pLv() * 1.1) * (score / 100) * (1 + score / 220) * trainMult);
  c.trn.xp[t.id] = (c.trn.xp[t.id] || 0) + Math.max(3, gain);
  c.trn.last[t.id] = Date.now();
  if (Math.random() < 0.3) { c.mats.ore += 1; }
  if (Math.random() < 0.14) { c.mats.scrollDust += 1; }
  if (c.w2 && c.w2.counters) c.w2.counters.train++;
  p1save();
  toast(cap(t.id) + " training +" + Math.max(3, gain) + " xp");
  renderTraining();
}

/* ---------- training UI ---------- */
function renderTraining() {
  const c = trnChar();
  const body = $q("#p1body");
  if (!body) return;
  body.textContent = "";
  body.append(hh("div", { class: "p1title" }, "Training grounds"));
  body.append(hh("p", { style: { margin: "0 0 10px", fontSize: ".74rem", color: "#a8c4de" } }, "Run the drills to sharpen your craft (each craft levels 0-10). Every level feeds your power in trials. Score high to train faster."));
  const grid = hh("div", { class: "p1grid" });
  for (const t of TRAININGS) {
    const xp = c.trn.xp[t.id] || 0;
    const st = trnLvl(xp);
    const cd = !trnReady(t.id);
    const left = trnNext(t.id);
    const card = hh("div", { class: "p1card" });
    card.append(hh("h4", {}, t.icon + " " + t.name + " — Lv " + st.lvl));
    card.append(hh("div", { class: "p1bar" }, hh("i", { style: { width: (st.lvl >= 10 ? 100 : (st.into / Math.max(1, st.need)) * 100) + "%" } })));
    card.append(hh("p", {}, t.desc));
    card.append(hh("div", { class: "p1row" },
      hh("button", { class: "p1btn" + (cd ? " ghost" : ""), disabled: cd, onclick: () => runMinigame(t, s => finishTraining(t, s)) }, cd ? "Rest " + left + "s" : "Run drill"),
      hh("span", { class: "p1stat", style: { flex: "1" } }, hh("span", {}, st.lvl >= 10 ? "Mastered" : "next: " + fmtN(st.into) + "/" + fmtN(st.need)))));
    grid.append(card);
  }
  body.append(grid);
}

/* ============================================================
   SYSTEM 4 — WEAPON FORGING
   ============================================================ */
const WEAPONS = [
  { id: "kunai", name: "Steel Kunai", icon: "🗡", tier: "Common", bonus: 0.05, cost: { ore: 3 }, desc: "A balanced starter blade. Every shinobi's first friend." },
  { id: "edge", name: "Chakra Edge", icon: "⚔", tier: "Uncommon", bonus: 0.12, cost: { ore: 5, scrollDust: 2 }, desc: "A blade that drinks chakra. Humming faintly, always." },
  { id: "cleaver", name: "Beast-Fang Cleaver", icon: "🪓", tier: "Rare", bonus: 0.20, cost: { ore: 8, beastClaw: 4 }, desc: "Forged from a contract beast's shed fang. Heavy, hungry." },
  { id: "sigil", name: "Sage Sigil Blade", icon: "🔱", tier: "Epic", bonus: 0.30, cost: { ore: 12, scrollDust: 6, jade: 2 }, desc: "Sage script runs the fuller. It answers to focus alone." },
  { id: "relic", name: "Dragonforged Relic", icon: "🐉", tier: "Legendary", bonus: 0.45, cost: { ore: 18, beastClaw: 8, jade: 5 }, desc: "Quenched in dragonfire. The old kings' answer to war." }
];
function wCanForge(c, w) { for (const k in w.cost) if ((c.mats[k] || 0) < w.cost[k]) return false; return true; }
function wOwned(c, w) { return c.fr.owned[w.id] != null; }
function wPlus(c, w) { return c.fr.owned[w.id] || 0; }
function wBonus(c, w) { return w.bonus * (1 + 0.25 * wPlus(c, w)); }
function wUpCost(c, w) { const p = wPlus(c, w); const m = {}; for (const k in w.cost) m[k] = Math.ceil(w.cost[k] * (0.8 + p * 0.7)); return m; }
function wTierColor(t) { return t === "Legendary" ? "#ffb347" : t === "Epic" ? "#c58bff" : t === "Rare" ? "#5fb0ff" : t === "Uncommon" ? "#8fd2a0" : "#9cc6e8"; }

function doForge(w) {
  const c = trnChar();
  if (wOwned(c, w)) { toast("Already forged — upgrade it instead."); return; }
  if (!wCanForge(c, w)) { toast("Not enough materials."); return; }
  for (const k in w.cost) c.mats[k] -= w.cost[k];
  c.fr.owned[w.id] = 0;
  if (!c.fr.eq) c.fr.eq = w.id;
  p1save();
  if (c.w2 && c.w2.counters) c.w2.counters.forge++;
  toast(w.icon + " " + w.name + " forged! Quenched and sharp.");
  renderForge();
}
function doUpgrade(w) {
  const c = trnChar();
  if (!wOwned(c, w)) return;
  const p = wPlus(c, w);
  if (p >= 5) { toast("Master-forged already."); return; }
  const cost = wUpCost(c, w);
  
  for (const k in cost) if ((c.mats[k] || 0) < cost[k]) { toast("Not enough materials for +" + (p + 1) + "."); return; }
  for (const k in cost) c.mats[k] -= cost[k];
  c.fr.owned[w.id] = p + 1;
  p1save();
  if (c.w2 && c.w2.counters) c.w2.counters.forge++;
  toast(w.icon + " " + w.name + " +" + (p + 1) + "! Sparks fly off the anvil.");
  renderForge();
}
function doEquip(w) {
  const c = trnChar();
  if (!wOwned(c, w)) { toast("Forge it first."); return; }
  c.fr.eq = c.fr.eq === w.id ? null : w.id;
  p1save();
  toast(c.fr.eq ? w.icon + " " + w.name + " equipped." : "Weapon stowed.");
  renderForge();
}

/* ---------- forge UI ---------- */
function renderForge() {
  const c = trnChar();
  const body = $q("#p1body");
  if (!body) return;
  body.textContent = "";
  body.append(hh("div", { class: "p1title" }, "The forge"));
  body.append(hh("div", { class: "p1row", style: { marginBottom: "10px" } },
    hh("span", { class: "p1pill" }, matsLine(c)),
    c.fr.eq ? (() => { const w = WEAPONS.find(x => x.id === c.fr.eq); return hh("span", { class: "p1pill", style: { color: "#ffd34a", borderColor: "#ffd34a" } }, "Equipped: " + w.icon + " " + w.name + " +" + (wBonus(c, w) * 100).toFixed(0) + "% power"); })() : hh("span", { class: "p1pill" }, "No weapon equipped")));
  const grid = hh("div", { class: "p1grid" });
  for (const w of WEAPONS) {
    const own = wOwned(c, w);
    const p = wPlus(c, w);
    const card = hh("div", { class: "p1card" + (own ? "" : " locked") });
    card.append(hh("h4", {}, w.icon + " " + w.name + (own ? " +" + p : ""),
      hh("span", { class: "p1rar", style: { color: wTierColor(w.tier), borderColor: wTierColor(w.tier), marginLeft: "auto" } }, w.tier)));
    card.append(hh("p", {}, w.desc));
    if (own) {
      card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Power"), hh("b", {}, "+" + (wBonus(c, w) * 100).toFixed(0) + "%")));
      const up = wUpCost(c, w);
      const upTxt = Object.keys(up).map(k => up[k] + " " + k).join(" · ");
      card.append(hh("div", { class: "p1row" },
        hh("button", { class: "p1btn ghost", onclick: () => doEquip(w) }, c.fr.eq === w.id ? "Stow" : "Equip"),
        hh("button", { class: "p1btn", disabled: p >= 5, onclick: () => doUpgrade(w) }, p >= 5 ? "Master-forged" : "Upgrade +" + (p + 1))));
      if (p < 5) card.append(hh("div", { class: "p1timer" }, "Upgrade costs: " + upTxt));
    } else {
      const costTxt = Object.keys(w.cost).map(k => w.cost[k] + " " + k).join(" · ");
      card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Power"), hh("b", {}, "+" + (w.bonus * 100).toFixed(0) + "%")));
      card.append(hh("div", { class: "p1row" }, hh("button", { class: "p1btn", disabled: !wCanForge(c, w), onclick: () => doForge(w) }, wCanForge(c, w) ? "Forge" : "Need mats")));
      card.append(hh("div", { class: "p1timer" }, "Costs: " + costTxt));
    }
    grid.append(card);
  }
  body.append(grid);
  body.append(hh("div", { class: "p1timer", style: { marginTop: "10px" } }, "Materials come from contract hunts and training runs. Jade is rare — the wilds keep it deep."));
}

/* ---------- phase 1b modal ---------- */
let CUR1B = "training";
function rerender1B(sys) { CUR1B = sys; for (const id of ["training", "forge"]) { const t = $q("#p1tab-" + id); if (t) t.classList.toggle("on", id === sys); } if (sys === "forge") renderForge(); else renderTraining(); }
function open1b(system, save, sfx) {
  CUR1B = system === "forge" ? "forge" : "training";
  if (!$q("#p1css")) { const st = document.createElement("style"); st.id = "p1css"; st.textContent = CSS; document.head.append(st); }
  let ov = $q("#p1ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p1ov" },
    hh("div", { class: "p1m", id: "p1m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "World Expansion · Phase 1"),
        hh("span", { class: "p1who" }, pName() + " · Lv " + pLv()),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: close1b }, "✕")),
      hh("div", { class: "p1tabs" },
        hh("button", { class: "p1tab" + (CUR1B === "training" ? " on" : ""), id: "p1tab-training", onclick: () => { V_ui(); rerender1B("training"); } }, "🥊 Training"),
        hh("button", { class: "p1tab" + (CUR1B === "forge" ? " on" : ""), id: "p1tab-forge", onclick: () => { V_ui(); rerender1B("forge"); } }, "⚒ Forge")),
      hh("div", { class: "p1body", id: "p1body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Phase 1 — Training Simulator & Weapon Forging"),
        hh("span", {}, "Summoning · Chakra Mastery · Training · Forging"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) close1b(); });
  rerender1B(CUR1B);
}
function close1b() { const ov = $q("#p1ov"); if (ov) ov.remove(); }
export { open1b as open };
