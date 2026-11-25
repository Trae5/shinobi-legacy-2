/* ============================================================
   Shinobi Legacy: Remastered — Permanent Injury & Sacrifice System
   Body-part loss (1 arm + 1 eye max), sacrifice on lethal blows,
   cinematic loss sequences, per-eye dojutsu consequences, one-armed
   combat, mastery paths (One-Handed / Blind Warrior / Broken Limit /
   Sacrifice Awakening), rare restoration, injury record.
   Depends on phase1.js (helpers). Live hooks via window.__SL2*.
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, setWeaponHook } from "./phase1.js";

/* ---------------- state ---------------- */
let SAVE6 = null;
function lChar() {
  const c = p1char(SAVE6);
  c.a6 = initA6(c.a6);
  return c;
}
function initA6(a) {
  a = a || {};
  a.arm = a.arm || null;              // { side:"left"|"right", at, cause, restored?:ts }
  a.eye = a.eye || null;              // same shape
  a.history = a.history || [];        // { kind, side, at, cause, restored }
  a.mastery = Object.assign({ oh: { lv: 0, xp: 0 }, bw: { lv: 0, xp: 0 }, bl: { lv: 0, xp: 0 }, aw: { lv: 0, xp: 0 } }, a.mastery || {});
  for (const k of ["oh", "bw", "bl", "aw"]) a.mastery[k] = Object.assign({ lv: 0, xp: 0 }, a.mastery[k] || {});
  a.eyeAssign = a.eyeAssign || {};    // { left: dojutsuId|null, right: dojutsuId|null }
  a.stash = a.stash || {};            // { dojutsuId: stage } — stashed while its eye is lost
  a.sacrifices = a.sacrifices || 0;
  a.fresh = a.fresh || null;          // { kind, side, until } — swap window right after a sacrifice
  a.restoredCd = a.restoredCd || {};  // { arm: ts, eye: ts } — next restoration attempt allowed
  a.noticed = a.noticed || 0;
  return a;
}
const SIDE_OK = (s) => s === "left" || s === "right";

/* dojutsu treated as a PAIR when the player owns only that one eye power */
const PAIRED_HINT = /sharingan|mangekyo|byakugan|tenseigan|ketsuryugan|custom/i;

function getGame() {
  try { const g = (window.SL && window.SL.game) || window.__SL2game; if (g) { try { window.__SL2game = g; } catch (e) {} } return g || null; } catch { return window.__SL2game || null; }
}
function curSave() {
  if (SAVE6) return SAVE6;
  const g = window.__SL2game;
  return (g && g.player && saveOf(g.player)) || null;
}
function saveOf(pl) {
  if (!pl || typeof pl !== "object") return null;
  const cands = [pl.profile, pl.p, pl.pl, pl.save, pl.data];
  for (const s of cands) {
    if (s && typeof s === "object" && (s.name || s.charName) && (s.powers || s.ryo != null || s.level != null || s.lv != null)) return s;
  }
  return null;
}
let A6C = { key: null, t: 0, val: null };
function a6Of(sv) {
  if (!sv) return null;
  const key = sv.name || sv.charName || null;
  if (!key) return null;
  const now = Date.now();
  if (A6C.key === key && now - A6C.t < 1200 && A6C.val) return A6C.val;
  try { const c = p1char(sv); A6C = { key, t: now, val: initA6(c.a6) }; return A6C.val; } catch { return null; }
}
function a6Flush() { A6C.t = 0; }

/* ---------------- eye ↔ dojutsu assignment ---------------- */
function eyeIdsPowers(sv) {
  return (sv && sv.powers && sv.powers.eyes) || {};
}
function ensureEyeAssign(sv, a6) {
  const eyes = eyeIdsPowers(sv);
  const ids = Object.keys(eyes).filter((k) => eyes[k] > 0);
  // keep existing assignments that still exist
  for (const side of ["left", "right"]) {
    const cur = a6.eyeAssign[side];
    if (cur && !(cur in eyes)) a6.eyeAssign[side] = null;
  }
  // assign unassigned powers to free eye slots, right eye first (dominant)
  for (const id of ids) {
    if (a6.eyeAssign.left === id || a6.eyeAssign.right === id) continue;
    const free = !a6.eyeAssign.right ? "right" : !a6.eyeAssign.left ? "left" : null;
    if (free) a6.eyeAssign[free] = id;
  }
  return a6.eyeAssign;
}
function eyeLostDojutsu(sv, a6) { /* the dojutsu that died with the lost eye */
  if (!a6.eye) return null;
  return a6.eyeAssign[a6.eye.side] || null;
}
function stashEyePowers(sv, a6) {
  const id = eyeLostDojutsu(sv, a6);
  if (!id) return null;
  const eyes = eyeIdsPowers(sv);
  if (eyes[id] > 0) { a6.stash[id] = eyes[id]; eyes[id] = 0; }
  return id;
}
function restoreEyePowers(sv, a6) {
  const id = a6.eye && a6.eye.side ? a6.eyeAssign[a6.eye.side] : null;
  if (id && a6.stash[id]) { eyeIdsPowers(sv)[id] = a6.stash[id]; }
  const st = a6.stash; for (const k of Object.keys(st)) { if (eyeIdsPowers(sv)[k] === 0) eyeIdsPowers(sv)[k] = st[k]; }
  a6.stash = {};
}

