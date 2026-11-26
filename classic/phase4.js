/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 4
   Multiplayer client: arena chat, player list, server-refereed
   duels, rankings. Talks to the Phase 4 arena server
   (server/server.js) over WebSockets; logins ride the player's
   existing Firebase session, so nothing new to sign up for.
   ============================================================ */
import { hh, $q, toast, p1char, p1save, pLv, pName, fmtN, clampN, rnd, pick, CSS, V_ui } from "./phase1.js?v=p1133";

/* Set this to the deployed arena server address when it goes live.
   Empty means the panel shows the offline state and the rest of
   the game runs exactly as it does today. */
const SERVER_URL = "wss://shinobi-legacy-2.onrender.com";

let SAVE4 = null, sock = null, uiCb = null;
function mChar() {
  const c = p1char(SAVE4);
  c.a4 = c.a4 || { log: [], elo: 0 };
  return c;
}
function pushLog(from, msg) {
  const c = mChar();
  c.a4.log.push({ from, msg, at: Date.now() });
  if (c.a4.log.length > 60) c.a4.log.splice(0, c.a4.log.length - 60);
  p1save();
}
function setServer(url) { return url; } /* deploy step swaps the constant above */

function openMultiplayer(save, cb) {
  SAVE4 = save || null;
  uiCb = cb || null;
  p1save();
  if (!$q("#p4css")) { const st = document.createElement("style"); st.id = "p4css"; st.textContent = CSS; document.head.append(st); }
  let ov = $q("#p4ov");
  if (ov) ov.remove();
  ov = hh("div", { class: "p1ov", id: "p4ov" },
    hh("div", { class: "p1m", id: "p4m" },
      hh("div", { class: "p1head" },
        hh("h2", {}, "World Expansion · Multiplayer"),
        hh("span", { class: "p1who", id: "p4who" }, statusLine()),
        hh("button", { class: "p1x", "aria-label": "Close", onclick: closeMultiplayer }, "✕")),
      hh("div", { class: "p1body", id: "p4body" }),
      hh("div", { class: "p1foot" },
        hh("span", {}, "Phase 4 — Multiplayer Arena"),
        hh("span", {}, "Chat · Duels · Rankings (server refereed)"))));
  document.body.append(ov);
  ov.addEventListener("pointerdown", (e) => { if (e.target === ov) closeMultiplayer(); });
  renderMultiplayer();
  if (SERVER_URL) connect();
}
function closeMultiplayer() {
  const ov = $q("#p4ov"); if (ov) ov.remove();
  if (sock) { try { sock.close(); } catch (e) {} sock = null; }
}
function statusLine() {
  if (!SERVER_URL) return "Server not deployed yet";
  return sock && sock.readyState === 1 ? "Online" : "Connecting…";
}
function renderMultiplayer() {
  const body = $q("#p4body"); if (!body) return;
  const c = mChar();
  body.textContent = "";
  if (!SERVER_URL) {
    body.append(hh("div", { class: "p1title" }, "The arena opens when the server deploys"));
    body.append(hh("div", { class: "p1card" },
      hh("div", { style: { fontWeight: 800 } }, "⚔ Multiplayer arena — built, awaiting the server"),
      hh("div", { style: { fontSize: ".78rem", opacity: .85, margin: "4px 0" } },
        "The battle server is referee for every duel, war and ranking, so nobody can cheat the outcome. It ships on a free tier and uses your existing account: nothing new to sign up for."),
      hh("div", { style: { fontSize: ".78rem", opacity: .8 } }, "Everything else in the expansion plays offline until then.")));
    body.append(hh("div", { class: "p1card" },
      hh("div", { style: { fontWeight: 800 } }, "Leaderboard (local)"),
      hh("div", { style: { fontSize: ".78rem", opacity: .85 } }, "Your record carries over: " + fmtN(c.a4.elo || 0) + " points.")));
    return;
  }
  /* live server UI: chat + list + duel */
  body.append(hh("div", { class: "p1row", style: { marginBottom: "8px" } },
    hh("button", { class: "p1btn", onclick: () => send({ t: "list" }) }, "🔄 Refresh players"),
    hh("button", { class: "p1btn ghost", onclick: () => send({ t: "room", room: null }) }, "Return to lobby")));
  const logEl = hh("div", { class: "p1log", style: { maxHeight: "240px" }, id: "p4log" });
  logEl.innerHTML = c.a4.log.map(l => "<div><b>" + l.from + "</b> " + l.msg + "</div>").join("");
  body.append(logEl);
  logEl.scrollTop = logEl.scrollHeight;
  const inp = hh("input", { class: "p1inp", placeholder: "Say something in the arena…", id: "p4chat" });
  const sendBtn = hh("button", { class: "p1btn", onclick: () => { const v = inp.value.trim(); if (v) { send({ t: "chat", msg: v }); inp.value = ""; } } }, "Send");
  body.append(hh("div", { class: "p1row", style: { marginTop: "8px" } }, inp, sendBtn));
  const roster = hh("div", { class: "p1card", style: { marginTop: "8px" }, id: "p4roster" });
  body.append(roster);
  renderRoster(c.a4.roster || []);
}
function renderRoster(list) {
  const c = mChar();
  c.a4.roster = list;
  p1save();
  const r = $q("#p4roster"); if (!r) return;
  r.textContent = "";
  r.append(hh("div", { style: { fontWeight: 800 } }, "In the arena: " + list.length));
  for (const p of list) {
    if (p.name === pName()) continue;
    r.append(hh("div", { style: { display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.06)" } },
      hh("span", { style: { fontSize: ".8rem" } }, p.name + " · Lv " + p.lv),
      hh("button", { class: "p1btn", style: { padding: "2px 8px", fontSize: ".72rem" }, onclick: () => challenge(p.name) }, "Duel")));
  }
}
function challenge(name) {
  const c = p1char(SAVE4);
  send({ t: "duel", target: name, build: { atk: atkOf(c), hp: hpOf(c) } });
  toast("Challenge sent to " + name + ".");
}
function atkOf(c) { return Math.round(12 + (c.level || pLv()) * 2.1 + ((c.str || 10) * 0.6)); }
function hpOf(c) { return Math.round(60 + (c.level || pLv()) * 5 + ((c.vit || 10) * 1.2)); }
function send(obj) { if (sock && sock.readyState === 1) sock.send(JSON.stringify(obj)); }

function connect() {
  if (!SERVER_URL) return;
  try { sock = new WebSocket(SERVER_URL); } catch (e) { toast("Arena unreachable."); return; }
  sock.addEventListener("open", () => {
    try { window.__SL2sock = sock; } catch (e) {}
    const c = p1char(SAVE4);
    /* the classic client has no Firebase SDK, so the token is null and the
       arena server signs us in as a guest; a client that sends a real token
       is verified against Firebase instead */
    send({ t: "auth", idToken: null, name: pName(), lv: pLv() });
  });
  sock.addEventListener("message", (ev) => {
    let m = null; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.t === "welcome") { try { const st = window.__SL2injState && window.__SL2injState(); if (st && (st.arm || st.eye)) send({ t: "inj", name: pName(), arm: st.arm, eye: st.eye }); } catch (e) {} }
    if (m.t === "chat" || m.t === "welcome" || m.t === "pending" || m.t === "err") { pushLog(m.from || "server", m.msg || ""); renderMultiplayer(); }
    else if (m.t === "list") { renderRoster(m.players || []); }
    else if (m.t === "duel_result") {
      pushLog("arena", (m.win ? "You won " : "You lost ") + " vs " + m.vs + " in " + m.turns + " turns. Points: " + m.elo);
      const c = mChar(); c.a4.elo = m.elo || c.a4.elo; p1save();
      toast(m.win ? "Victory over " + m.vs + "!" : "Defeat vs " + m.vs + ".");
      renderMultiplayer();
    }
    else if (m.t === "inj") { try { window.__SL2injPeer && window.__SL2injPeer(m); } catch (e) {} }
    else if (m.t === "auth_fail") { toast("Arena sign-in failed. Try re-entering the game."); }
  });
  sock.addEventListener("close", () => { sock = null; try { window.__SL2sock = null; } catch (e) {} const w = $q("#p4who"); if (w) w.textContent = statusLine(); });
}
export { openMultiplayer as open, challenge, connect, send };
