import * as Base from './engine-v175.js?v=1.7.5-base';

export * from './engine-v175.js?v=1.7.5-base';

export const V180_MONTHLY_TURN_POLICY = Object.freeze({
  version: 180,
  playerStep: 'month',
  dailySimulationPreserved: true,
  blockingDecisionsInterrupt: true,
  reportAtMonthEnd: true
});

export const V181_GUIDE_CASH_THRESHOLDS = Object.freeze({
  landPurchase: 80,
  mill: 180,
  grainShop: 350,
  clothShop: 700,
  oilPress: 1000,
  caravan: 1500,
  winery: 2200,
  inn: 3500,
  weavingWorkshop: 5500,
  paperMill: 8000,
  waterFleet: 15000
});

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function dateOf(state) {
  return { year: Number(state.year), month: Number(state.month), day: Number(state.day) };
}

function nextMonthTarget(state) {
  const month = Number(state.month);
  return month >= 12
    ? { year: Number(state.year) + 1, month: 1, day: 1 }
    : { year: Number(state.year), month: month + 1, day: 1 };
}

function sameDate(a, b) {
  return Number(a?.year) === Number(b?.year)
    && Number(a?.month) === Number(b?.month)
    && Number(a?.day) === Number(b?.day);
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function round2(value) {
  return Math.round(number(value) * 100) / 100;
}

function currentCash(state) {
  return Math.max(0, round2(state?.resources?.money));
}

function cashCondition(state, id) {
  const required = Number(V181_GUIDE_CASH_THRESHOLDS[id] || 0);
  if (!required) return null;
  const current = currentCash(state);
  return {
    label: '现金',
    current,
    required,
    unit: '钱',
    met: current >= required,
    remaining: round2(Math.max(0, required - current)),
    cashGuide: true
  };
}

function replaceAssetWithCashCondition(state, id, conditions = []) {
  const cash = cashCondition(state, id);
  if (!cash) return [...conditions];
  let replaced = false;
  const next = (conditions || []).map(condition => {
    if (condition?.label !== '家产') return { ...condition };
    replaced = true;
    return cash;
  });
  if (!replaced) next.push(cash);
  return next;
}

function conditionsReady(conditions = []) {
  return conditions.length > 0 && conditions.every(condition => Boolean(condition?.met));
}

function patchCurrentHouseholdStatus(state, source) {
  const currentId = source?.guideCurrentId;
  if (!currentId || !V181_GUIDE_CASH_THRESHOLDS[currentId] || !source?.[currentId]) {
    return { ...source, cashValue: currentCash(state) };
  }
  const stage = source[currentId];
  if (stage.guideCompleted) return { ...source, cashValue: currentCash(state) };
  const conditions = replaceAssetWithCashCondition(state, currentId, stage.conditions || []);
  const ready = conditionsReady(conditions);
  return {
    ...source,
    cashValue: currentCash(state),
    newlyUnlocked: (source.newlyUnlocked || []).filter(id => id !== currentId || ready),
    [currentId]: {
      ...stage,
      conditions,
      unlocked: ready,
      allConditionsMet: ready,
      rewardAvailableOnBuild: Boolean(stage.rewardAvailableOnBuild) && ready,
      buildState: ready ? 'available' : 'locked'
    }
  };
}

function patchCurrentGuideStatus(state, source) {
  const currentId = source?.current?.id;
  if (!currentId || !V181_GUIDE_CASH_THRESHOLDS[currentId]) return source;
  const current = source.current;
  const conditions = replaceAssetWithCashCondition(state, currentId, current.conditions || []);
  const ready = conditionsReady(conditions);
  const patchedCurrent = {
    ...current,
    conditions,
    thresholdReady: current.completed ? true : ready,
    canComplete: Boolean(current.current) && ready
  };
  const list = (source.list || []).map(item => item.id === currentId ? patchedCurrent : item);
  const byId = { ...(source.byId || {}), [currentId]: patchedCurrent };
  return {
    ...source,
    list,
    byId,
    current: patchedCurrent,
    cashValue: currentCash(state)
  };
}

function missingCurrentGuideMessage(current) {
  const missing = (current?.conditions || []).filter(condition => !condition.met);
  if (!missing.length) return `${current?.label || '当前任务'}尚未具备执行条件。`;
  const detail = missing.map(condition => {
    if (condition.label === '现金') return `现金还差${condition.remaining}${condition.unit || '钱'}`;
    if (condition.label?.startsWith('已有')) return condition.label;
    return `${condition.label}还差${condition.remaining}${condition.unit || ''}`;
  }).join('，');
  return `${current?.label || '当前任务'}尚未具备执行条件：${detail}。`;
}

function resourceSnapshot(state) {
  return {
    money: number(state.resources?.money),
    grain: number(state.resources?.grain),
    land: number(state.resources?.land ?? state.household?.land),
    reputation: number(state.resources?.reputation)
  };
}

function playerSnapshot(state) {
  const player = state.playerId ? state.people?.[state.playerId] : null;
  return player ? {
    id: player.id,
    name: player.name,
    stamina: number(player.stamina),
    health: number(player.health),
    hunger: number(player.hunger),
    knowledge: number(player.skills?.knowledge)
  } : { id: null, name: '等待家族接续', stamina: 0, health: 0, hunger: 0, knowledge: 0 };
}

function ensureMonthTurn(state) {
  state.v180MonthTurn ??= {
    version: 180,
    turn: 0,
    active: false,
    start: null,
    target: null,
    snapshot: null,
    logStartIndex: 0,
    daysAdvanced: 0,
    lastReport: null
  };
  const turn = state.v180MonthTurn;
  turn.version = 180;
  turn.turn = Math.max(0, Number(turn.turn || 0));
  turn.active = Boolean(turn.active);
  turn.daysAdvanced = Math.max(0, Number(turn.daysAdvanced || 0));
  turn.logStartIndex = Math.max(0, Number(turn.logStartIndex || 0));
  return turn;
}

function startTurn(state) {
  const turn = ensureMonthTurn(state);
  turn.turn += 1;
  turn.active = true;
  turn.start = dateOf(state);
  turn.target = nextMonthTarget(state);
  turn.snapshot = {
    resources: resourceSnapshot(state),
    player: playerSnapshot(state)
  };
  turn.logStartIndex = Array.isArray(state.eventLog) ? state.eventLog.length : 0;
  turn.daysAdvanced = 0;
  return turn;
}

function delta(before, after) {
  return Math.round((number(after) - number(before)) * 100) / 100;
}

function resourceReport(before, after) {
  return Object.fromEntries(Object.keys(after).map(key => [key, {
    before: number(before?.[key]),
    after: number(after[key]),
    delta: delta(before?.[key], after[key])
  }]));
}

function buildReport(state, turn) {
  const endResources = resourceSnapshot(state);
  const endPlayer = playerSnapshot(state);
  const startPlayer = turn.snapshot?.player || playerSnapshot(state);
  const events = (Array.isArray(state.eventLog) ? state.eventLog : [])
    .slice(turn.logStartIndex)
    .map(entry => ({
      year: entry.year,
      month: entry.month,
      day: entry.day,
      kind: entry.kind,
      title: entry.title,
      text: entry.text
    }));
  return {
    version: 180,
    turn: turn.turn,
    start: { ...turn.start },
    end: dateOf(state),
    daysAdvanced: turn.daysAdvanced,
    resources: resourceReport(turn.snapshot?.resources || {}, endResources),
    player: {
      id: endPlayer.id,
      name: endPlayer.name,
      stamina: { before: startPlayer.stamina, after: endPlayer.stamina, delta: delta(startPlayer.stamina, endPlayer.stamina) },
      health: { before: startPlayer.health, after: endPlayer.health, delta: delta(startPlayer.health, endPlayer.health) },
      hunger: { before: startPlayer.hunger, after: endPlayer.hunger, delta: delta(startPlayer.hunger, endPlayer.hunger) },
      knowledge: { before: startPlayer.knowledge, after: endPlayer.knowledge, delta: delta(startPlayer.knowledge, endPlayer.knowledge) }
    },
    events
  };
}

function finishTurn(state, turn) {
  state.running = false;
  turn.active = false;
  turn.lastReport = buildReport(state, turn);
  turn.start = null;
  turn.target = null;
  turn.snapshot = null;
  turn.logStartIndex = Array.isArray(state.eventLog) ? state.eventLog.length : 0;
  turn.daysAdvanced = 0;
  state.pauseReason = '本月已结算，请查看月报并安排下个月';
  return turn.lastReport;
}

function interruption(state, turn, result = null, started = false) {
  state.running = false;
  return {
    ok: false,
    interrupted: true,
    completedMonth: false,
    started,
    active: Boolean(turn?.active),
    reason: result?.reason || state.pauseReason || result?.message || '本月推进被中断',
    date: dateOf(state),
    target: turn?.target ? { ...turn.target } : null,
    daysAdvanced: Number(turn?.daysAdvanced || 0)
  };
}

export function getHouseholdUnlockStatus(state) {
  return patchCurrentHouseholdStatus(state, Base.getHouseholdUnlockStatus(state));
}

export function getV174GuideStatus(state) {
  return patchCurrentGuideStatus(state, Base.getV174GuideStatus(state));
}

export function buyLand(state, acres = 1) {
  const guide = getV174GuideStatus(state);
  if (guide.current?.id === 'landPurchase' && !guide.current.thresholdReady) {
    return { ok: false, message: missingCurrentGuideMessage(guide.current) };
  }
  return Base.buyLand(state, acres);
}

export function buyBusiness(state, businessId, count = 1) {
  const guide = getV174GuideStatus(state);
  if (guide.current?.id === businessId && !guide.current.thresholdReady) {
    return { ok: false, message: missingCurrentGuideMessage(guide.current) };
  }
  return Base.buyBusiness(state, businessId, count);
}

export function getMonthTurnStatus(state) {
  if (!state) return { version: 180, active: false, lastReport: null };
  const turn = ensureMonthTurn(state);
  return {
    version: 180,
    active: Boolean(turn.active),
    turn: turn.turn,
    start: turn.start ? { ...turn.start } : null,
    target: turn.target ? { ...turn.target } : null,
    daysAdvanced: turn.daysAdvanced,
    lastReport: turn.lastReport || null
  };
}

export function createGame(options) {
  const state = Base.createGame(options);
  ensureMonthTurn(state);
  state.running = false;
  state.pauseReason = '选择本月行动后，点击“度过本月”';
  return expose(state);
}

export function deserializeState(raw) {
  const state = Base.deserializeState(raw);
  ensureMonthTurn(state);
  state.running = false;
  if (!state.pendingEvent && state.phase === 'playing') {
    state.pauseReason = state.v180MonthTurn.active ? '本月尚未结束，可继续本月' : '选择本月行动后，点击“度过本月”';
  }
  return expose(state);
}

export function advanceMonth(state) {
  if (!state) return { ok: false, interrupted: true, completedMonth: false, message: '没有可推进的家书。' };
  const turn = ensureMonthTurn(state);
  state.running = false;

  if (state.endpoint || state.phase !== 'playing') return interruption(state, turn);
  if (state.pendingEvent) return interruption(state, turn);
  if (!state.currentActivity) {
    state.pauseReason = turn.active ? '本月计划已结束，请重新选择行动后继续本月' : '请先选择本月行动';
    return interruption(state, turn);
  }

  const started = !turn.active;
  if (started) startTurn(state);
  const activeTurn = ensureMonthTurn(state);
  const maxDays = 40;
  let guard = 0;

  while (!sameDate(dateOf(state), activeTurn.target) && guard < maxDays) {
    guard += 1;
    const beforeElapsed = number(state.elapsedDays);
    const result = Base.advanceDay(state);
    if (number(state.elapsedDays) > beforeElapsed) activeTurn.daysAdvanced += number(state.elapsedDays) - beforeElapsed;

    if (sameDate(dateOf(state), activeTurn.target)) {
      const report = finishTurn(state, activeTurn);
      return { ok: true, interrupted: false, completedMonth: true, report, date: dateOf(state) };
    }

    if (!result?.ok || result?.paused || state.pendingEvent || state.phase !== 'playing' || state.endpoint) {
      return interruption(state, activeTurn, result, started);
    }
  }

  if (sameDate(dateOf(state), activeTurn.target)) {
    const report = finishTurn(state, activeTurn);
    return { ok: true, interrupted: false, completedMonth: true, report, date: dateOf(state) };
  }

  state.pauseReason = '月度结算保护中断，请继续本月';
  return interruption(state, activeTurn, null, started);
}

export function resolveEvent(state, eventId, optionId) {
  const result = Base.resolveEvent(state, eventId, optionId);
  if (result?.ok && state?.v180MonthTurn?.active && state.phase === 'playing' && !state.pendingEvent) {
    state.pauseReason = '事件已处理，可继续本月';
  }
  return result;
}

export const __test = Base.__test;

export const __v180Test = Object.freeze({
  ensureMonthTurn,
  nextMonthTarget,
  resourceSnapshot,
  playerSnapshot,
  buildReport,
  cashCondition,
  replaceAssetWithCashCondition,
  patchCurrentHouseholdStatus,
  patchCurrentGuideStatus
});
