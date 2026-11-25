import * as THREE from 'three';

/* ---------- renderer / scene ---------- */
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d18);
scene.fog = new THREE.Fog(0x0a0d18, 24, 120);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0x7f92bd, 0x241a12, 0.5));

const moonLight = new THREE.DirectionalLight(0xbcd0ff, 1.1);
moonLight.position.set(-24, 32, -18);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -45;
moonLight.shadow.camera.right = 45;
moonLight.shadow.camera.top = 45;
moonLight.shadow.camera.bottom = -45;
moonLight.shadow.camera.far = 110;
moonLight.shadow.bias = -0.0004;
scene.add(moonLight);

const ember = new THREE.DirectionalLight(0xff9d5c, 0.3);
ember.position.set(14, 9, 12);
scene.add(ember);

/* ---------- sky ---------- */
const moonDisc = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 40),
  new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false })
);
moonDisc.position.set(-70, 46, -95);
moonDisc.lookAt(0, 0, 0);
scene.add(moonDisc);

{
  const n = 320, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * 0.5 + 0.08;
    const r = 160;
    pos[i*3] = Math.cos(a) * r * (1 - e * 0.6);
    pos[i*3+1] = 20 + e * 90;
    pos[i*3+2] = Math.sin(a) * r * (1 - e * 0.6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaeb9e8, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false })));
}

/* ---------- ground ---------- */
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(130, 64),
  new THREE.MeshStandardMaterial({ color: 0x141d17, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function patch(x, z, r, color) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); m.receiveShadow = true; scene.add(m);
}
patch(0, -6, 7, 0x1a1713); patch(9, 4, 4, 0x18150f); patch(-11, 7, 5, 0x191610);

/* ---------- props ---------- */
function makeTorii(x, z) {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0x8c2330, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2226, roughness: 0.9 });
  [-3.4, 3.4].forEach(dx => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 6.4, 10), red);
    c.position.set(dx, 3.2, 0); g.add(c);
  });
  const top = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.75, 1.1), red);
  top.position.y = 6.6; g.add(top);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.32, 1.5), dark);
  cap.position.y = 7.1; g.add(cap);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.5, 0.8), red);
  mid.position.y = 5.2; g.add(mid);
  g.position.set(x, 0, z);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
}
makeTorii(0, -13);

function makeLantern(x, z) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x4b4f55, roughness: 0.95 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8), stone);
  base.position.y = 0.45; g.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 8), stone);
  pillar.position.y = 1.3; g.add(pillar);
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 0.75), stone);
  house.position.y = 2.05; g.add(house);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.5), new THREE.MeshStandardMaterial({ color: 0xffc98a, emissive: 0xffa14d, emissiveIntensity: 2.2, roughness: 0.4 }));
  glow.position.y = 2.05; g.add(glow);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 4), stone);
  roof.position.y = 2.6; roof.rotation.y = Math.PI / 4; g.add(roof);
  const light = new THREE.PointLight(0xffa14d, 18, 15, 2);
  light.position.y = 2.1; g.add(light);
  g.position.set(x, 0, z);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
}
makeLantern(-5.5, -8); makeLantern(5.5, -8); makeLantern(-9, 3); makeLantern(9, 3);

function makeTree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 2.4 * s, 7), new THREE.MeshStandardMaterial({ color: 0x2e2018, roughness: 1 }));
  trunk.position.y = 1.2 * s; g.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e3526, roughness: 1 });
  [[0, 2.9, 0, 1.5], [0.8, 2.4, 0.4, 1.05], [-0.7, 2.5, -0.3, 1.0]].forEach(([px, py, pz, r]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), leafMat);
    b.position.set(px * s, py * s, pz * s); b.scale.y = 0.75; g.add(b);
  });
  g.position.set(x, 0, z);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
}
makeTree(-14, -18, 1.2); makeTree(13, -16, 1); makeTree(-18, 2, 0.9);
makeTree(18, 6, 1.1); makeTree(7, 16, 0.95); makeTree(-6, 18, 1.05);

[[6, -4, 0.5], [-7, -3, 0.4], [12, -9, 0.7], [-12, -10, 0.6], [3, 9, 0.45], [-4, 12, 0.5], [16, -2, 0.55]].forEach(([x, z, s]) => {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 1 }));
  r.position.set(x, s * 0.4, z); r.rotation.set((x * 13) % 3, (z * 7) % 3, (s * 5) % 3);
  r.castShadow = true; r.receiveShadow = true; scene.add(r);
});

