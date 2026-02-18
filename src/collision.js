import {
  LANDING_MAX_VX,
  LANDING_MAX_VY,
  LANDING_MAX_ANGLE,
  LANDING_MAX_ANGULAR_V
} from "./GAMEPLAY_CONSTANTS.js";

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function thrusterLayout(count, spread) {
  if (count <= 1) return [0];
  if (count % 2 === 0) {
    const arr = [];
    for (let i = 0; i < count; i += 1) {
      arr.push(((i / (count - 1)) - 0.5) * spread);
    }
    return arr;
  }

  const leftN = Math.floor(count / 2);
  const rightN = Math.ceil(count / 2);
  const out = [];

  for (let i = 0; i < leftN; i += 1) {
    out.push(-spread * (0.16 + (i / Math.max(1, leftN - 1)) * 0.8));
  }
  for (let i = 0; i < rightN; i += 1) {
    out.push(spread * (0.06 + (i / Math.max(1, rightN - 1)) * 0.86));
  }
  return out;
}

export function canLand(c) {
  return Math.abs(c.vx) < LANDING_MAX_VX && Math.abs(c.vy) < LANDING_MAX_VY && Math.abs(c.angle) < LANDING_MAX_ANGLE && Math.abs(c.va) < LANDING_MAX_ANGULAR_V;
}

export function hitObstacle(c, obstacles) {
  for (const ob of obstacles) {
    if (circleRectOverlap(c.x, c.y, c.r, ob)) return true;
  }
  return false;
}

export function touchesTop(c, p) {
  const withinX = c.x > p.x - c.r * 0.75 && c.x < p.x + p.w + c.r * 0.75;
  const closeY = c.y + c.r > p.y && c.y < p.y + 20;
  return withinX && closeY;
}

export function touchesPlatformUnderside(c, p) {
  const withinX = c.x > p.x - c.r && c.x < p.x + p.w + c.r;
  return withinX && c.y - c.r < p.y + p.h && c.y > p.y + p.h;
}

function circleRectOverlap(cx, cy, cr, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < cr * cr;
}
