/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 5
   Legendary Progression: the Hidden One, titles, prestige bonus
   Depends on phase1.js (helpers, trial engine, custom-win hook).
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, setWeaponHook, setCustomWin, startTrial, V_ui } from "./phase1.js?v=p1131";

let SAVE5 = null;
function lChar() {
  const c = p1char(SAVE5);
  c.a5 = c.a5 || { hidden: { won: 0, lastTry: 0 }, titles: {} };
  return c;
}
function counts(c) { return (c.a3 && c.a3.counts) || { b: 0, d: 0, g: 0 }; }

/* -------- titles: earned on check, each is worth +3% battle power -------- */
const TITLES = [
  { id: "hunter", name: "Rogue Hunter", need: (c, n) => n.b >= 5, req: "Win 5 bounties" },
  { id: "green", name: "Hand of the Land", need: (c, n) => n.g >= 15, req: "Gather 15 times" },
  { id: "roller", name: "High Roller", need: (c, n) => n.d >= 25, req: "Roll the den dice 25 times" },
  { id: "contractor", name: "Grand Contractor", need: (c, n) => Object.keys((c.sum && c.sum.signed) || {}).length >= 5, req: "Sign 5 summon contracts" },
  { id: "sovereign", name: "Shadow Sovereign", need: (c) => !!c.a5.hidden.won, req: "Defeat the Hidden One" }
];
function titleMult(c) { return Object.keys(c.a5.titles).length * 3; } /* percent */

/* the permanent bonus plugs into every battle through the weapon hooks */
setWeaponHook(() => { const c = p1char(SAVE5); return c && c.a5 ? titleMult(c) : 0; });

setCustomWin((b) => {
  const c = p1char(SAVE5);
  if (!c.a5) return;
  if (b.legend === "hidden") {
    c.a5.hidden.won = (c.a5.hidden.won || 0) + 1;
    c.a5.titles.sovereign = Date.now();
    c.ryo = Math.max(0, Math.floor(c.ryo || 0)) + 500000;
    p1save();
    toast("You have seen what waits beyond every road. Shadow Sovereign.");
  }
});

/* -------- the Hidden One: one eternal trial at Lv 50+ -------- */
const HIDDEN_COOLDOWN = 6 * 3600 * 1000;
function hiddenReady() { return (Date.now() - (lChar().a5.hidden.lastTry || 0)) >= HIDDEN_COOLDOWN; }
function fightHidden() {
  const c = lChar();
  if (pLv() < 50) { toast("The Hidden One does not stir for ninjas below Lv 50."); return; }
  if (c.a5.hidden.won >= 1) { toast("You already claimed his title. No one fights him twice."); return; }
  if (!hiddenReady()) { toast("The shrine is silent. Try again later."); return; }
  c.a5.hidden.lastTry = Date.now(); p1save();
  const lv = pLv();
  startTrial({ custom: true, icon: "🕳", name: "The Hidden One", atk: Math.round(180 + lv * 4), hp: Math.round(5200 + lv * 90), legend: "hidden" }, { type: "legend" });
}

/* -------- UI -------- */
let UI_CB = null;
function openLegend(save, cb) {
  SAVE5 = save || null;
  UI_CB = cb || null;
  p1save();
  if (!$q("#p5css")) { const st = document.createElement("style"); st.id = "p5css"; st.textContent = CSS; document.head.append(st); }
  let ov = $q("#p5ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p5ov" },
    hh("div", { class: "p1m", id: "p5m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "World Expansion · Legend"),
        hh("span", { class: "p1who" }, pName() + " · Lv " + pLv()),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeLegend }, "✕")),
      hh("div", { class: "p1body", id: "p5body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Phase 5 — Legendary Progression"),
        hh("span", {}, "The Hidden One · Titles · Permanent Power"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeLegend(); });
  renderLegend();
}
function closeLegend() { const ov = $q("#p5ov"); if (ov) ov.remove(); }
function renderLegend() {
  const body = $q("#p5body"); if (!body) return;
  const c = lChar();
  const n = counts(c);
  body.textContent = "";
  body.append(hh("div", { class: "p1title" }, "Legendary progression — titles are forever"));
  body.append(hh("div", { style: { fontSize: ".8rem", opacity: .85, marginBottom: "8px" } },
    "Each earned title grants +3% battle power, permanent. Current bonus: +" + titleMult(c) + "%."));
  for (const t of TITLES) {
    const earned = !!c.a5.titles[t.id];
    body.append(hh("div", { class: "p1card", style: { opacity: earned ? "1" : ".55" } },
      hh("div", { style: { fontWeight: 800 } }, (earned ? "🏆 " : "🔒 ") + t.name + (earned ? "  · earned" : "")),
      hh("div", { style: { fontSize: ".78rem", opacity: .85 } }, t.req)));
  }
  const hid = c.a5.hidden;
  body.append(hh("div", { class: "p1card", style: { marginTop: "10px" } },
    hh("div", { style: { fontWeight: 800 } }, "🕳  The Hidden One"),
    hh("div", { style: { fontSize: ".78rem", opacity: .85, margin: "2px 0 6px" } },
      "A presence older than the villages waits past the shrine. Lv 50+. One fight. Win and the title is yours forever; lose and the shrine seals for six hours."),
    hh("button", { class: "p1btn", onclick: fightHidden },
      hid.won ? "Already defeated" : hiddenReady() ? "Approach the shrine" : "The shrine is sealed")));
}
export { openLegend as open, TITLES, titleMult, fightHidden, renderLegend };
