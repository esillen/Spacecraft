import { STORAGE_KEY, keyboardKeys, MAX_PLAYERS, STATE } from "./config.js";
import { levels } from "./levels.js";
import { clamp, thrusterLayout, canLand, hitObstacle, touchesTop, touchesPlatformUnderside } from "./collision.js";
import { createInputState, setupInputListeners, pressedKey, pressedStart, pressedPadNav, isPlayerHeld, playerPressedThisFrame, storePrevInput } from "./input.js";
import { createTitleRows, updateTitleRows, createLevelCards, updateLevelCards, updateThrusterBars } from "./ui.js";
import { renderFrame } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const screens = {
  title: document.getElementById("titleScreen"),
  levelSelect: document.getElementById("levelSelectScreen"),
  hud: document.getElementById("hud"),
  end: document.getElementById("endScreen")
};

const ui = {
  playerList: document.getElementById("playerList"),
  levelCards: document.getElementById("levelCards"),
  progressText: document.getElementById("progressText"),
  hudLevel: document.getElementById("hudLevel"),
  hudStatus: document.getElementById("hudStatus"),
  thrusterBars: document.getElementById("thrusterBars"),
  endTitle: document.getElementById("endTitle"),
  endText: document.getElementById("endText")
};

const input = createInputState();

const game = {
  state: STATE.TITLE,
  ready: Array(MAX_PLAYERS).fill(false),
  selectedPlayers: [],
  selectedLevel: 0,
  highestUnlocked: 0,
  craft: null,
  camera: { x: 0, y: 0, zoom: 1 },
  particles: [],
  ragdolls: [],
  thrusters: [],
  thrusterBars: [],
  postTimer: 0,
  lastT: 0
};

loadProgress();
createTitleRows(ui, keyboardKeys, MAX_PLAYERS, game.ready);
createLevelCards(ui, levels);
setupInputListeners(input);
resizeCanvas();
window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(tick);

function tick(tNow) {
  const dt = Math.min(0.033, (tNow - game.lastT) / 1000 || 0.016);
  game.lastT = tNow;

  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  stepState(dt, pads);
  const level = game.state === STATE.TITLE || game.state === STATE.LEVEL_SELECT ? null : levels[game.selectedLevel];
  renderFrame(ctx, canvas, game, level);
  storePrevInput(input, pads);
  requestAnimationFrame(tick);
}

function stepState(dt, pads) {
  if (game.state === STATE.TITLE) {
    handleReadyInput(pads);
    if (pressedStart(input, pads) && countReady() >= 2) {
      game.selectedPlayers = game.ready.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
      game.selectedLevel = clamp(game.selectedLevel, 0, game.highestUnlocked);
      showState(STATE.LEVEL_SELECT);
    }
    updateTitleRows(MAX_PLAYERS, game.ready);
    return;
  }

  if (game.state === STATE.LEVEL_SELECT) {
    const left = pressedKey(input, "arrowleft") || pressedPadNav(input, pads, -1);
    const right = pressedKey(input, "arrowright") || pressedPadNav(input, pads, 1);
    if (left) game.selectedLevel = Math.max(0, game.selectedLevel - 1);
    if (right) game.selectedLevel = Math.min(game.highestUnlocked, game.selectedLevel + 1);
    if (pressedStart(input, pads)) startLevel(game.selectedLevel);
    if (pressedKey(input, "r")) showState(STATE.TITLE);
    updateLevelCards(ui, levels, game.highestUnlocked, game.selectedLevel);
    return;
  }

  if (game.state === STATE.PLAYING) {
    updateGameplay(dt, pads);
    return;
  }

  if (game.state === STATE.CRASHED || game.state === STATE.LEVEL_COMPLETE || game.state === STATE.VICTORY) {
    game.postTimer += dt;
    if (pressedStart(input, pads) && game.postTimer > 0.25) {
      if (game.state === STATE.CRASHED) {
        startLevel(game.selectedLevel);
      } else if (game.state === STATE.LEVEL_COMPLETE) {
        const next = game.selectedLevel + 1;
        if (next >= levels.length) {
          showVictory();
        } else {
          game.selectedLevel = next;
          startLevel(game.selectedLevel);
        }
      } else {
        showState(STATE.TITLE);
      }
    }
    updateRagdolls(dt);
  }
}

