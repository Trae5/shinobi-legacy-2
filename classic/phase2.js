/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 2
   Living World: Lost Villages, Wandering Merchant, Contracts,
   Secret Organizations, Properties.
   Depends on phase1.js (helpers, mats store).
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, setWeaponHook, V_ui } from "./phase1.js";

/* ---------- world store (same char object as phase 1) ---------- */
let SAVE2 = null;
function wChar() {
  const c = p1char(SAVE2);
  c.w2 = c.w2 || { villages: {}, org: null, orgRank: 0, orgContrib: 0, props: {}, lastCollect: 0, bag: {}, contracts: {}, contractsDay: "", counters: { train: 0, trial: 0, forge: 0, hunt: 0, focus: 0 } };
  return c;
}
function wRyo() { return Math.max(0, Math.floor((SAVE2 && SAVE2.ryo) || 0)); }
function wSpendRyo(n) { if (!SAVE2) return false; SAVE2.ryo = Math.max(0, Math.floor(SAVE2.ryo || 0) - n); return true; }
function wGainRyo(n) { if (SAVE2) SAVE2.ryo = Math.max(0, Math.floor(SAVE2.ryo || 0) + n); }
/* daily seed */
function seedOf(dayShift) { const d = new Date(Date.now() + (dayShift || 0) * 86400000); return d.getFullYear() * 1e4 + (d.getMonth() + 1) * 100 + d.getDate(); }
function mulberry(seed) { let t = seed >>> 0; return function () { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function pickSeeded(arr, n, seed) { const rng = mulberry(seed), pool = arr.slice(), out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]); return out; }

/* ============================================================
   LOST VILLAGES — expedition to discover, then a standing perk
   ============================================================ */
const VILLAGES = [
  { id: "yoru", name: "Yoru Village", where: "The Whispering Caves", icon: "🕳", reqLv: 8, cost: 3000, perk: "Black-market prices: merchants charge you 8% less", perkKey: "shop" },
  { id: "kori", name: "Kōri Village", where: "The Frost Reaches", icon: "❄", reqLv: 15, cost: 9000, perk: "Ice-focus regimen: +8% training XP", perkKey: "train" },
  { id: "nuibari", name: "Sunken Village", where: "The Drowned Shrine", icon: "🌊", reqLv: 22, cost: 20000, perk: "Salvage rights: +12% material finds", perkKey: "mats" },
  { id: "ashen", name: "Ashen Village", where: "The Scorched Pass", icon: "🔥", reqLv: 30, cost: 45000, perk: "War-hardened lineage: +10% power in trials", perkKey: "trial" },
  { id: "flame", name: "Village of the First Flame", where: "Ruins beyond the wall", icon: "🌅", reqLv: 45, cost: 120000, perk: "The old forge remembers: rare merchant stock", perkKey: "rare" }
];
function villageDiscovered(id) { return !!wChar().w2.villages[id]; }
function doExpedition(v) {
  if (villageDiscovered(v.id)) return;
  if (pLv() < v.reqLv) { toast("You need Lv " + v.reqLv + " for that expedition."); return; }
  if (wRyo() < v.cost) { toast("The expedition costs " + fmtN(v.cost) + " ryo."); return; }
  wSpendRyo(v.cost);
  wChar().w2.villages[v.id] = Date.now();
  p1save();
  toast(v.icon + " " + v.name + " discovered! " + v.where + " opens to you.");
  renderWorld();
}
function villagePerks() {
  const c = wChar();
  const p = { shop: 0, train: 0, mats: 0, trial: 0, rare: false };
  for (const v of VILLAGES) if (c.w2.villages[v.id]) { if (v.perkKey === "shop") p.shop += 0.08; if (v.perkKey === "train") p.train += 0.08; if (v.perkKey === "mats") p.mats += 0.12; if (v.perkKey === "trial") p.trial += 0.10; if (v.perkKey === "rare") p.rare = true; }
  return p;
}
/* trial perk plugs into the battle hook */
setWeaponHook(() => { const o = orgPerks(); return villagePerks().trial + (wChar().w2.org === "veil" ? o.ryo * 10 : 0); });

/* ============================================================
   WANDERING MERCHANT — rotating stock every 2 hours
   ============================================================ */
