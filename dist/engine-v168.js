import * as Base from './engine-v167.js?v=1.6.7';

export * from './engine-v167.js?v=1.6.7';

export const V168_VITALS = Object.freeze({
  VERSION: 168,
  AUTO_REST_STAMINA: 35,
  RESUME_STAMINA: 60,
  REST_STAMINA_RECOVERY: 1.2,
  HEALTH_DEATH_BANDS: Object.freeze([
    Object.freeze({ min: 70, max: 100, chance: 0 }),
    Object.freeze({ min: 40, max: 69.9999, chance: 0.0002 }),
    Object.freeze({ min: 20, max: 39.9999, chance: 0.0015 }),
    Object.freeze({ min: 10, max: 19.9999, chance: 0.005 }),
    Object.freeze({ min: 1, max: 9.9999, chance: 0.02 }),
    Object.freeze({ min: 0, max: 0, chance: 1 })
  ])
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const round1 = value => Math.round((Number(value) || 0) * 10) / 10;
const replaceVitalTerms = text => String(text || '')
  .replaceAll('劳动健康', '劳动体力')
  .replaceAll('健康≤35', '体力≤35')
  .replaceAll('健康−', '体力−')
  .replaceAll('健康+', '体力+')
  .replaceAll('短工健康', '短工体力');

export const WORK_DESCRIPTIONS = Object.freeze(Object.fromEntries(
  Object.entries(Base.WORK_DESCRIPTIONS || {}).map(([key, value]) => [key, replaceVitalTerms(value)])
));

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function syncVitalsResources(state) {
  if (!state?.resources) return state;
  const current = state.playerId ? state.people?.[state.playerId] : null;
  state.resources.stamina = round1(clamp(current?.stamina ?? 0, 0, 100));
  state.resources.health = round1(clamp(current?.health ?? 0, 0, 100));
  return state;
}

function normalizeNewPerson(person) {
  if (!person) return;
  if (!Object.prototype.hasOwnProperty.call(person, 'stamina')) {
    person.stamina = round1(clamp(person.health ?? 78, 0, 100));
  }
  person.health = round1(clamp(person.health ?? 100, 0, 100));
  person.healthWarningLogged ??= false;
}

function ensureVitals(state) {
  if (!state) return state;
  const upgrading = Number(state.vitals?.version || 0) < V168_VITALS.VERSION;
  if (upgrading) {
    for (const person of Object.values(state.people || {})) {
      const oldWorkHealth = round1(clamp(person.health ?? 78, 0, 100));
      person.stamina = oldWorkHealth;
      person.health = 100;
      person.healthWarningLogged = false;
      // The old flag mixed labor fatigue and physical illness. V1.6.8 starts a fresh physical-health warning track.
      person.warningLogged = false;
    }
    state.vitals = {
      version: V168_VITALS.VERSION,
      migratedAtElapsedDay: Number(state.elapsedDays || 0),
      deathRolls: 0
    };
  } else {
    state.vitals ??= { version: V168_VITALS.VERSION, deathRolls: 0 };
    state.vitals.version = V168_VITALS.VERSION;
    state.vitals.deathRolls = Number(state.vitals.deathRolls || 0);
    for (const person of Object.values(state.people || {})) normalizeNewPerson(person);
  }
  syncVitalsResources(state);
  return expose(state);
}

export function getHealthDeathChance(health) {
  const value = clamp(health, 0, 100);
  if (value <= 0) return 1;
  if (value < 10) return 0.02;
  if (value < 20) return 0.005;
  if (value < 40) return 0.0015;
  if (value < 70) return 0.0002;
  return 0;
}

export function getHealthRiskLabel(health) {
  const value = clamp(health, 0, 100);
  if (value <= 0) return '生命终止';
  if (value < 10) return '危重 · 每日2%死亡风险';
  if (value < 20) return '危险 · 每日0.5%死亡风险';
  if (value < 40) return '虚弱 · 每日0.15%死亡风险';
  if (value < 70) return '欠佳 · 每日0.02%死亡风险';
  return '稳定';
}

function nextVitalsRandom(state) {
  const current = Number(state.rngState || 1) >>> 0;
  state.rngState = (Math.imul(current, 1664525) + 1013904223) >>> 0;
  state.vitals.deathRolls = Number(state.vitals.deathRolls || 0) + 1;
  return state.rngState / 4294967296;
}

function killByHealth(state, person, reason = '健康恶化') {
  if (!person?.alive) return false;
  person.alive = false;
  person.notes ??= [];
  person.notes.push(`卒于${Base.getDateLabel(state)}：${reason}`);
  addLog(state, 'story', `${person.name}离世`, `原因：${reason}。`);

  if (person.id === state.playerId) {
    state.playerId = null;
    state.activeId = null;
    state.running = false;
    state.currentActivity = null;
    state.pendingEvent = null;
    state.pendingGuardian = null;
    const successors = Base.listSuccessors(state);
    if (successors.length) {
      state.pendingSuccession = true;
      state.phase = state.endpoint ? 'ended' : 'succession';
      state.pauseReason = '健康恶化，当前执笔人离世，等待血缘后代接续';
    } else {
      state.pendingSuccession = false;
      state.phase = 'ended';
      state.ending = { noDescendants: true, familyContinues: false, type: 'health', cause: reason };
      state.pauseReason = '当前执笔人因健康恶化离世，家族血脉中断';
    }
  }
  return true;
}

function applyHealthMortality(state) {
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || !state.currentActivity) return [];
  const deaths = [];
  for (const person of Object.values(state.people || {})) {
    if (!person?.alive) continue;
    const health = clamp(person.health, 0, 100);
    const chance = getHealthDeathChance(health);
    if (health < 40 && !person.healthWarningLogged) {
      person.healthWarningLogged = true;
      addLog(state, 'warning', `${person.name}健康恶化`, `${person.name}当前健康${round1(health)}，${getHealthRiskLabel(health)}。休养只能恢复体力，健康需要通过医治、事件或长期调养改善。`);
    }
    if (chance <= 0) continue;
    if (chance >= 1 || nextVitalsRandom(state) < chance) {
      if (killByHealth(state, person, health <= 0 ? '健康耗尽' : '久病体衰')) deaths.push(person.id);
      if (person.id === state.playerId || !state.playerId) break;
    }
  }
  syncVitalsResources(state);
  return deaths;
}

export function createGame(options) {
  return ensureVitals(Base.createGame(options));
}

export function deserializeState(raw) {
  return ensureVitals(Base.deserializeState(raw));
}

export function getActions(state) {
  ensureVitals(state);
  return Base.getActions(state).map(action => {
    const desc = replaceVitalTerms(action.desc);
    if (action.id === 'rest') {
      return {
        ...action,
        desc: '停止劳动，不领工资。当天口粮充足时恢复1.20体力；普通休养不直接恢复健康。'
      };
    }
    return { ...action, desc };
  });
}

export function getFamilyWorkAssignments(state) {
  ensureVitals(state);
  return Base.getFamilyWorkAssignments(state).map(job => {
    const person = state.people?.[job.personId];
    return {
      ...job,
      stamina: round1(person?.stamina ?? job.stamina ?? job.health ?? 0),
      staminaDelta: Number(job.staminaDelta ?? job.healthDelta ?? 0),
      health: round1(person?.health ?? 0),
      physicalHealth: round1(person?.health ?? 0)
    };
  });
}

export function getHouseholdBudget(state) {
  ensureVitals(state);
  const budget = Base.getHouseholdBudget(state);
  return { ...budget, assignments: getFamilyWorkAssignments(state) };
}

export function resolveEvent(state, eventId, optionId) {
  ensureVitals(state);
  const result = Base.resolveEvent(state, eventId, optionId);
  ensureVitals(state);
  syncVitalsResources(state);
  return result;
}

export function continueAs(state, personId) {
  ensureVitals(state);
  const result = Base.continueAs(state, personId);
  ensureVitals(state);
  return result;
}

export function performGuardianAction(state, ...args) {
  ensureVitals(state);
  const result = Base.performGuardianAction(state, ...args);
  ensureVitals(state);
  return result;
}

export function advanceDay(state) {
  ensureVitals(state);
  const deaths = applyHealthMortality(state);
  if (!state.playerId || state.phase !== 'playing') {
    syncVitalsResources(state);
    return { ok: true, paused: true, healthDeath: deaths.length > 0, reason: state.pauseReason };
  }

  const result = Base.advanceDay(state);
  ensureVitals(state); // also equips newly born / newly added family members with stamina
  syncVitalsResources(state);
  if (deaths.length) return { ...result, healthDeaths: deaths };
  return result;
}

export const __v168Test = Object.freeze({
  ensureVitals,
  applyHealthMortality,
  killByHealth,
  nextVitalsRandom
});
