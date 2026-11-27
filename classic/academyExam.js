/* ============================================================
   Shinobi Legacy: Remastered — Academy Graduation Exam (stage 2)
   Five stages: written · chakra control · clone technique ·
   obstacle course · instructor bout. Pass all five to graduate.
   Loaded on demand by academy.js. Depends on phase1.js helpers.
   ============================================================ */
import { hh, $q, toast, V_ui } from "./phase1.js?v=p1135";

const PASS = 60;
const AEX = "1";

/* ---------- question pool (pick 5 per attempt) ---------- */
const EXAM_Q = [
  { q:"Chakra is formed from…", o:["The body's energy and the spirit's energy","A fruit eaten once in a lifetime","The eyes alone","Tailed beast chakra only"], a:0 },
  { q:"A kunai is best described as…", o:["A throwing dagger with a ring pommel","A healing salve","A type of cloak","A storage scroll"], a:0 },
  { q:"The three basics every graduate must know are…", o:["Clone, Transformation and Substitute","Fireball, Water Dragon and Lightning Blade","Flight, Invisibility and Teleport","Sword, Bow and Axe"], a:0 },
  { q:"The Substitution Jutsu swaps you with…", o:["A nearby object like a log","Your sensei","A shadow clone","Your headband"], a:0 },
  { q:"Hand signs are used to…", o:["Shape and focus chakra into a jutsu","Count time during sparring","Clean your weapon","Call for backup"], a:0 },
  { q:"Genin usually operate in…", o:["Three-man squads led by a sensei","Solo patrols only","Groups of ten","Pairs with a Kage"], a:0 },
  { q:"In this world, chakra natures are discovered by…", o:["The exam's chakra demonstration","Reading birthmarks","Rolling dice","A village lottery"], a:0 },
  { q:"Your headband marks…", o:["Your allegiance to a hidden village","Your favorite color","Your clan only","Your shoe size"], a:0 },
  { q:"The ranks above Genin include…", o:["Chunin, Jonin and beyond","Only Genin exists","Villager and Farmer","Student and Teacher"], a:0 },
  { q:"Mission ranks run from…", o:["D at the bottom to S at the top","A to Z","1 to 100","Hot to cold"], a:0 },
  { q:"Rogues are spotted ahead. Your first move as a Genin squad is…", o:["Signal your squad and hold distance","Charge in alone","Scream and scatter","Go home"], a:0 },
  { q:"Shuriken are…", o:["Star-shaped throwing blades","Boots for sneaking","Bottles of medicine","Types of maps"], a:0 }
];

/* ---------- instructor bout tells ---------- */
const TELLS = [
  { tell:"He feints high — kunai coming for your head!", right:"Duck" },
  { tell:"Low sweep — he's going for your legs!", right:"Jump" },
  { tell:"He flickers — substitute forming — brace!", right:"Guard" }
];
const BOUT_BTNS = [
  { k:"Duck",  glyph:"↓" },
  { k:"Jump",  glyph:"↑" },
  { k:"Guard", glyph:"🛡" }
];

/* ---------- helpers ---------- */
const game = () => window.SL && window.SL.game;
const rnd5 = () => { const q = EXAM_Q.slice(); for (let i=q.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [q[i],q[j]]=[q[j],q[i]]; } return q.slice(0,5); };

let inputPrev = null;
function inputOff(){ try { inputPrev = window.SL.input.enabled; window.SL.input.enabled = false; } catch(e){} }
function inputOn(){ try { window.SL.input.enabled = inputPrev !== false; } catch(e){ inputPrev = null; } inputPrev = null; }