const MERCH_ITEMS = [
  { id: "ore5", name: "Ore Bundle", icon: "⚙", desc: "5 chunks of smithing ore.", price: 450, give: c => { c.mats.ore += 5; } },
  { id: "dust3", name: "Scroll Dust", icon: "✻", desc: "3 pouches of ground seal-paper.", price: 700, give: c => { c.mats.scrollDust += 3; } },
  { id: "claw2", name: "Beast Claws", icon: "🐾", desc: "2 shed claws from the wilds.", price: 900, give: c => { c.mats.beastClaw += 2; } },
  { id: "jade1", name: "Cut Jade", icon: "🟢", desc: "One flawless cut. Rare.", price: 2600, give: c => { c.mats.jade += 1; } },
  { id: "charm", name: "Trial Charm", icon: "🎴", desc: "Your next trial pays +50% ryo and mats.", price: 1200, give: c => { c.w2.bag.charm = (c.w2.bag.charm || 0) + 1; } },
  { id: "tea", name: "Restorative Tea", icon: "🍵", desc: "Resets one training drill's rest timer.", price: 500, give: c => { c.w2.bag.tea = (c.w2.bag.tea || 0) + 1; } }
];
function merchSlot() { return Math.floor(Date.now() / (2 * 3600 * 1000)); }
function merchStock() {
  const rng = mulberry(merchSlot() * 7919 + 13);
  const pool = MERCH_ITEMS.slice();
  const out = [];
  const n = 4 + Math.floor(rng() * 2);
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
function merchPrice(it) { return Math.max(1, Math.round(it.price * (1 - villagePerks().shop - orgPerks().shop))); }
function doBuy(it) {
  const c = wChar();
  const price = merchPrice(it);
  if (wRyo() < price) { toast("Not enough ryo — need " + fmtN(price) + "."); return; }
  wSpendRyo(price);
  it.give(c);
  p1save();
  toast(it.icon + " " + it.name + " bought for " + fmtN(price) + " ryo.");
  renderWorld();
}

/* ============================================================
   CONTRACTS — daily generated missions
   ============================================================ */
const CONTRACT_POOL = [
  { id: "c_train", text: n => "Complete " + n + " training drills", key: "train", n: [3, 5], ryo: [800, 1600], mats: { ore: 2 } },
  { id: "c_trial", text: n => "Win " + n + " trials in the arena", key: "trial", n: [2, 4], ryo: [1200, 2400], mats: { scrollDust: 2 } },
  { id: "c_forge", text: n => "Forge or upgrade " + n + " weapon" + (n > 1 ? "s" : ""), key: "forge", n: [1, 2], ryo: [1500, 3000], mats: { ore: 3 } },
  { id: "c_hunt", text: n => "Hunt with your contract beast " + n + " times", key: "hunt", n: [2, 4], ryo: [900, 1800], mats: { beastClaw: 2 } },
  { id: "c_focus", text: n => "Finish " + n + " chakra focus sessions", key: "focus", n: [1, 3], ryo: [700, 1400], mats: { scrollDust: 1 } },
  { id: "c_train2", text: n => "Bank " + n + " training drill scores of 70+", key: "train", n: [2, 3], ryo: [1000, 2000], mats: { ore: 2, scrollDust: 1 } }
];
function dayContracts() {
  const c = wChar();
  const today = String(seedOf(0));
  if (c.w2.contractsDay !== today) {
    const rng = mulberry(seedOf(0) * 104729 + pLv());
    const pool = CONTRACT_POOL.slice();
    const out = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const n = t.n[0] + Math.floor(rng() * (t.n[1] - t.n[0] + 1));
      const ryo = t.ryo[0] + Math.floor(rng() * (t.ryo[1] - t.ryo[0]));
      out.push({ id: t.id, n, ryo, mats: t.mats, prog: 0, done: false, claimed: false });
    }
    c.w2.contracts = out;
    c.w2.contractsDay = today;
    for (const k in c.w2.counters) c.w2.counters[k] = 0;
    p1save();
  }
  return c.w2.contracts;
}
function contractDone(ct) { return (wChar().w2.counters[ct.key] || 0) >= ct.n; }
function claimContract(ct) {
  if (ct.claimed || !contractDone(ct)) return;
  ct.claimed = true;
  wGainRyo(ct.ryo);
  const c = wChar();
  for (const k in ct.mats) c.mats[k] = (c.mats[k] || 0) + ct.mats[k];
  p1save();
  toast("Contract complete: +" + fmtN(ct.ryo) + " ryo" + (Object.keys(ct.mats).length ? " + materials" : ""));
  renderWorld();
}

/* ============================================================
   SECRET ORGANIZATIONS
   ============================================================ */
