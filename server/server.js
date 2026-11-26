/* ============================================================
   Shinobi Legacy: Remastered — World Expansion · Phase 4
   Multiplayer game server (free tier, Render-ready)
   Node.js + WebSockets. Logins verified through Firebase
   Identity Toolkit (public web API key), so accounts & saves
   stay the ones players already have.
   Run: npm install && npm start   (PORT env honored)
   ============================================================ */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyA6EnB41g34TnhhLNJcx8OA2vmTrShwoi4";
const STATE_FILE = path.join(__dirname, "rankings.json");

/* ---------------- rankings persistence ---------------- */
let rankings = {};
try { rankings = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch (e) { rankings = {}; }
let saveTimer = null;
function saveRankings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(STATE_FILE, JSON.stringify(rankings, null, 2)); } catch (e) { console.error("save", e.message); }
  }, 2000);
}

/* ---------------- firebase token verification ---------------- */
const tokenCache = new Map(); /* uid -> {exp} */
async function verifyToken(idToken) {
  const body = JSON.stringify({ idToken });
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.users || !data.users[0]) return null;
  return { uid: data.users[0].localId, email: data.users[0].email || "" };
}

/* ---------------- players & rooms ---------------- */
const players = new Map(); /* ws -> {uid, name, lv, ws, room} */
const rooms = new Map();   /* name -> {players:Set, kind} */

function roomOf(name, kind) {
  if (!rooms.has(name)) rooms.set(name, { players: new Set(), kind: kind || "social" });
  return rooms.get(name);
}
function broadcast(room, obj, except) {
  const msg = JSON.stringify(obj);
  for (const p of room.players) if (p !== except && p.ws.readyState === 1) p.ws.send(msg);
}
function lobbyList() {
  return [...players.values()].filter(p => !p.room).map(p => ({ name: p.name, lv: p.lv, uid: p.uid, arm: (p.inj && p.inj.arm) || null, eye: (p.inj && p.inj.eye) || null }));
}

/* ---------------- pvp referee ---------------- */
/* The server, not the client, resolves arena fights: each side
   sends its build once; the server rolls the battle turn by turn
   so neither player can lie about the outcome. */
function rollFight(a, b) {
  const hpA = a.hp || 100, hpB = b.hp || 100;
  let curA = hpA, curB = hpB, log = [], turn = 0;
  while (curA > 0 && curB > 0 && turn < 200) {
    turn++;
    const atkA = a.atk * (0.85 + Math.random() * 0.3);
    const atkB = b.atk * (0.85 + Math.random() * 0.3);
    curB -= atkA; curA -= atkB;
    log.push(turn);
  }
  const aWins = curB <= 0 && (curA > 0 || Math.random() < 0.5);
  return { winner: aWins ? "a" : "b", turns: turn, log: log.length };
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.writeHead(200); res.end("ok v2-inj"); return; }
  if (req.url === "/rankings") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(rankings)); return; }
  res.writeHead(404); res.end();
});
let WSS;
try { WSS = new (require("ws").Server)({ server }); }
catch (e) { console.error("ws package missing — run: npm install"); process.exit(1); }

