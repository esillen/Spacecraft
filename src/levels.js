function mkLevel(id, name, startX, startY, goalX, goalY, obstacles, wind) {
  return {
    id,
    name,
    wind,
    gravity: 22 + (id - 1) * 0.75,
    worldWidth: Math.max(1700, goalX + 560),
    worldFloor: 180,
    start: { x: startX, y: startY, w: 210, h: 24 },
    goal: { x: goalX, y: goalY, w: 180, h: 20 },
    obstacles
  };
}

export const levels = [
  mkLevel(1, "Training Hop", 0, 0, 460, 10, [], 0),
  mkLevel(2, "Mild Drift", 0, 80, 620, -30, [], 16),
  mkLevel(3, "High Shelf", -100, 0, 700, -140, [{ x: 260, y: -30, w: 130, h: 24 }], 0),
  mkLevel(4, "Twin Islands", 0, 0, 780, -90, [{ x: 250, y: -90, w: 160, h: 26 }, { x: 510, y: -25, w: 140, h: 26 }], -20),
  mkLevel(5, "Crosswind", -80, 40, 850, -130, [{ x: 310, y: -40, w: 130, h: 26 }], 32),
  mkLevel(6, "Narrow Pass", 0, 0, 920, -180, [{ x: 370, y: -160, w: 50, h: 170 }, { x: 560, y: -180, w: 50, h: 190 }], 14),
  mkLevel(7, "Step Climb", -60, 40, 980, -230, [{ x: 240, y: -20, w: 130, h: 26 }, { x: 430, y: -90, w: 130, h: 26 }, { x: 640, y: -160, w: 130, h: 26 }], 0),
  mkLevel(8, "Storm Lane", 0, 70, 1060, -280, [{ x: 300, y: -80, w: 180, h: 26 }, { x: 560, y: -180, w: 170, h: 26 }, { x: 800, y: -100, w: 180, h: 26 }], -36),
  mkLevel(9, "Needle Drop", -120, 60, 1150, -330, [{ x: 420, y: -290, w: 46, h: 320 }, { x: 710, y: -350, w: 46, h: 360 }, { x: 900, y: -120, w: 190, h: 26 }], 20),
  mkLevel(10, "Final Gauntlet", -160, 80, 1300, -390, [{ x: 180, y: 0, w: 120, h: 26 }, { x: 360, y: -100, w: 140, h: 26 }, { x: 560, y: -230, w: 130, h: 26 }, { x: 770, y: -170, w: 160, h: 26 }, { x: 970, y: -300, w: 140, h: 26 }], -40)
];