const ORGS = [
  { id: "veil", name: "The Crimson Veil", icon: "🩸", motto: "Power belongs to those who take it.", perk: k => "+" + (k * 2) + "% power in trials" },
  { id: "hollow", name: "The Hollow Hand", icon: "🖐", motto: "Every lock has a key. We sell copies.", perk: k => "merchants charge " + (k * 3) + "% less" },
  { id: "ember", name: "The Ember Court", icon: "🔥", motto: "From ash, mastery.", perk: k => "+" + (k * 2) + "% training XP" }
];
const ORG_RANKS = [
  { name: "Stray", need: 0 }, { name: "Initiate", need: 500 }, { name: "Operative", need: 2000 },
  { name: "Hidden Blade", need: 6000 }, { name: "Inner Circle", need: 15000 }, { name: "Shadowmaster", need: 40000 }
];
function orgRankOf(contrib) { let r = 0; for (let i = 0; i < ORG_RANKS.length; i++) if (contrib >= ORG_RANKS[i].need) r = i; return r; }
function doJoinOrg(o) {
  const c = wChar();
  if (c.w2.org) { toast("You already answer to " + ORGS.find(x => x.id === c.w2.org).name + "."); return; }
  c.w2.org = o.id; c.w2.orgRank = 0; c.w2.orgContrib = 0;
  p1save();
  toast(o.icon + " You joined " + o.name + ".");
  renderWorld();
}
function doContribute(amount) {
  const c = wChar();
  if (!c.w2.org) return;
  if (wRyo() < amount) { toast("Not enough ryo."); return; }
  wSpendRyo(amount);
  c.w2.orgContrib += amount;
  const before = c.w2.orgRank;
  c.w2.orgRank = orgRankOf(c.w2.orgContrib);
  p1save();
  if (c.w2.orgRank > before) toast(ORG_RANKS[c.w2.orgRank].name + " rank reached!");
  else toast("Contribution banked: " + fmtN(c.w2.orgContrib));
  renderWorld();
}
function orgPerks() {
  const c = wChar();
  const p = { ryo: 0, shop: 0, train: 0 };
  if (!c.w2 || !c.w2.org) return p;
  const k = c.w2.orgRank;
  const o = ORGS.find(x => x.id === c.w2.org);
  if (!o) return p;
  if (o.id === "veil") p.ryo = k * 0.02;
  if (o.id === "hollow") p.shop = k * 0.03;
  if (o.id === "ember") p.train = k * 0.02;
  return p;
}

/* ============================================================
   PROPERTIES — ryo accrues over real time
   ============================================================ */
const PROPS = [
  { id: "apt", name: "Village Apartment", icon: "🏠", cost: 15000, perHr: 120, desc: "A small room above the tea shop. Rent pays itself." },
  { id: "house", name: "Shinobi House", icon: "🏡", cost: 60000, perHr: 480, desc: "A proper home with a training yard." },
  { id: "manor", name: "Clan Manor", icon: "🏯", cost: 250000, perHr: 2000, desc: "Walls of cedar and iron. Your name is on the gate." },
  { id: "estate", name: "Shadow Estate", icon: "🌆", cost: 1000000, perHr: 8000, desc: "The kind of holding villages whisper about." }
];
function collectIncome() {
  const c = wChar();
  const now = Date.now();
  const last = c.w2.lastCollect || now;
  const hrs = Math.min(24, (now - last) / 3600000);
  if (hrs < 0.05) return 0;
  let rate = 0;
  for (const p of PROPS) if (c.w2.props[p.id]) rate += p.perHr;
  const gain = Math.floor(rate * hrs);
  c.w2.lastCollect = now;
  if (gain > 0) { wGainRyo(gain); }
  p1save();
  return gain;
}
function doBuyProp(p) {
  const c = wChar();
  if (c.w2.props[p.id]) return;
  if (wRyo() < p.cost) { toast(p.name + " costs " + fmtN(p.cost) + " ryo."); return; }
  wSpendRyo(p.cost);
  c.w2.props[p.id] = Date.now();
  if (!c.w2.lastCollect) c.w2.lastCollect = Date.now();
  p1save();
  toast(p.icon + " " + p.name + " is yours. The keys are heavy.");
  renderWorld();
}

/* ============================================================
   WORLD PANEL UI
   ============================================================ */