/* ---------------- injury application ---------------- */
function applyInjury(sv, kind, side, cause) {
  const a6 = a6Of(sv);
  try { console.log("[injhook] apply", kind, side, "key:", sv && (sv.name || sv.charName)); } catch {}
  if (!a6 || !SIDE_OK(side)) return null;
  if (kind === "arm" && a6.arm) return null;
  if (kind === "eye" && a6.eye) return null;
  const rec = { kind, side, at: Date.now(), cause: String(cause || "battle").slice(0, 60), restored: null };
  if (kind === "arm") a6.arm = rec; else a6.eye = rec;
  a6.history.push(rec);
  a6.sacrifices++;
  a6.fresh = { kind, side, until: Date.now() + 45000 };
  if (kind === "eye") stashEyePowers(sv, a6);
  a6Flush(); p1save();
  return rec;
}
function swapFreshSide(sv, side) {
  const a6 = a6Of(sv);
  if (!a6 || !a6.fresh || Date.now() > a6.fresh.until || !SIDE_OK(side)) return false;
  const rec = a6.fresh.kind === "arm" ? a6.arm : a6.eye;
  if (!rec || rec.side === side) return false;
  rec.side = side;
  const h = a6.history[a6.history.length - 1];
  if (h && h.kind === rec.kind) h.side = side;
  a6.fresh.side = side;
  if (rec.kind === "eye") { restoreEyePowers(sv, a6); stashEyePowers(sv, a6); }
  a6Flush(); p1save();
  return true;
}

/* ---------------- mastery ---------------- */
const MAST = {
  oh: { name: "One-Handed Mastery", need: "Fight one-armed: every defeat you walk away from teaches your body again.", perk: (lv) => "+" + (lv * 2.5).toFixed(1) + "% melee power (replaces the one-armed penalty at Lv 5)" },
  bw: { name: "Blind Warrior", need: "Fight one-eyed: learn to hear the battlefield instead of seeing it.", perk: (lv) => "+" + (lv * 2) + "% crit sense, −" + (lv * 1.5).toFixed(1) + "% damage taken" },
  bl: { name: "Broken Limit", need: "Train past the wound: unlock an act of desperation.", perk: (lv) => lv >= 1 ? "Unleash (B): +25% power for 20s, 5 min cooldown" : "Reach Lv 1 to unlock Unleash" },
  aw: { name: "Sacrifice Awakening", need: "Master both wounds and accept what you gave. Lv 3 changes who you are.", perk: (lv) => lv >= 3 ? "+8% permanent power · the title: The Sacrificed" : "Requires Lv 3 in One-Handed and Blind Warrior" }
};
const LV_XP = (lv) => 20 + lv * 15;
function addXp(a6, key, amt) {
  const m = a6.mastery[key]; if (!m) return;
  m.xp += amt;
  let guard = 0;
  while (m.xp >= LV_XP(m.lv) && m.lv < 5 && guard++ < 10) { m.xp -= LV_XP(m.lv); m.lv++; }
  if (m.lv >= 5) m.xp = Math.min(m.xp, LV_XP(5));
}
function awakeningEligible(a6) {
  return !!(a6.arm && a6.eye && a6.mastery.oh.lv >= 3 && a6.mastery.bw.lv >= 3);
}
function powerPct(sv) { /* signed percent for the weapon hook */
  const a6 = a6Of(sv); if (!a6) return 0;
  let pct = 0;
  if (a6.arm && !a6.arm.restored) pct -= 12;
  if (a6.eye && !a6.eye.restored) pct -= 6;
  if (a6.arm && !a6.arm.restored) pct += a6.mastery.oh.lv * 2.5;
  if (a6.eye && !a6.eye.restored) pct += a6.mastery.bw.lv * 2;
  if (awakeningEligible(a6) && a6.mastery.aw.lv >= 3) pct += 8;
  if (BROKEN.t > Date.now()) pct += 25;
  return pct;
}