/* ---------- overlay scaffolding ---------- */
const EXAM_CSS = `
.acadExam{position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 100% at 50% 35%,rgba(4,10,26,.55),rgba(2,4,12,.9));font-family:"Segoe UI",system-ui,sans-serif;color:#e8f2ff}
.acadExam.hudMode{background:transparent;pointer-events:none;align-items:flex-end;justify-content:center}
.acadExam.hudMode .acadCard{pointer-events:auto;margin-bottom:14vh;background:rgba(6,10,24,.9)}
.acadCard{width:min(640px,92vw);max-height:86vh;overflow:auto;border:1px solid rgba(70,183,255,.45);border-radius:14px;background:linear-gradient(160deg,rgba(9,15,32,.97),rgba(6,10,24,.97));box-shadow:0 18px 60px rgba(0,0,0,.6);padding:16px 18px 14px}
.acadExamTop{display:flex;align-items:baseline;gap:10px;margin-bottom:10px}
.acadExamTitle{font-size:.8rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#a8e4ff}
.acadExamSub{font-size:.72rem;color:#7fb8d8}
.acadExamX{all:unset;cursor:pointer;margin-left:auto;color:#7fb8d8;font-size:.9rem;padding:2px 8px}
.acadExamName{font-size:1.25rem;font-weight:900;color:#fff;margin-bottom:6px}
.acadExamRules{font-size:.92rem;line-height:1.6;color:#cfe4f5;margin:6px 0}
.acadExamRules.center{text-align:center}
.acadExamRules.muted{color:#8fa8bf}
.acadExamRow{display:flex;gap:10px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
.acadBtn{all:unset;cursor:pointer;font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:9px 16px;border-radius:9px;border:1px solid #46b7ff;color:#04121f;background:#46b7ff}
.acadBtn:hover{filter:brightness(1.12)}
.acadBtn.ghost{background:transparent;color:#a8e4ff;border-color:rgba(70,183,255,.4)}
.acadBtn.wide{display:block;width:100%;text-align:center;margin-top:10px}
.acadBtn.small{padding:6px 10px;font-size:.7rem}
.acadExamBig{font-size:3rem;text-align:center;margin:8px 0}
.acadExamBig.grad{font-size:4.5rem}
.acadExamStats{display:grid;grid-template-columns:1fr auto;gap:4px 12px;margin:10px 0;padding:10px;border:1px solid rgba(70,183,255,.25);border-radius:10px;background:rgba(4,8,20,.6)}
.acadExamStats div{font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:#7fb8d8}
.acadExamStats b{color:#fff}
.acadExamQ{font-size:1.02rem;font-weight:700;margin:10px 0 12px;color:#fff}
.acadExamOpts{display:flex;flex-direction:column;gap:8px}
.acadOpt{all:unset;cursor:pointer;padding:10px 14px;border-radius:10px;border:1px solid rgba(70,183,255,.35);background:rgba(9,16,34,.8);color:#dcecff;font-size:.92rem}
.acadOpt:hover{border-color:#46b7ff;background:rgba(20,40,70,.8)}
.acadOpt.good{border-color:#3ad17a;background:rgba(20,80,50,.7);color:#bff5d5}
.acadOpt.bad{border-color:#e05555;background:rgba(90,20,20,.6);color:#ffd0d0}
.acadChBar{position:relative;height:220px;border-radius:12px;border:1px solid rgba(70,183,255,.35);background:linear-gradient(180deg,rgba(10,18,38,.9),rgba(4,8,20,.9));overflow:hidden;margin:8px 0}
.acadChBand{position:absolute;left:0;right:0;background:linear-gradient(180deg,rgba(70,183,255,.35),rgba(70,183,255,.18));border-top:2px solid #46b7ff;border-bottom:2px solid #46b7ff}
.acadChNeedle{position:absolute;left:0;right:0;height:8px;background:#ffd23a;box-shadow:0 0 12px rgba(255,210,58,.8)}
.acadCloneStage{min-height:220px;display:flex;flex-direction:column;justify-content:center}
.acadCloneRow{display:flex;gap:14px;justify-content:center;margin:14px 0}
.acadClone{width:84px;height:104px;border-radius:12px;border:1px solid rgba(70,183,255,.3);background:rgba(9,16,34,.9);display:flex;align-items:center;justify-content:center;font-size:2.2rem}
.acadClone.flash{box-shadow:0 0 0 3px #ffd23a,0 0 24px rgba(255,210,58,.6)}
.acadClone.pickable{cursor:pointer}
.acadClone.pickable:hover{border-color:#46b7ff}
.acadClone.good{border-color:#3ad17a;box-shadow:0 0 0 2px #3ad17a}
.acadClone.bad{border-color:#e05555}
.acadCoursePill{display:flex;align-items:center;gap:10px;font-size:1rem;padding:10px 16px;border-radius:999px;border:1px solid rgba(70,183,255,.5);background:rgba(6,10,24,.92);box-shadow:0 8px 30px rgba(0,0,0,.5)}
.acadCourseArrow{color:#ffd23a;font-size:1.3rem}
.acadBoutTell{font-size:1.05rem;font-weight:800;min-height:3em;text-align:center;color:#fff;margin:8px 0}
.acadBoutRow{display:flex;gap:10px;justify-content:center}
.acadBoutBtn{all:unset;cursor:pointer;min-width:96px;text-align:center;padding:14px 10px;border-radius:12px;border:1px solid rgba(70,183,255,.4);background:rgba(9,16,34,.85);color:#dcecff}
.acadBoutBtn b{display:block;font-size:1.6rem;margin-bottom:4px}
.acadBoutBtn:hover{border-color:#46b7ff}
.acadBoutBtn.good{border-color:#3ad17a;color:#bff5d5}
.acadBoutBtn.bad{border-color:#e05555;color:#ffd0d0}
`;
let cssDone = false;
function examShell(title, sub, closable) {
  try { window.SL.hud && window.SL.hud.closeDialog && window.SL.hud.closeDialog(); } catch(e){}
  if (!cssDone) { const st = document.createElement("style"); st.id = "acadExamCss"; st.textContent = EXAM_CSS; document.head.append(st); cssDone = true; }
  const card = hh("div", { class:"acadCard" });
  const ov = hh("div", { id:"acadExam", class:"acadExam", role:"dialog", "aria-label":"Graduation exam" },
    hh("div", { class:"acadExamTop" },
      hh("div", { class:"acadExamTitle" }, title),
      hh("div", { class:"acadExamSub" }, sub || ""),
      closable ? hh("button", { class:"acadExamX", onclick:()=>cleanup(true) }, "✕") : hh("span")),
    card);
  document.body.append(ov);
  return { ov, card };
}
let CLEANUPS = [];
function cleanup(silent){
  for (const f of CLEANUPS) { try { f(); } catch(e){} }
  CLEANUPS = [];
  const ov = $q("#acadExam"); if (ov) ov.remove();
  inputOn();
  if (!silent) { /* caller handles messaging */ }
}

