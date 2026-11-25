/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 3
   Player Activities: Bounty Board, Gambling Den, Wild Gathering
   Depends on phase1.js (helpers, battle engine, mats).
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, setTrainHook, V_ui } from "./phase1.js?v=p1129";

let SAVE3 = null;
function aChar() {
  const c = p1char(SAVE3);
  c.a3 = c.a3 || { bounties: {}, dice: {}, gather: {}, counts: { b: 0, d: 0, g: 0 }, lastGather: 0 };
  return c;
}
function aRyo() { return Math.max(0, Math.floor((SAVE3 && SAVE3.ryo) || 0)); }
function aSpend(n) { if (!SAVE3 || aRyo() < n) return false; SAVE3.ryo = Math.max(0, Math.floor(SAVE3.ryo || 0) - n); return true; }
function aGain(n) { if (SAVE3) SAVE3.ryo = Math.max(0, Math.floor(SAVE3.ryo || 0) + n); }

/* ============================================================
   SYSTEM A — BOUNTY BOARD (named rogue hunts = custom trials)
   ============================================================ */
const BOUNTIES = [
  { id: "b1", name: "Kurogane the Cutpurse", icon: "🗡", reqLv: 5, atk: 22, hp: 130, pay: 1500, mats: { ore: 2 }, desc: "Robs travelers on the north road. Fast, sloppy, greedy." },
  { id: "b2", name: "The Weeping Blade", icon: "🌧", reqLv: 12, atk: 38, hp: 300, pay: 4200, mats: { scrollDust: 2 }, desc: "A disgraced swordsman who never stopped collecting debts." },
  { id: "b3", name: "Mad Dog Genzo", icon: "🐺", reqLv: 20, atk: 60, hp: 620, pay: 9500, mats: { beastClaw: 3 }, desc: "Fights like a beast because he stopped being anything else." },
  { id: "b4", name: "Wraith of the Ashen Pass", icon: "👻", reqLv: 30, atk: 95, hp: 1200, pay: 22000, mats: { jade: 1, ore: 4 }, desc: "Survivors say it walks through fire without burning." },
  { id: "b5", name: "Kagura, the Silent Fang", icon: "🌙", reqLv: 42, atk: 150, hp: 2400, pay: 60000, mats: { jade: 2, beastClaw: 4 }, desc: "An assassin so quiet even her contracts forget her name." }
];
function bountyReady(id) { const c = aChar(); return (Date.now() - (c.a3.bounties[id] || 0)) >= 20 * 60000; }
function bountyLeft(id) { return Math.max(0, (aChar().a3.bounties[id] || 0) + 20 * 60000 - Date.now()); }
function doBounty(b) {
  if (pLv() < b.reqLv) { toast("This bounty needs Lv " + b.reqLv + "."); return; }
  if (!bountyReady(b.id)) { toast(b.name + " is still hiding. " + Math.ceil(bountyLeft(b.id) / 60000) + " min left."); return; }
  const c = aChar();
  c.a3.bounties[b.id] = Date.now();
  c.a3.counts.b = (c.a3.counts.b || 0) + 1;
  p1save();
  startBountyFight(b);
}
function startBountyFight(b) {
  startTrial({ custom: true, icon: b.icon, name: b.name, atk: Math.round(b.atk * (1 + pLv() * 0.04)), hp: b.hp, reward: { ryo: b.pay, mats: b.mats } }, { type: "bounty" });
}

/* ============================================================
   SYSTEM B — GAMBLING DEN (chakra dice, ryo wagers)
   ============================================================ */