/* ---------------- broken limit ---------------- */
const BROKEN = { t: 0, cd: 0 };
function brokenTry() {
  const a6 = a6Of(curSave());
  if (!a6 || a6.mastery.bl.lv < 1) { toast("Broken Limit: not yet learned.", "warn"); return; }
  if (!(a6.arm || a6.eye)) { toast("You are whole. Broken Limit belongs to the wounded.", "warn"); return; }
  const now = Date.now();
  if (now < BROKEN.cd) { toast("Broken Limit is spent. Rest " + Math.ceil((BROKEN.cd - now) / 60000) + " min.", "warn"); return; }
  BROKEN.t = now + 20000; BROKEN.cd = now + 5 * 60000;
  toast("BROKEN LIMIT — for twenty seconds, the wound feeds you.");
  sfxSting(0.7);
}

/* ---------------- audio sting (no assets) ---------------- */
function sfxSting(v) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = sfxSting.c || (sfxSting.c = new AC());
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime, g = ctx.createGain();
    g.gain.value = 0.5 * (v || 1); g.connect(ctx.destination);
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.9);
    const og = ctx.createGain(); og.gain.setValueAtTime(1, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
    o.connect(og); og.connect(g); o.start(t0); o.stop(t0 + 1.2);
    const n = ctx.createBufferSource(), len = Math.floor(ctx.sampleRate * 0.35), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    n.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.value = 0.6;
    n.connect(f); f.connect(ng); ng.connect(g); n.start(t0);
    for (let k = 0; k < 2; k++) {
      const h = ctx.createOscillator(), hg = ctx.createGain();
      h.type = "sine"; h.frequency.value = 55;
      hg.gain.setValueAtTime(0.0001, t0 + 0.5 + k * 0.55);
      hg.gain.exponentialRampToValueAtTime(0.5, t0 + 0.56 + k * 0.55);
      hg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9 + k * 0.55);
      h.connect(hg); hg.connect(g); h.start(t0 + 0.5 + k * 0.55); h.stop(t0 + 1.0 + k * 0.55);
    }
  } catch {}
}

/* ---------------- cinematic ---------------- */
function cinematic(pl, kind, side) {
  try {
    const g = pl.game || (window.__SL2game || null);
    const cam = g && g.camera;
    const p = pl.pos || (g && g.player && g.player.pos);
    const ov = hh("div", { id: "p6cine", style: { position: "fixed", inset: "0", zIndex: 99990, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,.88) 100%)", opacity: "0", transition: "opacity .5s" } },
      hh("div", { style: { position: "absolute", left: "0", right: "0", top: "38%", textAlign: "center", color: "#fff", textShadow: "0 2px 18px #000, 0 0 40px rgba(180,20,20,.8)" } },
        hh("div", { style: { fontSize: "clamp(20px,4.5vw,44px)", fontWeight: 900, letterSpacing: ".14em", opacity: "0", transition: "opacity 1.2s .4s" } }, kind === "eye" ? "THE EYE DARKENS" : "THE LIMB IS LOST"),
        hh("div", { style: { fontSize: "clamp(11px,2vw,16px)", letterSpacing: ".3em", marginTop: "10px", opacity: "0", transition: "opacity 1.2s .9s", color: "#d8b4b4" } },
          (side === "left" ? "LEFT" : "RIGHT") + " " + (kind === "eye" ? "EYE" : "ARM") + " — PERMANENT")));
    document.body.append(ov);
    requestAnimationFrame(() => { ov.style.opacity = "1"; const t = ov.querySelectorAll("div div"); if (t[0]) t[0].style.opacity = "1"; if (t[1]) setTimeout(() => t[1] && (t[1].style.opacity = "1"), 300); });
    sfxSting(1);
    try { pl.setState && pl.setState("hurt"); } catch {}
    let raf = 0; const t0 = performance.now();
    let p0 = null, q0 = null;
    if (cam && p && cam.position) { p0 = cam.position.clone(); q0 = cam.quaternion.clone(); }
    const DUR = 2600;
    const step = () => {
      const e = (performance.now() - t0) / DUR;
      if (e >= 1) {
        if (cam && p0 && q0) { cam.position.copy(p0); cam.quaternion.copy(q0); }
        cancelAnimationFrame(raf); return;
      }
      if (cam && p) {
        const a = -1.2 + e * 2.4, r = 4.2 - e * 0.9;
        cam.position.set(p.x + Math.sin(a) * r, p.y + 1.7 - e * 0.5, p.z + Math.cos(a) * r);
        cam.lookAt(p.x, p.y + 1.1, p.z);
      }
      raf = requestAnimationFrame(step);
    };
    if (cam) raf = requestAnimationFrame(step);
    setTimeout(() => { try { pl.setState && pl.setState("idle"); } catch {} ov.style.opacity = "0"; setTimeout(() => ov.remove(), 700); }, DUR);
  } catch {}
}