/* ---------- stage flow ---------- */
export function startExam(stageIdx) {
  const c = window.__SL2academyCtx;
  if (!c) { toast("🎓 Academy exam unavailable — try re-entering the village."); return; }
  const g = game();
  if (!g || !g.player) { toast("🎓 Start the game first."); return; }
  const a = c.acdOf();
  if (a.exam.passed) { showDiploma(); return; }
  const stage = Math.max(0, Math.min(4, stageIdx == null ? a.exam.stage : stageIdx));
  inputOff();
  const NAME = c.EXAM_STAGE_NAME[c.EXAM_STAGES[stage]];
  const { ov, card } = examShell("Graduation Exam · Stage " + (stage+1) + " of 5", c.VILLAGE_FULL[c.vid()] + " Ninja Academy", true);
  card.append(
    hh("div", { class:"acadExamName" }, NAME),
    hh("p", { class:"acadExamRules" }, STAGE_RULES[c.EXAM_STAGES[stage]]),
    hh("div", { class:"acadExamRow" },
      hh("button", { class:"acadBtn", onclick:()=>begin(stage) }, "Begin ▸"),
      hh("button", { class:"acadBtn ghost", onclick:()=>cleanup(true) }, "Not yet")));
}

const STAGE_RULES = {
  written: "Five questions from the academy handbook. Answer at least three right to pass.",
  chakra: "Hold your chakra inside the blue band for 12 seconds. Hold SPACE (or the focus button) to raise it — it drains on its own. Spikes and drops both cost you.",
  clone: "Three rounds. The real one flashes first, then the cards shuffle. Pick the true you.",
  course: "Ring the four course markers in the training yard. The HUD arrow points the way. Par is 80 seconds.",
  instructor: "Read sensei's movement and counter it. Six exchanges. Miss too many and you eat the mat."
};

