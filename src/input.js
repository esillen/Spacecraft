export function createInputState() {
  return {
    keysDown: new Set(),
    keysPrev: new Set(),
    gamepadPrev: new Map()
  };
}

export function setupInputListeners(input) {
  window.addEventListener("keydown", (e) => {
    const key = normalizeKey(e.key);
    input.keysDown.add(key);
    if ([" ", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const key = normalizeKey(e.key);
    input.keysDown.delete(key);
  });

  window.addEventListener("gamepadconnected", () => {});
  window.addEventListener("gamepaddisconnected", () => {});
}

export function pressedKey(input, key) {
  return input.keysDown.has(key) && !input.keysPrev.has(key);
}

export function pressedStart(input, pads) {
  return pressedKey(input, " ") || pressedKey(input, "enter") || padStartPressed(input, pads);
}

export function pressedPadNav(input, pads, dir) {
  for (const pad of pads) {
    if (!pad) continue;
    const prev = input.gamepadPrev.get(pad.index) || [];
    if (dir < 0) {
      const now = !!pad.buttons[14]?.pressed || pad.axes[0] < -0.6;
      const was = !!prev[14] || (prev.axes0 || 0) < -0.6;
      if (now && !was) return true;
    } else {
      const now = !!pad.buttons[15]?.pressed || pad.axes[0] > 0.6;
      const was = !!prev[15] || (prev.axes0 || 0) > 0.6;
      if (now && !was) return true;
    }
  }
  return false;
}

export function isPlayerHeld(input, keyboardKeys, playerIndex, pads) {
  const key = keyboardKeys[playerIndex];
  if (key && input.keysDown.has(key)) return true;
  const padIndex = Math.floor(playerIndex / 2);
  const btn = playerIndex % 2 === 0 ? 4 : 5;
  const pad = pads[padIndex];
  return !!pad?.buttons[btn]?.pressed;
}

export function playerPressedThisFrame(input, keyboardKeys, playerIndex, pads) {
  const key = keyboardKeys[playerIndex];
  const keyPress = input.keysDown.has(key) && !input.keysPrev.has(key);
  const padIndex = Math.floor(playerIndex / 2);
  const btn = playerIndex % 2 === 0 ? 4 : 5;
  const pad = pads[padIndex];
  const prev = input.gamepadPrev.get(pad?.index ?? padIndex) || [];
  const gamepadPress = !!pad?.buttons[btn]?.pressed && !prev[btn];
  return keyPress || gamepadPress;
}

export function storePrevInput(input, pads) {
  input.keysPrev = new Set(input.keysDown);
  input.gamepadPrev.clear();
  for (const pad of pads) {
    if (!pad) continue;
    const buttons = pad.buttons.map((b) => !!b.pressed);
    buttons.axes0 = pad.axes[0] || 0;
    input.gamepadPrev.set(pad.index, buttons);
  }
}

function padStartPressed(input, pads) {
  for (const pad of pads) {
    if (!pad) continue;
    const prev = input.gamepadPrev.get(pad.index) || [];
    const pressed = !!pad.buttons[9]?.pressed;
    if (pressed && !prev[9]) return true;
  }
  return false;
}

function normalizeKey(key) {
  return key.toLowerCase();
}