/* ---------------- model visual (best effort) ---------------- */
function findRig(ent) {
  try {
    const seen = new Set(), q = [ent];
    while (q.length && seen.size < 40) {
      const o = q.shift(); if (!o || typeof o !== "object" || seen.has(o)) continue; seen.add(o);
      if (o.armL && o.armR && o.armL.sh) return o;
      for (const k of ["rig", "model", "body", "mesh", "obj", "view", "avatar", "char", "g", "root"]) { const v = o[k]; if (v && typeof v === "object") q.push(v); }
    }
  } catch {}
  return null;
}
function applyModelVisual(pl) {
  try {
    const g = pl.game || getGame(); if (!g || !g.player) return;
    const sv = saveOf(g.player); const a6 = a6Of(sv); if (!a6) return;
    const rig = findRig(g.player); if (!rig) return;
    for (const [kind, rec] of [["arm", a6.arm], ["eye", a6.eye]]) {
      if (!rec || rec.restored) continue;
      const part = rig[rec.side === "left" ? "armL" : "armR"];
      if (kind === "arm" && part) { const s = 0.12; if (part.sh) part.sh.scale.setScalar(s); if (part.el) part.el.scale.setScalar(s); if (part.hand) part.hand.scale.setScalar(s); }
    }
  } catch {}
}
setInterval(() => { const g = getGame(); if (g && g.player) applyModelVisual(g.player); }, 5000);

/* ---------------- live hooks (called from game.js) ---------------- */
window.__SL2lethal = function (pl) {
  try {
    if (!pl || !pl.profile) return false;
    const g = pl.game; if (g) window.__SL2game = g;
    const sv = saveOf(pl); if (!sv) return false;
    const a6 = a6Of(sv); if (!a6) return false;
    const canArm = !a6.arm, canEye = !a6.eye;
    if (!canArm && !canEye) return false;
    const kind = canEye ? "eye" : "arm";
    const side = kind === "eye" ? "right" : "left";
    const rec = applyInjury(sv, kind, side, "A killing blow — and the will to give something instead");
    if (!rec) return false;
    SAVE6 = sv;
    cinematic(pl, kind, side);
    try {
      pl.hp = Math.max(pl.hp || 0, Math.round((pl.maxHp || 100) * 0.35));
      pl.stunT = 0; if (pl.burn) pl.burn = null;
    } catch {}
    try { applyModelVisual(pl); } catch {}
    mpBroadcast();
    toast("SACRIFICE — you gave your " + side + " " + kind + " and lived. Open INJURIES within 45s to choose the other side.");
    return true; /* death skipped */
  } catch { return false; }
};
window.__SL2eyeGate = function (sv, id) {
  try {
    const a6 = a6Of(sv); if (!a6 || !a6.eye) return false;
    const lost = eyeLostDojutsu(sv, a6);
    return lost === id;
  } catch { return false; }
};
const TWO_HAND_RE = /perfect susanoo|chibaku tensei|tengai shinsei|kuchiyose|summoning|sealing|fuinjutsu|fūinjutsu|barrier|domain|eddy|twin|dual/i;
window.__SL2castGate = function (pl, id, t) {
  try {
    if (!pl) return true;
    const sv = saveOf(pl); const a6 = a6Of(sv); if (!a6) return true;
    const name = (t && t.name) || id || "";
    if (a6.arm && !a6.arm.restored && (TWO_HAND_RE.test(name) || (t && t.twoHands))) { window.__SL2castMsg = "Your missing arm can't weave that technique."; return false; }
    if (a6.eye && !a6.eye.restored && /perfect susanoo/i.test(name)) { window.__SL2castMsg = "One eye cannot hold the Perfect Susanoo."; return false; }
    return true;
  } catch { return true; }
};
window.__SL2kill = function (enemy) {
  try {
    const g = getGame(); if (!g || !g.player) return;
    const sv = saveOf(g.player); const a6 = a6Of(sv); if (!a6) return;
    const hurt = !!(a6.arm || a6.eye);
    if (!hurt) return;
    if (a6.arm && !a6.arm.restored) addXp(a6, "oh", 3);
    if (a6.eye && !a6.eye.restored) addXp(a6, "bw", 3);
    addXp(a6, "bl", 1);
    if (awakeningEligible(a6)) {
      const before = a6.mastery.aw.lv;
      addXp(a6, "aw", 2);
      if (a6.mastery.aw.lv >= 3 && before < 3) { toast("SACRIFICE AWAKENING — what you gave no longer holds you down. +8% power, forever."); sfxSting(0.8); }
    }
    p1save();
  } catch {}
};

