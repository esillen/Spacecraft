export function createTitleRows(ui, keyboardKeys, maxPlayers, readyState) {
  ui.playerList.innerHTML = "";
  for (let i = 0; i < maxPlayers; i += 1) {
    const row = document.createElement("div");
    row.className = "player-row";
    row.id = `player-row-${i}`;
    row.innerHTML = `<span>P${i + 1} (${keyboardKeys[i].toUpperCase()})</span><span>Not Ready</span>`;
    ui.playerList.appendChild(row);
  }
  updateTitleRows(maxPlayers, readyState);
}

export function updateTitleRows(maxPlayers, readyState) {
  for (let i = 0; i < maxPlayers; i += 1) {
    const row = document.getElementById(`player-row-${i}`);
    const ready = readyState[i];
    row.classList.toggle("ready", ready);
    row.children[1].textContent = ready ? "Ready" : "Not Ready";
  }
}

export function createLevelCards(ui, levels) {
  ui.levelCards.innerHTML = "";
  for (const level of levels) {
    const card = document.createElement("div");
    card.className = "level-card";
    card.id = `level-card-${level.id - 1}`;
    card.innerHTML = `<strong>${level.id}</strong><div>${level.name}</div>`;
    ui.levelCards.appendChild(card);
  }
}

export function updateLevelCards(ui, levels, highestUnlocked, selectedLevel) {
  ui.progressText.textContent = `Unlocked: ${highestUnlocked + 1} / ${levels.length}`;
  for (let i = 0; i < levels.length; i += 1) {
    const card = document.getElementById(`level-card-${i}`);
    const locked = i > highestUnlocked;
    card.classList.toggle("locked", locked);
    card.classList.toggle("selected", i === selectedLevel);
  }
}

export function updateThrusterBars(thrusterBars, thrusters) {
  for (let i = 0; i < thrusterBars.length; i += 1) {
    thrusterBars[i].style.height = `${Math.round(thrusters[i].power * 100)}%`;
  }
}