function begin(stage){
  const key = window.__SL2academyCtx.EXAM_STAGES[stage];
  const done = (score) => finish(stage, key, score);
  ({ written:runWritten, chakra:runChakra, clone:runClone, course:runCourse, instructor:runBout })[key](done);
}

function finish(stage, key, score){
  const c = window.__SL2academyCtx;
  const a = c.acdOf();
  const s = Math.max(0, Math.min(100, Math.round(score)));
  a.exam.scores[key] = Math.max(a.exam.scores[key] || 0, s);
  inputOn();
  const pass = s >= PASS;
  let next = stage + 1;
  if (pass) {
    a.exam.stage = next;
    c.aSave();
    if (key === "chakra") revealNatures(s);
    if (next >= 5) { graduate(a); return; }
    const NAME2 = c.EXAM_STAGE_NAME[c.EXAM_STAGES[next]];
    const { card } = examShell("Stage passed · " + s + "/100", c.EXAM_STAGE_NAME[key] + " cleared", false);
    card.append(
      hh("div", { class:"acadExamBig" }, pass ? "✅" : "❌"),
      hh("p", { class:"acadExamRules" }, "Score " + s + "/100 — that's a pass." + (a.natures.primary && key==="chakra" ? " Your nature revealed itself." : "")),
      hh("div", { class:"acadExamRow" },
        hh("button", { class:"acadBtn", onclick:()=>startExam(next) }, "Next: " + NAME2 + " ▸"),
        hh("button", { class:"acadBtn ghost", onclick:()=>cleanup(true) }, "Rest for now")));
  } else {
    a.exam.attempts++;
    c.aSave();
    const { card } = examShell("Stage failed · " + s + "/100", c.EXAM_STAGE_NAME[key] + " — you need " + PASS, false);
    card.append(
      hh("div", { class:"acadExamBig" }, "❌"),
      hh("p", { class:"acadExamRules" }, "Not this time. Hayate: \"Back tomorrow — or right now, if you're stubborn.\""),
      hh("div", { class:"acadExamRow" },
        hh("button", { class:"acadBtn", onclick:()=>startExam(stage) }, "Try again ▸"),
        hh("button", { class:"acadBtn ghost", onclick:()=>cleanup(true) }, "Bow out")));
  }
}

function graduate(a){
  const c = window.__SL2academyCtx;
  a.exam.passed = true;
  a.exam.graduatedAt = Date.now();
  c.aSave();
  const { card } = examShell("🎓 Graduation", "The " + c.VILLAGE_FULL[c.vid()] + " Ninja Academy", false);
  const n = c.pName();
  const nat = a.natures.primary ? (c.NATURE_ICON[a.natures.primary] + " " + c.NATURE_NAME[a.natures.primary] + (a.natures.secondary ? " · " + c.NATURE_ICON[a.natures.secondary] + " " + c.NATURE_NAME[a.natures.secondary] : "")) : "Not yet recorded";
  const avg = Math.round((["written","chakra","clone","course","instructor"].reduce((s,k)=>s+(a.exam.scores[k]||0),0)) / 5);
  card.append(
    hh("div", { class:"acadExamBig grad" }, "🎓"),
    hh("p", { class:"acadExamRules" }, n + " — you pass. Every stage, every trial. Today you leave this room a Genin of the " + c.VILLAGE_FULL[c.vid()] + "."),
    hh("div", { class:"acadExamStats" },
      hh("div", {}, "Exam average"), hh("b", {}, avg + "/100"),
      hh("div", {}, "Chakra nature"), hh("b", {}, nat),
      hh("div", {}, "Rank"), hh("b", {}, "Genin")),
    hh("p", { class:"acadExamRules muted" }, "Your squad assignment comes next — report back soon."),
    hh("div", { class:"acadExamRow" },
      hh("button", { class:"acadBtn", onclick:()=>cleanup(true) }, "Wear it proud")));
  toast("🎓 Graduation complete — you are now a Genin of the " + c.VILLAGE_FULL[c.vid()] + "!");
  try { window.SL.hud && window.SL.hud.banner && window.SL.hud.banner("🎓 Graduation", "You are now a Genin", 3200); } catch(e){}
}