/* ---------------- weapon hook: injury battle power ---------------- */
try { setWeaponHook(() => { const g = getGame(); const sv = g && g.player && saveOf(g.player); return sv ? powerPct(sv) : 0; }); } catch {}

/* ---------------- restoration ---------------- */
const RESTORE_REQ = { ryo: 2500000, jade: 60, beastClaw: 40, lv: 40, cdDays: 7 };
function restoreReady(sv, kind) {
  const a6 = a6Of(sv); if (!a6) return { ok: false, why: "—" };
  const rec = kind === "arm" ? a6.arm : a6.eye;
  if (!rec || rec.restored) return { ok: false, why: "Nothing to restore." };
  const c = p1char(sv);
  const lv = c.level || sv.level || pLv();
  if (lv < RESTORE_REQ.lv) return { ok: false, why: "Lv " + RESTORE_REQ.lv + "+ required (you are Lv " + lv + ")." };
  if ((c.ryo || 0) < RESTORE_REQ.ryo) return { ok: false, why: "Costs " + fmtN(RESTORE_REQ.ryo) + " ryo (legendary medical technique)." };
  if ((c.mats && c.mats.jade || 0) < RESTORE_REQ.jade) return { ok: false, why: "Needs " + RESTORE_REQ.jade + " jade." };
  if ((c.mats && c.mats.beastClaw || 0) < RESTORE_REQ.beastClaw) return { ok: false, why: "Needs " + RESTORE_REQ.beastClaw + " beast claws." };
  const next = (a6.restoredCd[kind] || 0);
  if (Date.now() < next) return { ok: false, why: "The body rejects another regrowth for " + Math.ceil((next - Date.now()) / 86400000) + " more day(s)." };
  return { ok: true };
}
function doRestore(sv, kind) {
  const chk = restoreReady(sv, kind); if (!chk.ok) { toast(chk.why, "warn"); return false; }
  const a6 = a6Of(sv); const c = p1char(sv);
  c.ryo -= RESTORE_REQ.ryo;
  c.mats.jade -= RESTORE_REQ.jade; c.mats.beastClaw -= RESTORE_REQ.beastClaw;
  a6.restoredCd[kind] = Date.now() + RESTORE_REQ.cdDays * 86400000;
  const rec = kind === "arm" ? a6.arm : a6.eye;
  rec.restored = Date.now();
  const h = a6.history.find((x) => x.kind === kind && x.at === rec.at); if (h) h.restored = rec.restored;
  if (kind === "eye") restoreEyePowers(sv, a6);
  a6.fresh = null;
  a6Flush(); p1save();
  toast("The technique takes. Your " + rec.side + " " + kind + " lives again. The scar remembers.");
  sfxSting(0.5);
  return true;
}

/* ---------------- multiplayer broadcast ---------------- */
function mpBroadcast() {
  try {
    const sock = window.__SL2sock;
    if (sock && sock.readyState === 1) {
      const g = getGame(); const sv = g && g.player && saveOf(g.player); const a6 = a6Of(sv);
      if (a6) sock.send(JSON.stringify({ t: "inj", name: pName(), arm: a6.arm && !a6.arm.restored ? a6.arm.side : null, eye: a6.eye && !a6.eye.restored ? a6.eye.side : null }));
    }
  } catch {}
}
window.__SL2injState = function () {
  const g = getGame(); const sv = g && g.player && saveOf(g.player); const a6 = a6Of(sv);
  return a6 ? { arm: a6.arm && !a6.arm.restored ? a6.arm.side : null, eye: a6.eye && !a6.eye.restored ? a6.eye.side : null } : { arm: null, eye: null };
};
window.__SL2injPeer = function (m) { /* called by phase4 when a peer reports injuries */
  try {
    if (!m || !m.name) return;
    const bits = [];
    if (m.arm) bits.push("one-armed (" + m.arm + ")");
    if (m.eye) bits.push("one-eyed (" + m.eye + ")");
    if (bits.length) toast(m.name + " fights " + bits.join(" and ") + ".");
  } catch {}
};