function showState(newState) {
  game.state = newState;
  screens.title.classList.toggle("hidden", newState !== STATE.TITLE);
  screens.levelSelect.classList.toggle("hidden", newState !== STATE.LEVEL_SELECT);
  screens.hud.classList.toggle("hidden", newState !== STATE.PLAYING);
  screens.end.classList.toggle("hidden", !(newState === STATE.CRASHED || newState === STATE.LEVEL_COMPLETE || newState === STATE.VICTORY));
  if (newState === STATE.LEVEL_SELECT) {
    updateLevelCards(ui, levels, game.highestUnlocked, game.selectedLevel);
  }
}

function startLevel(index) {
  const level = levels[index];
  game.craft = {
    x: level.start.x + level.start.w * 0.5,
    y: level.start.y - 32,
    vx: 0,
    vy: 0,
    angle: 0,
    va: 0,
    w: 84,
    h: 42,
    r: 26
  };
  game.particles = [];
  game.ragdolls = [];
  game.postTimer = 0;
  configureThrusters(game.selectedPlayers.length);
  ui.hudLevel.textContent = `Level ${level.id}: ${level.name}`;
  ui.hudStatus.textContent = `Wind ${Math.round(level.wind)} / Gravity ${level.gravity.toFixed(1)}`;
  showState(STATE.PLAYING);
}

function configureThrusters(playerCount) {
  game.thrusters = [];
  ui.thrusterBars.innerHTML = "";
  game.thrusterBars = [];
  const xPositions = thrusterLayout(playerCount, 56);
  for (let i = 0; i < playerCount; i += 1) {
    game.thrusters.push({ localX: xPositions[i], power: 0, flame: 0 });
    const bar = document.createElement("div");
    bar.className = "thruster-bar";
    const fill = document.createElement("div");
    fill.className = "thruster-fill";
    bar.appendChild(fill);
    ui.thrusterBars.appendChild(bar);
    game.thrusterBars.push(fill);
  }
}

function updateGameplay(dt, pads) {
  const level = levels[game.selectedLevel];
  const c = game.craft;
  const thrustForce = 33;
  const damping = 0.997;

  let fx = level.wind * 0.8;
  let fy = level.gravity * 25;
  let torque = 0;

  for (let i = 0; i < game.selectedPlayers.length; i += 1) {
    const playerIndex = game.selectedPlayers[i];
    const pressed = isPlayerHeld(input, keyboardKeys, playerIndex, pads);
    const thruster = game.thrusters[i];
    thruster.power = pressed ? 1 : 0;
    const targetFlame = pressed ? 0.9 + Math.random() * 0.35 : 0;
    thruster.flame += (targetFlame - thruster.flame) * 0.23;

    if (pressed) {
      const angle = c.angle;
      const tx = Math.sin(angle) * thrustForce;
      const ty = -Math.cos(angle) * thrustForce;
      fx += tx;
      fy += ty;

      const localY = c.h * 0.5;
      const rx = thruster.localX * Math.cos(angle) - localY * Math.sin(angle);
      const ry = thruster.localX * Math.sin(angle) + localY * Math.cos(angle);
      torque += rx * ty - ry * tx;

      spawnExhaust(c, thruster.localX, localY);
    }
  }

  const mass = 1.5;
  const moi = 2400;
  c.vx += (fx / mass) * dt;
  c.vy += (fy / mass) * dt;
  c.va += (torque / moi) * dt;
  c.vx *= damping;
  c.vy *= damping;
  c.va *= 0.994;
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.angle += c.va * dt;
  const craftBottomY = c.y + c.r;

  updateParticles(dt);
  updateThrusterBars(game.thrusterBars, game.thrusters);
  updateCamera(level, dt);
  ui.hudStatus.textContent = `Speed ${Math.hypot(c.vx, c.vy).toFixed(1)} m/s`;

  if (craftBottomY > level.worldFloor + 160 || c.x < -500 || c.x > level.worldWidth + 600) {
    crash();
    return;
  }

  if (hitObstacle(c, level.obstacles) || touchesPlatformUnderside(c, level.start) || touchesPlatformUnderside(c, level.goal)) {
    crash();
    return;
  }

  if (touchesTop(c, level.start) || touchesTop(c, level.goal)) {
    if (touchesTop(c, level.goal) && canLand(c)) {
      completeLevel();
      return;
    }
    if (!canLand(c)) {
      crash();
      return;
    }
    c.vy *= -0.08;
    c.vx *= 0.7;
    c.va *= 0.6;
    c.y = Math.min(c.y, Math.min(level.start.y, level.goal.y) - c.r + 2);
  }
}

