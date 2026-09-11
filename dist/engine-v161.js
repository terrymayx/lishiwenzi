import * as Base from './engine-v16.js?v=1.6.0';

export * from './engine-v16.js?v=1.6.0';

const round1 = value => Math.round((Number(value) || 0) * 10) / 10;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function agricultureKeyFromEvent(event) {
  return event?.id?.startsWith('agri-') ? event.id.slice(5) : null;
}

function weatherFromEvent(state, event) {
  const key = agricultureKeyFromEvent(event);
  return key ? state?.agriculture?.weather?.[key] || null : null;
}

function replaceMajorWeatherLog(state, weather) {
  if (!weather || !Array.isArray(state?.eventLog)) return;
  const title = `重大天灾 · ${weather.label}`;
  const entry = [...state.eventLog].reverse().find(item => item?.title === title);
  if (!entry) return;
  entry.kind = 'warning';
  entry.text = `${weather.label}已经直接影响田庄，今年相关收成按约${Math.round((Number(weather.yieldModifier) || 1) * 100)}%计算；无需额外处置，时间继续流逝。`;
}

function clearAgricultureDecision(state, { restoreRunning = false } = {}) {
  const event = state?.pendingEvent;
  if (!event || event.source !== 'agriculture-major') return false;
  const weather = weatherFromEvent(state, event);
  replaceMajorWeatherLog(state, weather);
  state.pendingEvent = null;
  state.pauseReason = weather
    ? `${weather.label}已自动造成减产，时间继续流逝`
    : '农业灾害已自动结算，时间继续流逝';
  if (restoreRunning && state.phase === 'playing' && !state.endpoint) state.running = true;
  return true;
}

function prepare(state) {
  if (!state) return state;
  Base.ensureIndustry?.(state);
  clearAgricultureDecision(state, { restoreRunning: false });
  return expose(state);
}

export function rollSeasonWeather(state) {
  const wasRunning = Boolean(state?.running);
  const weather = Base.rollSeasonWeather(state);
  clearAgricultureDecision(state, { restoreRunning: wasRunning });
  return weather;
}

export function getFarmSummary(state) {
  const summary = Base.getFarmSummary(state);
  const workerAcres = Math.max(1, Number(Base.V13_RULES?.HIRED_WORKER_ACRES) || 3);
  const maxHiredWorkers = Math.max(0, Number(Base.V13_RULES?.MAX_HIRED_WORKERS) || 30);
  const hiredWorkers = Math.max(0, Number(summary?.hiredWorkers) || 0);
  const idleAcres = Math.max(0, Number(summary?.idleAcres) || 0);
  const workersNeeded = Math.ceil(idleAcres / workerAcres);
  const remainingWorkerSlots = Math.max(0, maxHiredWorkers - hiredWorkers);
  return {
    ...summary,
    workersNeeded,
    maxHiredWorkers,
    remainingWorkerSlots,
    workerLimitReached: remainingWorkerSlots === 0 && workersNeeded > 0,
    workersCanStillCoverGap: Math.min(workersNeeded, remainingWorkerSlots),
    uncoveredAcresAtLimit: round1(Math.max(0, idleAcres - remainingWorkerSlots * workerAcres))
  };
}

export function createGame(options) {
  return prepare(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepare(Base.deserializeState(raw));
}

export function advanceDay(state) {
  prepare(state);
  const wasRunning = Boolean(state?.running);
  let result = Base.advanceDay(state);
  if (!result?.ok) return result;
  const autoResolved = clearAgricultureDecision(state, { restoreRunning: wasRunning });
  if (autoResolved) result = { ...result, paused: false, reason: null };
  expose(state);
  return result;
}
