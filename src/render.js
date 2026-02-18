import { clamp } from "./collision.js";

const STAR_LAYERS = [
  buildStars(90, 13),
  buildStars(70, 23),
  buildStars(45, 37)
];

export function renderFrame(ctx, canvas, game, level) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawSky(ctx, w, h, game.lastT || 0);

  if (!level) return;

  ctx.save();
  applyCameraTransform(ctx, canvas, game.camera);
  drawLevel(ctx, level);
  drawParticles(ctx, game.particles);
  if (game.state === "playing" || game.state === "level-complete") drawCraft(ctx, game.craft, game.thrusters);
  if (game.state === "crashed" || game.state === "victory") drawRagdolls(ctx, game.ragdolls);
  ctx.restore();
}

function drawSky(ctx, w, h, tNowMs) {
  const t = tNowMs * 0.001;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#081a3a");
  g.addColorStop(0.5, "#07142a");
  g.addColorStop(1, "#040913");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const nebA = ctx.createRadialGradient(
    w * (0.17 + Math.sin(t * 0.04) * 0.03),
    h * (0.22 + Math.cos(t * 0.05) * 0.02),
    40,
    w * 0.2,
    h * 0.24,
    Math.max(w, h) * 0.78
  );
  nebA.addColorStop(0, "rgba(61, 210, 255, 0.2)");
  nebA.addColorStop(0.42, "rgba(50, 125, 255, 0.12)");
  nebA.addColorStop(1, "rgba(50, 125, 255, 0)");
  ctx.fillStyle = nebA;
  ctx.fillRect(0, 0, w, h);

  const nebB = ctx.createRadialGradient(
    w * (0.84 + Math.cos(t * 0.035) * 0.025),
    h * (0.28 + Math.sin(t * 0.03) * 0.03),
    60,
    w * 0.78,
    h * 0.26,
    Math.max(w, h) * 0.72
  );
  nebB.addColorStop(0, "rgba(187, 112, 255, 0.16)");
  nebB.addColorStop(0.45, "rgba(106, 76, 217, 0.1)");
  nebB.addColorStop(1, "rgba(106, 76, 217, 0)");
  ctx.fillStyle = nebB;
  ctx.fillRect(0, 0, w, h);

  drawStars(ctx, w, h, t);
  drawCelestialBodies(ctx, w, h, t);
}

function drawStars(ctx, w, h, t) {
  for (let layer = 0; layer < STAR_LAYERS.length; layer += 1) {
    const stars = STAR_LAYERS[layer];
    const parallax = 1 + layer * 0.55;
    const driftX = (t * (2 + layer * 1.25)) % (w + 180);
    const driftY = (t * (0.8 + layer * 0.45)) % (h + 130);

    for (const s of stars) {
      const x = wrap(s.x * w - driftX * parallax * 0.08, w + 120) - 60;
      const y = wrap(s.y * h + driftY * parallax * 0.05, h + 90) - 45;
      const twinkle = 0.45 + Math.sin(t * s.twinkleSpeed + s.phase) * 0.38;
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawCelestialBodies(ctx, w, h, t) {
  const px = w * 0.86;
  const py = h * (0.2 + Math.sin(t * 0.05) * 0.01);
  const planet = ctx.createRadialGradient(px - 40, py - 50, 18, px, py, 115);
  planet.addColorStop(0, "rgba(255, 245, 225, 0.9)");
  planet.addColorStop(0.4, "rgba(235, 170, 116, 0.82)");
  planet.addColorStop(1, "rgba(140, 82, 61, 0.52)");
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(px, py, 108, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(206, 207, 240, 0.25)";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(px, py + 3, 152, 34, -0.26, 0, Math.PI * 2);
  ctx.stroke();

  const moonX = w * (0.15 + Math.cos(t * 0.04) * 0.02);
  const moonY = h * (0.17 + Math.sin(t * 0.05) * 0.02);
  const moon = ctx.createRadialGradient(moonX - 8, moonY - 10, 3, moonX, moonY, 32);
  moon.addColorStop(0, "rgba(250, 255, 255, 0.9)");
  moon.addColorStop(1, "rgba(154, 196, 255, 0.35)");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function buildStars(count, seedOffset) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    const base = i + seedOffset * 100;
    stars.push({
      x: seeded(base * 2.31 + 0.4),
      y: seeded(base * 3.17 + 1.9),
      size: 0.7 + seeded(base * 1.97 + 9.7) * 1.6,
      alpha: 0.25 + seeded(base * 4.1 + 5.1) * 0.65,
      twinkleSpeed: 1.2 + seeded(base * 0.77 + 2.2) * 2.8,
      phase: seeded(base * 2.99 + 11.4) * Math.PI * 2,
      color: seeded(base * 1.41 + 3.7) > 0.78 ? "rgba(255, 225, 190, 1)" : "rgba(220, 235, 255, 1)"
    });
  }
  return stars;
}

function seeded(v) {
  const n = Math.sin(v * 12.9898) * 43758.5453;
  return n - Math.floor(n);
}

function wrap(v, m) {
  return ((v % m) + m) % m;
}

function applyCameraTransform(ctx, canvas, camera) {
  const { x, y, zoom } = camera;
  ctx.translate(canvas.width * 0.5, canvas.height * 0.62);
  ctx.scale(zoom, zoom);
  ctx.translate(-x, -y);
}

function drawLevel(ctx, level) {
  drawPlatform(ctx, level.start, "#6db2ff");
  drawPlatform(ctx, level.goal, "#8af7a8");
  ctx.fillStyle = "#385f91";
  for (const ob of level.obstacles) {
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
  }
  ctx.fillStyle = "rgba(34, 66, 106, 0.95)";
  ctx.fillRect(-800, level.worldFloor, level.worldWidth + 1600, 500);
}

function drawPlatform(ctx, p, color) {
  ctx.fillStyle = color;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(p.x, p.y, p.w, 4);
}

function drawCraft(ctx, c, thrusters) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  ctx.fillStyle = "#d8e6ff";
  ctx.strokeStyle = "#20314d";
  ctx.lineWidth = 2;
  roundedRect(ctx, -c.w * 0.5, -c.h * 0.5, c.w, c.h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#8fb5ff";
  ctx.beginPath();
  ctx.arc(0, -5, 9, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < thrusters.length; i += 1) {
    const t = thrusters[i];
    ctx.fillStyle = "#6d7d95";
    ctx.fillRect(t.localX - 4, c.h * 0.5 - 2, 8, 9);
    if (t.flame > 0.03) {
      const flame = 18 + t.flame * 22;
      const flick = (Math.random() - 0.5) * 4;
      ctx.fillStyle = "rgba(255,180,66,0.95)";
      ctx.beginPath();
      ctx.moveTo(t.localX - 4, c.h * 0.5 + 7);
      ctx.lineTo(t.localX + 4, c.h * 0.5 + 7);
      ctx.lineTo(t.localX + flick, c.h * 0.5 + 7 + flame);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRagdolls(ctx, ragdolls) {
  for (const r of ragdolls) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.a);
    ctx.strokeStyle = "#cfdcff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.moveTo(-7, -2);
    ctx.lineTo(7, 2);
    ctx.moveTo(-6, 8);
    ctx.lineTo(6, 10);
    ctx.stroke();
    ctx.fillStyle = "#ffdbc0";
    ctx.beginPath();
    ctx.arc(0, -11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