function revealNatures(score){
  const c = window.__SL2academyCtx;
  const a = c.acdOf();
  if (a.natures.primary) return;
  const w = [ ["fire",.22],["water",.22],["earth",.20],["wind",.18],["lightning",.18] ];
  let r = Math.random(), primary = "fire";
  for (const [k,p] of w) { if ((r -= p) <= 0) { primary = k; break; } }
  a.natures.primary = primary;
  if (score >= 85 && Math.random() < 0.4) {
    const rest = w.map(x=>x[0]).filter(k=>k!==primary);
    a.natures.secondary = rest[(Math.random()*rest.length)|0];
  }
  a.natures.discoveredAt = Date.now();
  a.natures.source = "exam";
  c.aSave();
}

function showDiploma(){
  const c = window.__SL2academyCtx;
  const a = c.acdOf();
  const { card } = examShell("🎓 Academy Diploma", c.VILLAGE_FULL[c.vid()] + " Ninja Academy", true);
  const avg = Math.round((["written","chakra","clone","course","instructor"].reduce((s,k)=>s+(a.exam.scores[k]||0),0)) / 5);
  card.append(
    hh("div", { class:"acadExamBig grad" }, "🎓"),
    hh("p", { class:"acadExamRules" }, "Graduated " + new Date(a.exam.graduatedAt || Date.now()).toLocaleDateString() + " · average " + avg + "/100"),
    hh("p", { class:"acadExamRules muted" }, a.natures.primary ? "Chakra nature: " + c.NATURE_ICON[a.natures.primary] + " " + c.NATURE_NAME[a.natures.primary] + (a.natures.secondary ? " + " + c.NATURE_ICON[a.natures.secondary] + " " + c.NATURE_NAME[a.natures.secondary] : "") : "Chakra nature: not yet recorded"),
    hh("div", { class:"acadExamRow" }, hh("button", { class:"acadBtn", onclick:()=>cleanup(true) }, "Close")));
}

/* ============ STAGE 1: written ============ */
function runWritten(done){
  const qs = rnd5();
  let i = 0, right = 0;
  const { card } = examShell("Written Exam", "Question 1 of 5", false);
  const qEl = hh("div", { class:"acadExamQ" });
  const oEl = hh("div", { class:"acadExamOpts" });
  card.append(qEl, oEl);
  const paint = () => {
    const q = qs[i];
    card.querySelector(".acadExamSub").textContent = "Question " + (i+1) + " of 5";
    qEl.textContent = q.q;
    oEl.innerHTML = "";
    q.o.forEach((opt, oi) => oEl.append(hh("button", { class:"acadOpt", onclick:()=>pick(oi) }, opt)));
  };
  const pick = (oi) => {
    V_ui();
    const q = qs[i];
    const btns = oEl.children;
    btns[q.a].classList.add("good");
    if (oi !== q.a) btns[oi].classList.add("bad"); else right++;
    setTimeout(() => { i++; if (i < qs.length) paint(); else done(right * 20); }, 750);
  };
  paint();
}