/* ---------- shinobi ---------- */
function makeShinobi(pal) {
  const M = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04, ...extra });
  const clothMat = M(pal.cloth), armorMat = M(pal.armor, 0.7), skinMat = M(pal.skin, 0.65),
    hairMat = M(pal.hair, 0.6), wrapMat = M(pal.wrap, 0.95), accentMat = M(pal.accent, 0.7);

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const hips = new THREE.Group(); hips.position.y = 0.98; body.add(hips);

  const mkLeg = (side) => {
    const leg = new THREE.Group(); leg.position.set(0.13 * side, 0, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), clothMat);
    thigh.position.y = -0.2; leg.add(thigh);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.28, 4, 8), wrapMat);
    shin.position.y = -0.56; leg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.27), wrapMat);
    foot.position.set(0, -0.93, 0.05); leg.add(foot);
    return leg;
  };
  const legL = mkLeg(1), legR = mkLeg(-1);
  hips.add(legL, legR);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.2, 0.6, 10), clothMat);
  torso.position.y = 0.34; hips.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.2), armorMat);
  chest.position.set(0, 0.46, 0.03); hips.add(chest);
  const obi = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.13, 0.24), accentMat);
  obi.position.y = 0.08; hips.add(obi);

  const mkArm = (side) => {
    const arm = new THREE.Group(); arm.position.set(0.25 * side, 0.56, 0);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), armorMat);
    pad.scale.set(1.2, 0.8, 1.2); arm.add(pad);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.22, 4, 8), clothMat);
    upper.position.y = -0.16; arm.add(upper);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.2, 4, 8), wrapMat);
    fore.position.y = -0.42; arm.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    hand.position.y = -0.58; arm.add(hand);
    return arm;
  };
  const armL = mkArm(1), armR = mkArm(-1);
  hips.add(armL, armR);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), skinMat);
  neck.position.y = 0.72; hips.add(neck);
  const head = new THREE.Group(); head.position.y = 0.92; hips.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), skinMat);
  skull.scale.set(1, 1.08, 0.95); head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hair.position.y = 0.015; head.add(hair);
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), hairMat);
    const a = Math.PI * (1.05 + i * 0.18);
    spike.position.set(Math.cos(a) * 0.13, 0.02 + (i % 2) * 0.03, Math.sin(a) * 0.13);
    spike.rotation.set(0.35, 0, (i - 2) * 0.25); head.add(spike);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.075, 16, 1, true), accentMat);
  band.position.y = 0.045; head.add(band);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.02), M(0x9aa3b2, 0.35, { metalness: 0.6 }));
  plate.position.set(0, 0.045, 0.155); head.add(plate);

  const scarf = [];
  const base = new THREE.Group(); base.position.set(0, 0.62, -0.14); hips.add(base);
  scarf.push(base);
  for (let i = 1; i < 7; i++) {
    const seg = new THREE.Group(); seg.position.set(0, -0.015, -0.13);
    scarf[i - 1].add(seg); scarf.push(seg);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.1 - i * 0.004, 0.028, 0.13), accentMat);
    s.position.z = -0.065; seg.add(s);
  }

  const kat = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.85, 0.012), M(0xc9d2dd, 0.25, { metalness: 0.85 }));
  blade.position.y = 0.32; kat.add(blade);
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 10), M(0x2b2b30, 0.5, { metalness: 0.5 }));
  tsuba.rotation.x = Math.PI / 2; tsuba.position.y = -0.12; kat.add(tsuba);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.22, 8), M(0x1d2a44, 0.8));
  grip.position.y = -0.24; kat.add(grip);
  kat.position.set(0.05, 0.42, -0.19); kat.rotation.z = -0.5; hips.add(kat);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, hips, head, legL, legR, armL, armR, scarf, phase: Math.random() * 6, yaw: 0 };
}

const HERO = { cloth: 0x23262e, armor: 0x15171c, skin: 0xe8b98a, hair: 0x1a1a20, wrap: 0x3a3f4d, accent: 0xb3243a };
const P1 = { cloth: 0x2c3a2e, armor: 0x1c241d, skin: 0xd9a377, hair: 0x3a2a1a, wrap: 0x44483f, accent: 0x4c6b45 };
const P2 = { cloth: 0x2a3040, armor: 0x181d29, skin: 0xe0b183, hair: 0x101014, wrap: 0x3d4356, accent: 0x56698a };

const hero = makeShinobi(HERO);
hero.root.position.set(0, 0, 4);
hero.yaw = Math.PI; hero.root.rotation.y = Math.PI;
scene.add(hero.root);

const npcs = [];
const p1 = makeShinobi(P1);
p1.root.position.set(-4.5, 0, -9); p1.yaw = 0.31; p1.root.rotation.y = 0.31;
scene.add(p1.root); npcs.push(p1);
const p2 = makeShinobi(P2);
p2.root.position.set(4.8, 0, -10); p2.yaw = -0.4; p2.root.rotation.y = -0.4;
scene.add(p2.root); npcs.push(p2);