let CUR2 = "villages";
function wMoneyLine() { const c = wChar(); return "💰 " + fmtN(wRyo()) + " ryo" + (villagePerks().shop || orgPerks().shop ? " · merchant discount active" : ""); }
function renderWorld() {
  const body = $q("#p2body");
  if (!body) return;
  body.textContent = "";
  body.append(hh("div", { class: "p1row", style: { marginBottom: "8px" } }, hh("span", { class: "p1pill" }, wMoneyLine()), collectIncome() > 0 ? hh("span", { class: "p1pill", style: { color: "#ffd34a", borderColor: "#ffd34a" } }, "Property income collected") : hh("span")));
  if (CUR2 === "villages") renderVillages(body);
  else if (CUR2 === "merchant") renderMerchant(body);
  else if (CUR2 === "contracts") renderContracts(body);
  else if (CUR2 === "orgs") renderOrgs(body);
  else renderProps(body);
}
function renderVillages(body) {
  body.append(hh("p", { style: { margin: "0 0 10px", fontSize: ".74rem", color: "#a8c4de" } }, "Five villages were erased from the maps. Fund an expedition to find one, and its survivors will remember you. Each discovery is permanent and grants its village's boon."));
  const grid = hh("div", { class: "p1grid" });
  for (const v of VILLAGES) {
    const disc = villageDiscovered(v.id);
    const card = hh("div", { class: "p1card" + (disc ? "" : " locked") });
    card.append(hh("h4", {}, v.icon + " " + v.name));
    card.append(hh("p", {}, v.where));
    card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Boon"), hh("b", {}, disc ? v.perk : "???")));
    if (!disc) card.append(hh("div", { class: "p1row" }, hh("button", { class: "p1btn", onclick: () => doExpedition(v) }, "Expedition · " + fmtN(v.cost) + " ryo")));
    else card.append(hh("div", { class: "p1timer" }, "Discovered " + new Date(wChar().w2.villages[v.id]).toLocaleDateString()));
    if (!disc) card.append(hh("div", { class: "p1timer" }, "Requires Lv " + v.reqLv));
    grid.append(card);
  }
  body.append(grid);
}
function renderMerchant(body) {
  const stock = merchStock();
  const nextIn = Math.max(0, (merchSlot() + 1) * 2 * 3600000 - Date.now());
  body.append(hh("div", { class: "p1row", style: { marginBottom: "8px" } }, hh("span", { class: "p1pill" }, "🛒 Wandering Merchant · restocks in " + Math.ceil(nextIn / 60000) + " min")));
  const grid = hh("div", { class: "p1grid" });
  for (const it of stock) {
    const price = merchPrice(it);
    const card = hh("div", { class: "p1card" });
    card.append(hh("h4", {}, it.icon + " " + it.name));
    card.append(hh("p", {}, it.desc));
    card.append(hh("div", { class: "p1row" }, hh("button", { class: "p1btn", onclick: () => doBuy(it) }, "Buy · " + fmtN(price) + " ryo")));
    grid.append(card);
  }
  body.append(grid);
  if (villagePerks().rare) body.append(hh("div", { class: "p1timer" }, "First Flame discount: your eyes see stock others never do (rare rotation seeded)."));
}
function renderContracts(body) {
  body.append(hh("p", { style: { margin: "0 0 10px", fontSize: ".74rem", color: "#a8c4de" } }, "Three contracts a day, drawn from the job board at dawn. They count your deeds across the expansion. Reset at midnight."));
  const grid = hh("div", { class: "p1grid" });
  const cnt = wChar().w2.counters;
  for (const ct of dayContracts()) {
    const prog = Math.min(ct.n, cnt[ct.key] || 0);
    const card = hh("div", { class: "p1card" + (ct.claimed ? " locked" : "") });
    card.append(hh("h4", {}, "📜 Contract"));
    card.append(hh("p", {}, typeof CONTRACT_POOL.find(t => t.id === ct.id).text === "function" ? CONTRACT_POOL.find(t => t.id === ct.id).text(ct.n) : ct.id));
    card.append(hh("div", { class: "p1bar" }, hh("i", { style: { width: (prog / ct.n) * 100 + "%" } })));
    card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Progress"), hh("b", {}, prog + " / " + ct.n)));
    card.append(hh("div", { class: "p1row" }, hh("button", { class: "p1btn", disabled: !contractDone(ct) || ct.claimed, onclick: () => claimContract(ct) }, ct.claimed ? "Claimed" : "Claim · " + fmtN(ct.ryo) + " ryo")));
    grid.append(card);
  }
  body.append(grid);
}
function renderOrgs(body) {
  const c = wChar();
  if (!c.w2.org) {
    body.append(hh("p", { style: { margin: "0 0 10px", fontSize: ".74rem", color: "#a8c4de" } }, "Three powers move beneath the villages. Swear yourself to one — you can only ever belong to one."));
    const grid = hh("div", { class: "p1grid" });
    for (const o of ORGS) {
      const card = hh("div", { class: "p1card" });
      card.append(hh("h4", {}, o.icon + " " + o.name));
      card.append(hh("p", {}, o.motto));
      card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Ranks 1-5"), hh("b", {}, o.perk(1).replace(/^./, ch => ch))));
      card.append(hh("div", { class: "p1row" }, hh("button", { class: "p1btn", onclick: () => doJoinOrg(o) }, "Swear in")));
      grid.append(card);
    }
    body.append(grid);
    return;
  }
  const o = ORGS.find(x => x.id === c.w2.org);
  const rank = c.w2.orgRank, next = ORG_RANKS[rank + 1];
  body.append(hh("div", { class: "p1card" },
    hh("h4", {}, o.icon + " " + o.name),
    hh("p", {}, o.motto),
    hh("div", { class: "p1stat" }, hh("span", {}, "Rank"), hh("b", {}, ORG_RANKS[rank].name)),
    hh("div", { class: "p1stat" }, hh("span", {}, "Standing perk"), hh("b", {}, o.perk(rank))),
    hh("div", { class: "p1bar" }, hh("i", { style: { width: (next ? Math.min(100, (c.w2.orgContrib / next.need) * 100) : 100) + "%" } })),
    hh("div", { class: "p1stat" }, hh("span", {}, "Contribution"), hh("b", {}, fmtN(c.w2.orgContrib) + (next ? " / " + fmtN(next.need) : " · MAX"))),
    next ? hh("div", { class: "p1row" },
      hh("button", { class: "p1btn", onclick: () => doContribute(500) }, "Give 500 ryo"),
      hh("button", { class: "p1btn", onclick: () => doContribute(2000) }, "Give 2,000 ryo")) : hh("div", { class: "p1timer" }, "You sit at the top of the shadow.")));
}
function renderProps(body) {
  body.append(hh("p", { style: { margin: "0 0 10px", fontSize: ".74rem", color: "#a8c4de" } }, "Land remembers its owner. Each holding pays ryo by the hour — up to a day's worth piles up before you must collect."));
  const rate = PROPS.filter(p => wChar().w2.props[p.id]).reduce((a, p) => a + p.perHr, 0);
  body.append(hh("div", { class: "p1row", style: { marginBottom: "8px" } }, hh("span", { class: "p1pill" }, "Income: " + fmtN(rate) + " ryo/hour")));
  const grid = hh("div", { class: "p1grid" });
  for (const p of PROPS) {
    const own = !!wChar().w2.props[p.id];
    const card = hh("div", { class: "p1card" + (own ? "" : " locked") });
    card.append(hh("h4", {}, p.icon + " " + p.name));
    card.append(hh("p", {}, p.desc));
    card.append(hh("div", { class: "p1stat" }, hh("span", {}, "Pays"), hh("b", {}, fmtN(p.perHr) + " ryo/hr")));
    card.append(own ? hh("div", { class: "p1timer" }, "Owned") : hh("div", { class: "p1row" }, hh("button", { class: "p1btn", onclick: () => doBuyProp(p) }, "Buy · " + fmtN(p.cost) + " ryo")));
    grid.append(card);
  }
  body.append(grid);
}
function openWorld(save, sfx) {
  SAVE2 = save || SAVE2;
  CUR2 = "villages";
  if (!$q("#p1css")) { const st = document.createElement("style"); st.id = "p1css"; st.textContent = CSS; document.head.append(st); }
  let ov = $q("#p1ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p1ov" },
    hh("div", { class: "p1m", id: "p1m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "World Expansion · Phase 2"),
        hh("span", { class: "p1who" }, pName() + " · Lv " + pLv()),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeWorld }, "✕")),
      hh("div", { class: "p1tabs" },
        ["villages", "merchant", "contracts", "orgs", "props"].map(k => {
          const label = { villages: "🗺 Lost Villages", merchant: "🛒 Merchant", contracts: "📜 Contracts", orgs: "🩸 Secret Orgs", props: "🏠 Properties" }[k];
          return hh("button", { class: "p1tab" + (k === CUR2 ? " on" : ""), id: "p2tab-" + k, onclick: () => { V_ui(); setWorldTab(k); } }, label);
        })),
      hh("div", { class: "p1body", id: "p2body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Phase 2 — The Living World"),
        hh("span", {}, "Villages · Merchant · Contracts · Orgs · Properties"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeWorld(); });
  renderWorld();
}
function setWorldTab(k) {
  CUR2 = k;
  for (const id of ["villages", "merchant", "contracts", "orgs", "props"]) { const t = $q("#p2tab-" + id); if (t) t.classList.toggle("on", id === k); }
  renderWorld();
}
function closeWorld() { const ov = $q("#p1ov"); if (ov) ov.remove(); }
export { openWorld as open, villagePerks, orgPerks, wChar, claimContract, contractDone, dayContracts, collectIncome, VILLAGES, PROPS, ORGS, MERCH_ITEMS };