/* ============ STAGE 2: chakra control ============ */
function runChakra(done){
  const DUR = 12, W = 0.17;
  const { card } = examShell("Chakra Control", "Hold it in the blue band · 12s", false);
  const bar = hh("div", { class:"acadChBar" },
    hh("div", { class:"acadChBand" }),
    hh("div", { class:"acadChNeedle" }));
  const bandEl = bar.querySelector(".acadChBand"), ndEl = bar.querySelector(".acadChNeedle");
  const holdBtn = hh("button", { class:"acadBtn wide" }, "Hold to focus (or hold SPACE)");
  card.append(bar, hh("p", { class:"acadExamRules center" }, "In band: 0.0s / 12.0s"), holdBtn);
  let v = 0.15, band = 0.4, t = DUR, inBand = 0, hold = false, last = performance.now(), raf = 0, nextBand = 4;
  const moveBand = () => { band = 0.06 + Math.random() * (0.94 - W - 0.06); bandEl.style.top = (band*100) + "%"; bandEl.style.height = (W*100) + "%"; };
  moveBand();
  const kd = (e) => { if (e.code === "Space" || e.key === " ") { e.preventDefault(); hold = true; } };
  const ku = (e) => { if (e.code === "Space" || e.key === " ") hold = false; };
  const pd = () => { hold = true; }, pu = () => { hold = false; };
  holdBtn.addEventListener("pointerdown", pd);
  addEventListener("pointerup", pu);
  addEventListener("keydown", kd, true);
  addEventListener("keyup", ku, true);
  CLEANUPS.push(() => { removeEventListener("keydown", kd, true); removeEventListener("keyup", ku, true); removeEventListener("pointerup", pu); cancelAnimationFrame(raf); });
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    v += (hold ? 0.55 : -0.72) * dt;
    if (v < 0) { v = 0; } if (v > 1) { v = 1; hold = false; }
    ndEl.style.top = "calc(" + (v*100) + "% - 4px)";
    t -= dt;
    if (v >= band && v <= band + W) { inBand += dt; }
    card.querySelector(".acadExamRules.center").textContent = "In band: " + inBand.toFixed(1) + "s of 12s";
    holdBtn.textContent = "Hold to focus · " + Math.max(0, t).toFixed(1) + "s left";
    nextBand -= dt;
    if (nextBand <= 0) { moveBand(); nextBand = 3.2 + Math.random() * 1.6; }
    if (t <= 0) { cleanup(true); done(Math.max(5, Math.round(inBand / DUR * 100))); return; }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

/* ============ STAGE 3: clone technique ============ */
function runClone(done){
  const ROUNDS = 3;
  let round = 0, right = 0;
  const { card } = examShell("Clone Technique", "Round 1 of 3", false);
  const stage = hh("div", { class:"acadCloneStage" });
  card.append(stage);
  const next = () => {
    round++;
    if (round > ROUNDS) { cleanup(true); done(right / ROUNDS * 100); return; }
    card.querySelector(".acadExamSub").textContent = "Round " + round + " of " + ROUNDS;
    stage.innerHTML = "";
    const n = 4, real = (Math.random()*n)|0;
    const order = Array.from({length:n}, (_,k)=>k);
    const cards = order.map(k => hh("div", { class:"acadClone" + (k===real?" real":"") }, k===real ? "🥷" : "🥷"));
    const msg = hh("p", { class:"acadExamRules center" }, "Memorize the real one…");
    stage.append(hh("div", { class:"acadCloneRow" }, ...cards), msg);
    const realCard = cards[real];
    realCard.classList.add("flash");
    let t = 0;
    const iv = setInterval(() => { t += 0.4; if (t >= 1.2) { clearInterval(iv); shuffle(); } }, 400);
    CLEANUPS.push(() => clearInterval(iv));
    const shuffle = () => {
      realCard.classList.remove("flash");
      const row = stage.querySelector(".acadCloneRow");
      const kids = Array.from(row.children);
      for (let i = kids.length - 1; i > 0; i--) { const j = (Math.random()*(i+1))|0; const tmp = kids[i]; kids[i] = kids[j]; kids[j] = tmp; }
      kids.forEach(k => row.appendChild(k));
      msg.textContent = "Which one is the REAL you?";
      kids.forEach(k => { k.classList.add("pickable"); k.onclick = () => {
        V_ui();
        kids.forEach(x => x.classList.remove("pickable"));
        if (k === realCard) { right++; k.classList.add("good"); msg.textContent = "✅ Found the real one."; }
        else { k.classList.add("bad"); realCard.classList.add("good"); msg.textContent = "❌ That was a clone."; }
        setTimeout(next, 900);
      }; });
    };
  };
  next();
}

/* ============ STAGE 4: obstacle course ============ */
function runCourse(done){
  const c = window.__SL2academyCtx;
  const PAR = 80, N = 4;
  const center = c.academyCenter(c.vid());
  const angles = [0.6, 1.9, 3.2, 4.6], radii = [12, 15, 13, 16];
  const wps = angles.map((an, i) => ({ x: center[0] + Math.cos(an) * radii[i], z: center[1] + Math.sin(an) * radii[i] }));
  const { ov, card } = examShell("Obstacle Course", "", true);
  ov.classList.add("hudMode");
  const pill = hh("div", { class:"acadCoursePill" },
    hh("span", { class:"acadCourseArrow", style:"display:inline-block" }, "⬆"),
    hh("b", { class:"acadCourseTxt" }, "Ring 1 of 4 · — m · 0.0s"));
  const ff = hh("button", { class:"acadBtn ghost small", onclick:()=>{ cleanup(true); done(0); } }, "Forfeit");
  card.append(pill, ff);
  let wi = 0, t0 = performance.now(), raf = 0;
  CLEANUPS.push(() => cancelAnimationFrame(raf));
  const tick = () => {
    const g = game();
    const p = g && g.player && g.player.pos;
    if (!p) { raf = requestAnimationFrame(tick); return; }
    const t = (performance.now() - t0) / 1000;
    const w = wps[wi];
    const dx = w.x - p.x, dz = w.z - p.z, d = Math.hypot(dx, dz);
    if (d < 2.6) {
      wi++;
      if (wi >= wps.length) {
        cleanup(true);
        const s = Math.max(20, Math.min(100, Math.round(100 * PAR / Math.max(PAR, t))));
        done(s);
        return;
      }
      try { toast("🎯 Marker " + wi + "/" + wps.length + " cleared"); } catch(e){}
    }
    const cur = wps[wi];
    const ddx = cur.x - p.x, ddz = cur.z - p.z, dd = Math.hypot(ddx, ddz);
    let rel = 0;
    try { const yaw = g.cam.yaw || 0; rel = Math.atan2(ddx, -ddz) - yaw; } catch(e){}
    pill.querySelector(".acadCourseArrow").style.transform = "rotate(" + (rel * 180 / Math.PI) + "deg)";
    pill.querySelector(".acadCourseTxt").textContent = "Ring " + (wi+1) + " of " + N + " · " + Math.round(dd) + " m · " + t.toFixed(1) + "s";
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

/* ============ STAGE 5: instructor bout ============ */
function runBout(done){
  const ROUNDS = 6, WINDOW = 1.6;
  let round = 0, right = 0, misses = 0;
  const { card } = examShell("Instructor Bout", "Exchange 1 of 6", false);
  const tell = hh("div", { class:"acadBoutTell" }, "Ready…");
  const row = hh("div", { class:"acadBoutRow" });
  const hp = hh("p", { class:"acadExamRules center" }, "❤️❤️❤️");
  card.append(tell, row, hp);
  const paint = () => {
    round++;
    if (round > ROUNDS) { cleanup(true); done(right / ROUNDS * 100); return; }
    const t = TELLS[(Math.random()*TELLS.length)|0];
    card.querySelector(".acadExamSub").textContent = "Exchange " + round + " of " + ROUNDS;
    tell.textContent = t.tell;
    row.innerHTML = "";
    const btns = BOUT_BTNS.map(b => hh("button", { class:"acadBoutBtn", onclick:()=>answer(b.k) }, hh("b", {}, b.glyph), hh("span", {}, b.k)));
    row.append(...btns);
    let answered = false;
    const to = setTimeout(() => { if (!answered) answer(null); }, WINDOW * 1000);
    CLEANUPS.push(() => clearTimeout(to));
    const answer = (k) => {
      if (answered) return; answered = true;
      btns[BOUT_BTNS.findIndex(b => b.k === t.right)].classList.add("good");
      if (k === t.right) { right++; tell.textContent = "✅ Clean counter!"; }
      else { misses++; tell.textContent = "💥 " + (k ? "Wrong read — you eat the mat." : "Too slow!"); }
      hp.textContent = "Correct " + right + "/" + ROUNDS;
      setTimeout(paint, 800);
    };
  };
  setTimeout(paint, 700);
}
