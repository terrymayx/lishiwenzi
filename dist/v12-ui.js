const $ = selector => document.querySelector(selector);

function starvationEnding(state) {
  if (state?.ending?.type !== 'starvation') return;

  const ending = state.ending;
  const currentName = $('#current-name');
  const currentPlace = $('#current-place');
  const statusLine = $('#status-line');
  const flowStatus = $('#flow-status');
  const startButton = $('#start-time');
  const pauseButton = $('#pause-time');
  const eventPanel = $('#event');

  if (currentName) currentName.textContent = `${ending.personName || '当前执笔人'} · 已故`;
  if (currentPlace) currentPlace.textContent = `死因：饥饿 · ${ending.date || ''}`;
  if (statusLine) statusLine.textContent = '游戏结束 · 饥饿达到100%，当前执笔人饿死';
  if (flowStatus) flowStatus.textContent = '饥饿100% · 游戏结束';
  if (startButton) { startButton.disabled = true; startButton.textContent = '游戏已结束'; }
  if (pauseButton) { pauseButton.disabled = true; pauseButton.textContent = '已结束'; }

  if (eventPanel) {
    eventPanel.hidden = false;
    eventPanel.dataset.v12Ending = 'starvation';
    eventPanel.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = '【饥荒终局】当前执笔人饿死';
    const text = document.createElement('p');
    text.textContent = `${ending.personName || '当前执笔人'}的饥饿达到100%，家书在${ending.date || '这一日'}中断。`;
    const summary = document.createElement('p');
    summary.textContent = `最终田产 ${ending.land ?? 0}亩 · 家中存粮 ${ending.grain ?? 0} · 尚存人口 ${ending.population ?? 0}人`;
    eventPanel.append(title, text, summary);
  }
}

function enhanceAssets(state) {
  const assets = $('#assets');
  if (!assets || !state || assets.closest('.tab-panel')?.hidden) return;
  const land = Number(state.household?.land || 0);
  const yieldPerDay = land * 0.4;
  const dailyFood = Number(state.dailyFood || 0);
  const net = yieldPerDay - dailyFood;
  let line = assets.querySelector('[data-v12-capacity]');
  if (!line) {
    line = document.createElement('p');
    line.dataset.v12Capacity = 'true';
    const purchase = assets.querySelector('.land-purchase');
    if (purchase) assets.insertBefore(line, purchase);
    else assets.append(line);
  }
  const sign = net >= 0 ? '+' : '';
  line.textContent = `耕作产能 ${yieldPerDay.toFixed(1)}粮/日 · 家庭消耗 ${dailyFood.toFixed(1)}粮/日 · 持续耕作净变化 ${sign}${net.toFixed(1)}/日`;
}

function updateHungerWarning(state) {
  const node = $('#hunger');
  if (!node || !state) return;
  const current = state.people?.[state.playerId];
  const hunger = Number(current?.hunger || 0);
  node.title = `当前执笔人饥饿 ${Math.round(hunger)}%`;
  if (hunger >= 80) node.textContent = `${state.resources?.hunger?.toFixed?.(1) ?? state.resources?.hunger ?? 0} ⚠`;
}

function refresh() {
  const state = window.__luanshiState;
  if (state) {
    starvationEnding(state);
    enhanceAssets(state);
    updateHungerWarning(state);
  }
  window.setTimeout(refresh, 180);
}

refresh();