WSS.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  ws.on("message", async (raw) => {
    let m = null;
    try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m || typeof m.t !== "string") return;

    /* first message must be an auth: {t:"auth", idToken, name, lv} */
    if (!ws.authed) {
      if (m.t !== "auth") { ws.send(JSON.stringify({ t: "err", msg: "auth first" })); return; }
      /* a verified Firebase token is a real account; no token (the classic
         client ships no Firebase SDK, so it always sends null) joins as a
         guest so the arena works for everyone */
      let u = null;
      if (m.idToken) { u = await verifyToken(m.idToken); if (!u) { ws.send(JSON.stringify({ t: "auth_fail" })); return; } }
      ws.authed = true;
      const nm = String((u && !m.name) ? (u.email || "Shinobi").split("@")[0] : (m.name || "Shinobi")).slice(0, 20);
      const p = { uid: u ? u.uid : ("g:" + nm.toLowerCase().replace(/[^a-z0-9]/g, "") + ":" + Math.random().toString(36).slice(2, 8)), name: nm, lv: Math.max(1, Math.floor(Number(m.lv) || 1)), ws, room: null };
      players.set(ws, p);
      ws.send(JSON.stringify({ t: "welcome", name: p.name, online: players.size, rankings: rankings[p.uid] || null }));
      /* a newcomer learns the injuries already in the room */
      for (const q of players.values()) if (q !== p && q.inj && (q.inj.arm || q.inj.eye)) ws.send(JSON.stringify({ t: "inj", name: q.name, arm: q.inj.arm, eye: q.inj.eye }));
      broadcast(roomOf("lobby"), { t: "chat", from: "server", msg: p.name + " entered the arena." });
      return;
    }
    const p = players.get(ws);
    if (!p) return;

    if (m.t === "inj") {
      p.inj = { arm: (m.arm === "left" || m.arm === "right") ? m.arm : null, eye: (m.eye === "left" || m.eye === "right") ? m.eye : null };
      broadcast(roomOf(p.room || "lobby"), { t: "inj", name: p.name, arm: p.inj.arm, eye: p.inj.eye }, ws);
    } else if (m.t === "chat") {
      const msg = String(m.msg || "").slice(0, 200);
      broadcast(roomOf(p.room || "lobby"), { t: "chat", from: p.name, msg });
    } else if (m.t === "list") {
      ws.send(JSON.stringify({ t: "list", players: lobbyList() }));
    } else if (m.t === "duel" && m.target) {
      const foe = [...players.values()].find(x => x.name === m.target && x !== p);
      if (!foe) { ws.send(JSON.stringify({ t: "err", msg: "player not online" })); return; }
      /* store each build, then resolve when both sides are in */
      p.build = m.build || {}; p.duelWith = foe.name;
      if (foe.build && foe.duelWith === p.name) {
        const r = rollFight(p.build, foe.build);
        const winName = r.winner === "a" ? p.name : foe.name;
        const loseName = r.winner === "a" ? foe.name : p.name;
        rankings[winName] = (rankings[winName] || 0) + 25;
        rankings[loseName] = Math.max(0, (rankings[loseName] || 0) - 10);
        saveRankings();
        p.ws.send(JSON.stringify({ t: "duel_result", vs: foe.name, win: winName === p.name, turns: r.turns, elo: rankings[p.name] || 0 }));
        foe.ws.send(JSON.stringify({ t: "duel_result", vs: p.name, win: winName === foe.name, turns: r.turns, elo: rankings[foe.name] || 0 }));
        broadcast(roomOf("lobby"), { t: "chat", from: "server", msg: winName + " defeated " + loseName + " in a duel." });
        p.build = null; foe.build = null; p.duelWith = null; foe.duelWith = null;
      } else {
        ws.send(JSON.stringify({ t: "pending", msg: "challenge sent to " + foe.name }));
      }
    } else if (m.t === "room") {
      if (p.room) roomOf(p.room).players.delete(ws);
      p.room = m.room ? String(m.room).slice(0, 24) : null;
      if (p.room) roomOf(p.room).players.add(ws);
      ws.send(JSON.stringify({ t: "room", room: p.room }));
    } else if (m.t === "ping") {
      ws.send(JSON.stringify({ t: "pong", time: Date.now() }));
    }
  });
  ws.on("close", () => {
    const p = players.get(ws);
    if (p && p.room) roomOf(p.room).players.delete(ws);
    players.delete(ws);
    if (p) broadcast(roomOf("lobby"), { t: "chat", from: "server", msg: p.name + " left." });
  });
});

setInterval(() => {
  for (const ws of WSS.clients) {
    if (!ws.isAlive) { try { ws.terminate(); } catch (e) {} continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 30000);

server.listen(PORT, () => console.log("Shinobi Legacy arena server listening on :" + PORT));
