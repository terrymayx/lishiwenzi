import * as Base from './engine-v175.js?v=1.7.5-base';

export * from './engine-v175.js?v=1.7.5-base';

export const V180_MONTHLY_TURN_POLICY = Object.freeze({
  version: 180,
  playerStep: 'month',
  dailySimulationPreserved: true,
  blockingDecisionsInterrupt: true,
  reportAtMonthEnd: true
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
  buildReport
});