/* ---------------- panel UI ---------------- */
let UI_CB = null;
function openInjuries(save, cb) {
  SAVE6 = save || SAVE6;
  UI_CB = cb || null;
  p1save();
  if (!$q("#p6css")) { const st = document.createElement("style"); st.id = "p6css"; st.textContent = P6CSS; document.head.append(st); }
  let ov = $q("#p6ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p6ov" },
    hh("div", { class: "p1m", id: "p6m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "Injuries & Sacrifice"),
        hh("span", { class: "p1who" }, pName() + " · Lv " + pLv()),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeInjuries }, "✕")),
      hh("div", { class: "p1body", id: "p6body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "What you give is never given back for free"),
        hh("span", {}, "Sacrifice · Masteries · Restoration"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeInjuries(); });
  mpBroadcast();
  renderInjuries();
}
function closeInjuries() { const ov = $q("#p6ov"); if (ov) ov.remove(); }

const P6CSS = `
#p6ov .p6sil{display:flex;gap:6px;justify-content:center;margin:8px 0}
.p6part{flex:1;padding:8px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.14);text-align:center;font-size:.78rem}
.p6part.lost{background:rgba(160,30,30,.25);border-color:rgba(220,90,90,.6);color:#f2c9c9}
.p6part.ok{background:rgba(255,255,255,.05)}
.p6bar{height:8px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:5px}
.p6bar>div{height:100%;background:linear-gradient(90deg,#b8433a,#e0b26a)}
.p6hist{font-size:.75rem;opacity:.85;line-height:1.5}
.p6warn{font-size:.75rem;color:#e8b9a0}
`;