function completeLevel() {
  game.postTimer = 0;
  spawnBurst(game.craft.x, game.craft.y, 80, "#68ff9c");
  game.highestUnlocked = Math.max(game.highestUnlocked, Math.min(levels.length - 1, game.selectedLevel + 1));
  saveProgress();
  if (game.selectedLevel >= levels.length - 1) {
    showVictory();
    return;
  }
  ui.endTitle.textContent = "LEVEL COMPLETE";
  ui.endText.textContent = `Great landing. Press Space / Enter / Start for Level ${game.selectedLevel + 2}.`;
  showState(STATE.LEVEL_COMPLETE);
}

function showVictory() {
  game.postTimer = 0;
  game.highestUnlocked = levels.length - 1;
  saveProgress();
  ui.endTitle.textContent = "VICTORY";
  ui.endText.textContent = "All 10 levels cleared. Your crew is legendary.";
  showState(STATE.VICTORY);
}

function crash() {
  game.postTimer = 0;
  const c = game.craft;
  spawnBurst(c.x, c.y, 130, "#ff5e6f");
  spawnBurst(c.x, c.y, 80, "#ffd85a");
  spawnRagdolls(c);
  ui.endTitle.textContent = "CRASH";
  ui.endText.textContent = "Ship destroyed. Press Space / Enter / Start to retry.";
  showState(STATE.CRASHED);
}

function spawnRagdolls(c) {
  game.ragdolls = [];
  const n = game.selectedPlayers.length;
  for (let i = 0; i < n; i += 1) {
    const t = i / Math.max(1, n - 1);
    game.ragdolls.push({
      x: c.x - 22 + t * 44,
      y: c.y - 10,
      vx: c.vx * 0.75 + (Math.random() * 220 - 110),
      vy: c.vy * 0.75 - (120 + Math.random() * 220),
      spin: (Math.random() * 22 - 11),
      a: Math.random() * Math.PI * 2
    });
  }
}

function updateRagdolls(dt) {
  for (const r of game.ragdolls) {
    r.vy += 400 * dt;
    r.vx *= 0.995;
    r.vy *= 0.995;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.a += r.spin * dt;
  }
  updateParticles(dt);
}

function spawnExhaust(c, localX, localY) {
  const angle = c.angle;
  const x = c.x + localX * Math.cos(angle) - localY * Math.sin(angle);
  const y = c.y + localX * Math.sin(angle) + localY * Math.cos(angle);
  const dir = angle + Math.PI;
  game.particles.push({
    x,
    y,
    vx: Math.cos(dir) * (110 + Math.random() * 60) + c.vx * 0.3,
    vy: Math.sin(dir) * (110 + Math.random() * 60) + c.vy * 0.3,
    life: 0.55 + Math.random() * 0.35,
    size: 2 + Math.random() * 2.4,
    color: Math.random() > 0.45 ? "#ffb34d" : "#ff5e6f"
  });
}

function spawnBurst(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 350;
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.7 + Math.random() * 1.2,
      size: 1 + Math.random() * 4,
      color
    });
  }
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.99;
    p.vy *= 0.99;
    p.vy += 120 * dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

function updateCamera(level, dt) {
  const c = game.craft;
  const gx = level.goal.x + level.goal.w * 0.5;
  const gy = level.goal.y;
  const dist = Math.hypot(gx - c.x, gy - c.y);
  const speed = Math.hypot(c.vx, c.vy);

  const look = clamp(0.22 + dist / 2000, 0.2, 0.45);
  const tx = c.x * (1 - look) + gx * look;
  const ty = c.y * (1 - look) + gy * look - 80;
  const baseZoom = 1.1;
  const speedZoomOut = clamp(speed / 240, 0, 0.2);
  const distZoomOut = clamp(dist / 2400, 0, 0.18);
  const targetZoom = baseZoom - speedZoomOut - distZoomOut;
  game.camera.x += (tx - game.camera.x) * Math.min(1, dt * 3.2);
  game.camera.y += (ty - game.camera.y) * Math.min(1, dt * 3.2);
  game.camera.zoom += (targetZoom - game.camera.zoom) * Math.min(1, dt * 2.1);
}

function handleReadyInput(pads) {
  for (let i = 0; i < MAX_PLAYERS; i += 1) {
    if (playerPressedThisFrame(input, keyboardKeys, i, pads)) {
      game.ready[i] = !game.ready[i];
    }
  }
}

function countReady() {
  return game.ready.filter(Boolean).length;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ highestUnlocked: game.highestUnlocked }));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      game.highestUnlocked = 0;
      return;
    }
    const parsed = JSON.parse(raw);
    game.highestUnlocked = clamp(parsed.highestUnlocked ?? 0, 0, levels.length - 1);
  } catch {
    game.highestUnlocked = 0;
  }
}