const DICE_COSTS = [100, 500, 2000, 10000];
function doDice(wager) {
  if (aRyo() < wager) { toast("You don't carry that much."); return; }
  const p = [rnd(1, 6), rnd(1, 6)];
  const d = [rnd(1, 6), rnd(1, 6)];
  const ps = p[0] + p[1], ds = d[0] + d[1];
  let delta = 0, line = "";
  if (ps > ds) { delta = wager; aGain(wager); line = "You roll " + ps + " vs " + ds + ". You take the pot: +" + fmtN(wager) + " ryo"; }
  else if (ps < ds) { delta = -wager; aSpend(wager); line = "You roll " + ps + " vs " + ds + ". House takes it: -" + fmtN(wager) + " ryo"; }
  else { line = "Both roll " + ps + ". Push. The pot stays put."; }
  const c = aChar();
  c.a3.counts.d = (c.a3.counts.d || 0) + 1;
  p1save();
  toast("🎲 " + line);
  renderActivities();
}

/* ============================================================
   SYSTEM C — WILD GATHERING (materials from the land)
   ============================================================ */
const MAT_NAMES = { scrollDust: "scroll dust", ore: "iron ore", beastClaw: "beast claws", jade: "jade shards", herb: "herbs" };
const matName = (k) => MAT_NAMES[k] || k;
const GATHER_SPOTS = [
  { id: "herbs", name: "Medicinal Grove", icon: "🌿", cd: 8 * 60000, mats: { scrollDust: [1, 3] }, desc: "Seal-paper reeds grow thick here." },
  { id: "mine", name: "Old Iron Mine", icon: "⛏", cd: 15 * 60000, mats: { ore: [2, 5] }, desc: "Abandoned, but the veins never ran dry." },
  { id: "crag", name: "Beast Crag", icon: "🦴", cd: 25 * 60000, mats: { beastClaw: [1, 3] }, desc: "Where the wild things sharpen themselves." },
  { id: "spring", name: "Jade Spring", icon: "💦", cd: 60 * 60000, mats: { jade: [1, 1] }, ryo: [200, 600], desc: "Cold, clear, and stingy with its treasure." }
];
function gatherReady(s) { return (Date.now() - (aChar().a3.gather[s.id] || 0)) >= s.cd; }
function gatherLeft(s) { return Math.max(0, (aChar().a3.gather[s.id] || 0) + s.cd - Date.now()); }
function doGather(s) {
  if (!gatherReady(s)) { toast("Pickings are thin. " + Math.ceil(gatherLeft(s) / 60000) + " min left."); return; }
  const c = aChar();
  c.a3.gather[s.id] = Date.now();
  c.a3.counts.g = (c.a3.counts.g || 0) + 1;
  const lines = [];
  for (const k in s.mats) { const n = s.mats[k][0] + Math.floor(Math.random() * (s.mats[k][1] - s.mats[k][0] + 1)); c.mats[k] = (c.mats[k] || 0) + n; lines.push("+" + n + " " + matName(k)); }
  if (s.ryo) { const r = s.ryo[0] + Math.floor(Math.random() * (s.ryo[1] - s.ryo[0] + 1)); aGain(r); lines.push("+" + fmtN(r) + " ryo"); }
  p1save();
  toast("Gathered: " + lines.join(" · "));
  renderActivities();
}

/* ============================================================
   UI — Activities overlay (Bounties · Gambling Den · Gathering)
   ============================================================ */