/* ---------- animation ---------- */
function animateShinobi(ch, dt, speed) {
  ch.phase += dt * (2.0 + 8.5 * speed);
  const w = speed;
  const s = Math.sin(ch.phase), c = Math.cos(ch.phase);
  ch.legL.rotation.x = s * 0.62 * w;
  ch.legR.rotation.x = -s * 0.62 * w;
  ch.armL.rotation.x = -s * 0.5 * w;
  ch.armR.rotation.x = s * 0.5 * w;
  ch.hips.position.y = 0.98 + Math.abs(c) * 0.05 * w;
  const t = performance.now() / 1000;
  ch.head.rotation.y = Math.sin(t * 0.7 + ch.phase) * 0.14 * (1 - w);
  ch.head.rotation.x = 0.04 + Math.sin(t * 1.1 + ch.phase) * 0.02;
  ch.scarf.forEach((seg, i) => {
    if (i === 0) return;
    seg.rotation.x = -0.12 + Math.sin(t * 3.2 + i * 0.85) * (0.08 + 0.2 * w) + w * 0.55;
    seg.rotation.z = Math.sin(t * 2.3 + i * 0.7) * 0.05;
  });
}

/* ---------- input ---------- */
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Digit1') setCam(0);
  if (e.code === 'Digit2') setCam(1);
  if (e.code === 'Digit3') setCam(2);
});
addEventListener('keyup', e => { keys[e.code] = false; });

let dragging = false, px = 0, py = 0;
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging) return;
  cam.yaw -= (e.clientX - px) * 0.0052;
  cam.pitch = Math.min(1.25, Math.max(0.06, cam.pitch + (e.clientY - py) * 0.0035));
  px = e.clientX; py = e.clientY; cam.lastDrag = performance.now();
});
addEventListener('wheel', e => { cam.dist = Math.min(16, Math.max(3, cam.dist * (1 + e.deltaY * 0.0009))); }, { passive: true });

/* ---------- camera ---------- */
const cam = { yaw: 0, pitch: 0.34, dist: 7.2, mode: 0, lastDrag: 0 };
const CAM_NAMES = ['FOLLOW', 'SHOULDER', 'CINEMATIC'];
const toastEl = document.getElementById('camtoast');
let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); toastT = performance.now(); }
function setCam(m) {
  cam.mode = m;
  if (m === 0) { cam.dist = 7.2; cam.pitch = 0.34; }
  if (m === 1) { cam.dist = 4.2; cam.pitch = 0.16; }
  if (m === 2) { cam.dist = 8.5; cam.pitch = 0.22; }
  toast(CAM_NAMES[m] + ' CAMERA');
}

function angDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 4, 11.5);
const camLook = new THREE.Vector3(0, 1.5, 0);
const loader = document.getElementById('loading');
let firstFrame = true;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = performance.now() / 1000;

  const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const moving = (ix || iz) ? 1 : 0;
  if (moving) {
    const fwd = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3().addScaledVector(fwd, iz).addScaledVector(right, ix).normalize();
    hero.root.position.addScaledVector(move, 3.6 * dt);
    const r = Math.hypot(hero.root.position.x, hero.root.position.z);
    if (r > 60) hero.root.position.multiplyScalar(60 / r);
    const ty = Math.atan2(move.x, move.z);
    hero.yaw += angDiff(hero.yaw, ty) * Math.min(1, dt * 12);
    hero.root.rotation.y = hero.yaw;
  }
  animateShinobi(hero, dt, moving);
  npcs.forEach(n => animateShinobi(n, dt, 0));

  if (cam.mode === 2) cam.yaw += dt * 0.14;
  else if (moving && !dragging && performance.now() - cam.lastDrag > 2200 && cam.mode === 0) {
    cam.yaw += angDiff(cam.yaw, hero.yaw + Math.PI) * Math.min(1, dt * 0.9);
  }
  const target = hero.root.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  if (cam.mode === 1) {
    target.add(new THREE.Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)).multiplyScalar(0.85));
  }
  if (cam.mode === 2) target.y += Math.sin(t * 0.4) * 0.15;
  const off = new THREE.Vector3(
    Math.sin(cam.yaw) * Math.cos(cam.pitch),
    Math.sin(cam.pitch),
    Math.cos(cam.yaw) * Math.cos(cam.pitch)
  ).multiplyScalar(cam.dist);
  camPos.lerp(target.clone().add(off), 1 - Math.pow(0.0005, dt));
  camera.position.copy(camPos);
  camLook.lerp(target, 1 - Math.pow(0.0002, dt));
  camera.lookAt(camLook);

  if (toastEl.classList.contains('on') && performance.now() - toastT > 1400) toastEl.classList.remove('on');
  if (firstFrame && t > 0.3) {
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 700);
    firstFrame = false;
  }
  renderer.render(scene, camera);
}
tick();