function partChip(kind, rec) {
  const label = (kind === "arm" ? "Arm" : "Eye") + " · " + (rec ? (rec.side === "left" ? "Left" : "Right") : "—");
  const lost = rec && !rec.restored;
  const cls = lost ? "p6part lost" : rec && rec.restored ? "p6part ok" : "p6part ok";
  const sub = lost ? "LOST" : rec && rec.restored ? "RESTORED" : "INTACT";
  return hh("div", { class: cls },
    hh("div", { style: { fontWeight: 800 } }, label),
    hh("div", { style: { fontSize: ".68rem", letterSpacing: ".12em" } }, sub));
}
function renderInjuries() {
  try { const _a = a6Of(SAVE6); console.log("[injpanel] render save6=", SAVE6 && (SAVE6.name || SAVE6.charName), "eye=", _a && _a.eye && _a.eye.side, "arm=", _a && _a.arm && _a.arm.side, "hist=", _a && _a.history.length); } catch {}
  const body = $q("#p6body"); if (!body) return;
  const sv = SAVE6; const a6 = a6Of(sv); if (!a6) { body.append(hh("div", { class: "p1title" }, "No character loaded.")); return; }
  body.textContent = "";
  body.append(hh("div", { class: "p1title" }, "What the body remembers"));
  /* fresh swap window */
  if (a6.fresh && Date.now() < a6.fresh.until) {
    const left = Math.max(0, Math.ceil((a6.fresh.until - Date.now()) / 1000));
    const other = a6.fresh.side === "left" ? "right" : "left";
    body.append(hh("div", { class: "p1card", style: { borderColor: "rgba(220,120,90,.6)" } },
      hh("div", { style: { fontWeight: 800 } }, "The wound is fresh — " + left + "s to choose the other " + a6.fresh.kind),
      hh("div", { style: { fontSize: ".78rem", opacity: .85, margin: "2px 0 6px" } }, "You gave your " + a6.fresh.side + " " + a6.fresh.kind + ". Say the word and it was the " + other + " instead."),
      hh("button", { class: "p1btn", onclick: () => { if (swapFreshSide(sv, other)) { toast("It was the " + other + " " + a6.fresh.kind + "."); renderInjuries(); mpBroadcast(); } } }, "Give the " + other + " " + a6.fresh.kind + " instead")));
  }
  /* body state */
  const sil = hh("div", { class: "p6sil" }, partChip("arm", a6.arm), partChip("eye", a6.eye));
  body.append(sil);
  if (a6.arm || a6.eye) {
    const lines = [];
    if (a6.arm && !a6.arm.restored) {
      lines.push("One-armed: two-handed techniques and heavy weapon stances are closed. Melee power " + (a6.mastery.oh.lv >= 5 ? "fully restored by mastery" : "reduced; One-Handed Mastery climbs back") + ".");
    }
    if (a6.eye && !a6.eye.restored) {
      const lostId = eyeLostDojutsu(sv, a6);
      if (lostId) lines.push("The " + a6.eye.side + " eye held your " + lostId + ". Its powers sleep until the eye returns (or restoration).");
      else lines.push("One-eyed: vision is diminished; the deepest ocular arts (Perfect Susanoo) are beyond a single eye.");
    }
    if (lines.length) body.append(hh("div", { class: "p1card" }, hh("div", { style: { fontWeight: 800, marginBottom: "4px" } }, "What changed"), ...lines.map((l) => hh("div", { style: { fontSize: ".78rem", opacity: .85 } }, "• " + l))));
  } else {
    body.append(hh("div", { class: "p1card" }, hh("div", { style: { fontSize: ".8rem", opacity: .85 } }, "Whole, for now. When a blow would end you, you may give an arm or an eye and keep living. Max: one arm, one eye.")));
  }
  /* masteries */
  body.append(hh("div", { class: "p1title", style: { marginTop: "10px" } }, "Sacrifice masteries"));
  for (const key of ["oh", "bw", "bl", "aw"]) {
    const m = a6.mastery[key], d = MAST[key];
    const need = key === "aw" && !awakeningEligible(a6);
    const pct = clampN(Math.round((m.xp / LV_XP(m.lv)) * 100), 0, 100);
    body.append(hh("div", { class: "p1card", style: { opacity: need ? ".55" : "1" } },
      hh("div", { style: { display: "flex", justifyContent: "space-between" } },
        hh("div", { style: { fontWeight: 800 } }, (m.lv >= (key === "aw" ? 3 : 5) ? "🏆 " : "🔒 ") + d.name + " · Lv " + m.lv + (key === "aw" ? "/3" : "/5")),
        hh("div", { style: { fontSize: ".72rem", opacity: .8 } }, m.xp + " / " + LV_XP(m.lv) + " xp")),
      hh("div", { style: { fontSize: ".76rem", opacity: .85, margin: "3px 0" } }, d.need),
      hh("div", { class: "p6bar" }, hh("div", { style: { width: pct + "%" } })),
      hh("div", { style: { fontSize: ".74rem", opacity: .9, marginTop: "4px" } }, "Perk: " + d.perk(m.lv))));
  }
  const canBl = a6.mastery.bl.lv >= 1 && (a6.arm || a6.eye);
  body.append(hh("div", { style: { display: "flex", gap: "8px", margin: "8px 0" } },
    hh("button", { class: "p1btn", onclick: () => { brokenTry(); } }, canBl ? "UNLEASH (or press B in the world)" : "Broken Limit locked"),
    hh("button", { class: "p1btn", onclick: () => { renderInjuries(); } }, "Refresh")));
  /* restoration */
  if (a6.arm || a6.eye) {
    body.append(hh("div", { class: "p1title", style: { marginTop: "10px" } }, "Restoration — rare, never free"));
    for (const kind of ["arm", "eye"]) {
      const rec = kind === "arm" ? a6.arm : a6.eye;
      if (!rec) continue;
      if (rec.restored) { body.append(hh("div", { class: "p1card" }, hh("div", { style: { fontSize: ".8rem" } }, (rec.side === "left" ? "Left" : "Right") + " " + kind + ": restored. The history below keeps what happened."))); continue; }
      const chk = restoreReady(sv, kind);
      body.append(hh("div", { class: "p1card" },
        hh("div", { style: { fontWeight: 800 } }, (rec.side === "left" ? "Left" : "Right") + " " + kind + " regrowth"),
        hh("div", { style: { fontSize: ".76rem", opacity: .85, margin: "3px 0" } },
          "Lv " + RESTORE_REQ.lv + "+ · " + fmtN(RESTORE_REQ.ryo) + " ryo · " + RESTORE_REQ.jade + " jade · " + RESTORE_REQ.beastClaw + " beast claws · 7-day rejection window between regrowths."),
        hh("div", { class: chk.ok ? "p6warn" : "p6warn", style: { marginBottom: "6px" } }, chk.ok ? "The medical scrolls say it can be done." : chk.why),
        hh("button", { class: "p1btn", onclick: () => { if (doRestore(sv, kind)) { renderInjuries(); mpBroadcast(); } } }, chk.ok ? "Perform the regrowth" : "Not yet possible")));
    }
  }
  /* history */
  body.append(hh("div", { class: "p1title", style: { marginTop: "10px" } }, "Injury history"));
  if (!a6.history.length) body.append(hh("div", { class: "p6hist" }, "Nothing yet. May it stay that way."));
  for (const h of [...a6.history].reverse()) {
    const d = new Date(h.at);
    body.append(hh("div", { class: "p6hist" },
      (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear() + " — " + (h.side === "left" ? "Left" : "Right") + " " + h.kind +
      (h.restored ? " · restored" : " · permanent") + " · " + h.cause));
  }
}

/* ---------------- world notices (NPC-ish recognition) ---------------- */
function worldNotice() {
  const a6 = a6Of(curSave()); if (!a6) return;
  const now = Date.now();
  if (now - (a6.noticed || 0) < 6 * 3600 * 1000) return;
  a6.noticed = now; p1save();
  const bits = [];
  if (a6.arm && !a6.arm.restored) bits.push("Villagers steal glances at your missing " + a6.arm.side + " arm.");
  if (a6.eye && !a6.eye.restored) bits.push("Children whisper about the shinobi with one eye.");
  if (bits.length) toast(bits.join(" "));
}

/* ---------------- boot ---------------- */
window.__SL2injOpen = openInjuries;
function devTest() {
  try {
      try {
    if (new URLSearchParams(location.search).get("injdbg")) {
      const dump = () => {
        try {
          const raw = JSON.parse(localStorage.getItem("sl2_phase1_v1") || "null");
          const keys = raw && raw.chars ? Object.keys(raw.chars) : [];
          const ent = raw && raw.chars && raw.chars.injtest;
          let hp = null; try { const g = getGame(); hp = g && g.player ? g.player.hp : null; } catch {}
          console.log("[injdbg]", JSON.stringify({ keys, a6: ent && ent.a6 || null, save6: SAVE6 && (SAVE6.name || SAVE6.charName || "noname"), save6null: SAVE6 === null, hp }));
        } catch (e) { console.log("[injdbg] err", e && e.message); }
      };
      dump(); setInterval(dump, 5000);
    }
  } catch {}
if (!new URLSearchParams(location.search).get("injtest")) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const g = getGame();
      if (g && g.player && window.__SL2lethal) {
        clearInterval(t);
        const ok = window.__SL2lethal(g.player);
        console.log("[injtest] lethal hook:", ok);
        if (ok) setTimeout(() => { try { const gg = getGame(); window.__SL2injOpen(saveOf(gg.player)); } catch (e) { console.log("[injtest] open fail", e && e.message); } }, 4200);
      } else if (tries > 60) { clearInterval(t); console.log("[injtest] no game/player after 60s"); }
    }, 1000);
  } catch (e) { console.log("[injtest]", e && e.message); }
}
function boot() {
  devTest();
  try {
    if (new URLSearchParams(location.search).get("injtest2")) {
      let tries = 0;
      const t2 = setInterval(() => {
        tries++;
        const g = getGame();
        if (g && g.player && window.__SL2lethal) {
          clearInterval(t2);
          const ok = window.__SL2lethal(g.player);
          console.log("[injtest2] second lethal hook:", ok);
          if (ok) setTimeout(() => { try { window.__SL2injOpen(saveOf(getGame().player)); } catch (e) {} }, 4200);
        } else if (tries > 60) clearInterval(t2);
      }, 1000);
    }
  } catch (e) {}
  try {
    document.addEventListener("keydown", (e) => {
      if (e.key === "b" || e.key === "B") {
        if ($q("#p6ov") || $q("#p1ov") || $q("#p5ov") || $q("input:focus,textarea:focus")) return;
        brokenTry();
      }
    });
  } catch {}
  setTimeout(worldNotice, 8000);
}
export { openInjuries as open, boot, applyInjury, powerPct, restoreReady, brokenTry, renderInjuries };