let UI_CB = null, TAB = "bounties";
function setTab(t) { TAB = t; renderActivities(); }
function openActivities(save, cb) {
  SAVE3 = save || null;
  UI_CB = cb || null;
  p1save();
  if (!$q("#p3css")) { const st = document.createElement("style"); st.id = "p3css"; st.textContent = CSS; document.head.append(st); }
  let ov = $q("#p3ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p3ov" },
    hh("div", { class: "p1m", id: "p3m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "World Expansion · Activities"),
        hh("span", { class: "p1who" }, pName() + " · Lv " + pLv() + " · " + fmtN(aRyo()) + " ryo"),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeActivities }, "✕")),
      hh("div", { class: "p1tabs" },
        hh("button", { class: "p1tab", id: "p3tab-bounties", onclick: () => { V_ui(); setTab("bounties"); } }, "🎯 Bounty Board"),
        hh("button", { class: "p1tab", id: "p3tab-den", onclick: () => { V_ui(); setTab("den"); } }, "🎲 Gambling Den"),
        hh("button", { class: "p1tab", id: "p3tab-gather", onclick: () => { V_ui(); setTab("gather"); } }, "🌾 Gathering")),
      hh("div", { class: "p1body", id: "p3body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Phase 3 — Player Activities"),
        hh("span", {}, "Bounties · Chakra Dice · Wild Gathering"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeActivities(); });
  renderActivities();
}
function closeActivities() { const ov = $q("#p3ov"); if (ov) ov.remove(); }
function card(title, sub, btnText, onClick, disabled, foot) {
  return hh("div", { class: "p1card" },
    hh("div", { style: { fontWeight: 800 } }, title),
    hh("div", { style: { fontSize: ".78rem", opacity: .85, margin: "2px 0 6px" } }, sub),
    foot ? hh("div", { style: { fontSize: ".74rem", opacity: .8 } }, foot) : null,
    hh("button", { class: "p1btn", onclick: onClick, disabled: !!disabled }, btnText));
}
function renderActivities() {
  const body = $q("#p3body"); if (!body) return;
  body.textContent = "";
  for (const t of ["bounties", "den", "gather"]) {
    const el = $q("#p3tab-" + t);
    if (el) el.style.opacity = t === TAB ? "1" : ".6";
  }
  const c = aChar();
  if (TAB === "bounties") {
    body.append(hh("div", { class: "p1title" }, "Bounty Board — rogues with a price on their heads"));
    for (const b of BOUNTIES) {
      const locked = pLv() < b.reqLv;
      const cooling = !bountyReady(b.id);
      body.append(hh("div", { class: "p1card", style: { opacity: locked ? ".45" : "1" } },
        hh("div", { style: { fontWeight: 800 } }, b.icon + "  " + b.name + (locked ? "  · Lv " + b.reqLv + " required" : "")),
        hh("div", { style: { fontSize: ".78rem", opacity: .85, margin: "2px 0 6px" } }, b.desc),
        hh("div", { style: { fontSize: ".74rem", opacity: .8 } }, "Reward: " + fmtN(b.pay) + " ryo" + (b.mats ? " + materials" : "")),
        hh("button", { class: "p1btn", disabled: locked || cooling, onclick: () => doBounty(b) },
          cooling ? "Cooldown " + Math.ceil(bountyLeft(b.id) / 60000) + " min" : "Hunt " + b.name)));
    }
  } else if (TAB === "den") {
    body.append(hh("div", { class: "p1title" }, "Gambling Den — chakra dice, two dice each, high roll takes the pot"));
    body.append(hh("div", { style: { fontSize: ".8rem", opacity: .85, marginBottom: "8px" } }, "Fair odds. The house keeps nothing but its pride."));
    for (const w of DICE_COSTS) {
      body.append(hh("div", { class: "p1card" },
        hh("div", { style: { fontWeight: 800 } }, "Wager " + fmtN(w) + " ryo"),
        hh("button", { class: "p1btn", disabled: aRyo() < w, onclick: () => doDice(w) }, aRyo() < w ? "Not enough ryo" : "Roll the dice")));
    }
  } else {
    body.append(hh("div", { class: "p1title" }, "Wild Gathering — pull materials straight from the land"));
    for (const s of GATHER_SPOTS) {
      const cooling = !gatherReady(s);
      body.append(card(s.icon + "  " + s.name, s.desc,
        cooling ? "Restock " + Math.ceil(gatherLeft(s) / 60000) + " min" : "Gather",
        () => doGather(s), cooling,
        Object.keys(s.mats).map(k => matName(k)).join(" · ")));
    }
  }
}
export { openActivities as open, BOUNTIES, doDice, doGather, doBounty, renderActivities, aRyo, aGain, aSpend };
