import * as Base from './engine-v162.js?v=1.6.2';

export * from './engine-v162.js?v=1.6.2';

export const V163_SHORTWORK_TERMS = Object.freeze({
  spring: Object.freeze({ availability: 0.8, wage: 0.6 }),
  summer: Object.freeze({ availability: 0.65, wage: 0.6 }),
  autumn: Object.freeze({ availability: 0.85, wage: 0.7 }),
  winter: Object.freeze({ availability: 0.45, wage: 0.5 })
});

const LEGACY_SHORTWORK_WAGE = 0.9;
const SHORTWORK_HEALTH_COST = Number(Base.V13_RULES?.SHORTWORK_HEALTH_COST || 0.35);
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function ensureShortworkMarket(state) {
  if (!state) return null;
  state.shortworkMarket ??= {};
  const market = state.shortworkMarket;
  if (market.policyVersion !== 163) {
    market.policyVersion = 163;
    market.seed = (Number(state.rngState || state.elapsedDays || 163) >>> 0) || 163;
    market.lastDay = null;
  }
  return market;
}

function seasonFor(state) {
  return Base.getSeason?.(state?.month) || 'winter';
}

export function getShortworkTerms(state) {
  const season = seasonFor(state);
  const terms = V163_SHORTWORK_TERMS[season] || V163_SHORTWORK_TERMS.winter;
  return {
    season,
    availability: terms.availability,
    wage: terms.wage,
    expectedDailyIncome: round2(terms.availability * terms.wage)
  };
}

function hashUnit(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function isShortworkAvailable(state, personId) {
  const market = ensureShortworkMarket(state);
  const terms = getShortworkTerms(state);
  const key = [
    market?.seed || 163,
    Number(state?.year || 290),
    Number(state?.month || 1),
    Number(state?.day || 1),
    personId || state?.playerId || 'unknown'
  ].join('|');
  return hashUnit(key) < terms.availability;
}

function prepare(state) {
  Base.ensureAutoFarmWorkers?.(state);
  ensureShortworkMarket(state);
  return expose(state);
}

export function createGame(options) {
  return prepare(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepare(Base.deserializeState(raw));
}

export function getFamilyWorkAssignments(state) {
  const terms = getShortworkTerms(state);
  return Base.getFamilyWorkAssignments(state).map(job => {
    if (job.assignment !== 'shortwork') return job;
    return {
      ...job,
      dailyIncome: terms.expectedDailyIncome,
      expectedDailyIncome: terms.expectedDailyIncome,
      shortworkWage: terms.wage,
      shortworkAvailability: terms.availability
    };
  });
}

export function getHouseholdBudget(state) {
  const budget = Base.getHouseholdBudget(state);
  const jobs = getFamilyWorkAssignments(state);
  const expectedDailyIncome = round2(jobs.reduce((sum, job) => sum + Number(job.dailyIncome || 0), 0));
  return {
    ...budget,
    actual: {
      ...budget.actual,
      dailyIncome: expectedDailyIncome
    },
    forecast: {
      ...budget.forecast,
      annualIncome: round2(expectedDailyIncome * 365),
      annualBasis: '按当前分工估算；短工收入已按当前季节找活概率折算，实际每日可能为0。'
    },
    assignments: jobs
  };
}

const seasonLabels = Object.freeze({ spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' });

export function getActions(state) {
  const terms = getShortworkTerms(state);
  const chance = Math.round(terms.availability * 100);
  return Base.getActions(state).map(action => {
    if (action.id !== 'trade') return action;
    return {
      ...action,
      label: '短工谋生',
      risk: null,
      desc: `短工只够维持生计，不保证每天有活。${seasonLabels[terms.season] || ''}找到活约${chance}%，有活日收入${terms.wage}钱，长期平均约${terms.expectedDailyIncome}钱/日；没找到活当天0收入，也不扣短工健康。`
    };
  });
}

function shortworkSnapshot(state) {
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || !state.currentActivity) return [];
  const terms = getShortworkTerms(state);
  const logStart = state.eventLog?.length || 0;
  const recovering = state.agriculture?.work?.recovering || {};
  return Base.getFamilyWorkAssignments(state)
    .filter(job => job.assignment === 'shortwork')
    .map(job => {
      const available = isShortworkAvailable(state, job.personId);
      return {
        personId: job.personId,
        personName: state.people?.[job.personId]?.name || job.name || '',
        baseIncome: Number(job.dailyIncome || LEGACY_SHORTWORK_WAGE),
        available,
        targetIncome: available ? terms.wage : 0,
        wasRecovering: Boolean(recovering[job.personId]),
        logStart,
        year: state.year,
        month: state.month,
        day: state.day,
        season: terms.season,
        availability: terms.availability,
        wage: terms.wage
      };
    });
}

function adjustLastDailyWork(state, snapshot) {
  const last = state?.agriculture?.work?.lastDailyWork || state?.agriculture?.lastDailyWork;
  if (!last) return;
  const byId = new Map(snapshot.map(item => [item.personId, item]));
  for (const job of last.jobs || []) {
    const item = byId.get(job.personId);
    if (!item) continue;
    job.dailyIncome = item.targetIncome;
    if (!item.available) job.healthDelta = 0;
    if (!item.available) job.staminaDelta = 0;
  }
  for (const changes of [last.healthChanges, last.staminaChanges]) {
    if (!changes) continue;
    for (const item of snapshot) {
      if (item.available) continue;
      const current = Number(changes[item.personId] || 0);
      if (current < 0) changes[item.personId] = round2(Math.min(0, current + SHORTWORK_HEALTH_COST));
    }
  }
  last.income = round2((last.jobs || []).reduce((sum, job) => sum + Number(job.dailyIncome || 0), 0));
}

function removeFalseRecoveryLogs(state, snapshot) {
  if (!snapshot.length || !Array.isArray(state.eventLog)) return;
  const noWork = snapshot.filter(item => !item.available && !item.wasRecovering && item.personName);
  if (!noWork.length) return;
  const logStart = Math.min(...noWork.map(item => item.logStart));
  const before = state.eventLog.slice(0, logStart);
  const after = state.eventLog.slice(logStart).filter(entry => {
    if (entry?.title !== '开始休养') return true;
    return !noWork.some(item => {
      const text = String(entry.text || '');
      return text.startsWith(`${item.personName}健康偏低`) || text.startsWith(`${item.personName}体力偏低`);
    });
  });
  state.eventLog = [...before, ...after];
}

function settleShortworkBalance(state, snapshot, ledger) {
  if (!snapshot.length) return;
  let moneyAdjustment = 0;
  let actualIncome = 0;
  let foundWork = 0;
  const recovering = state.agriculture?.work?.recovering;

  for (const item of snapshot) {
    const adjustment = round2(item.targetIncome - item.baseIncome);
    moneyAdjustment = round2(moneyAdjustment + adjustment);
    actualIncome = round2(actualIncome + item.targetIncome);
    if (item.available) {
      foundWork += 1;
      continue;
    }

    const person = state.people?.[item.personId];
    if (person?.alive) {
      const field = Object.prototype.hasOwnProperty.call(person, 'stamina') ? 'stamina' : 'health';
      person[field] = round2(Math.min(100, Number(person[field] || 0) + SHORTWORK_HEALTH_COST));
      if (recovering) recovering[item.personId] = item.wasRecovering;
    }
  }

  state.resources.money = round2(Number(state.resources?.money || 0) + moneyAdjustment);
  if (state.household) state.household.money = state.resources.money;
  if (ledger) ledger.workIncome = round2(Number(ledger.workIncome || 0) + moneyAdjustment);
  adjustLastDailyWork(state, snapshot);
  removeFalseRecoveryLogs(state, snapshot);

  const market = ensureShortworkMarket(state);
  market.lastDay = {
    year: snapshot[0].year,
    month: snapshot[0].month,
    day: snapshot[0].day,
    season: snapshot[0].season,
    workers: snapshot.length,
    foundWork,
    actualIncome
  };
  Base.sync?.(state);
}

export function advanceDay(state) {
  prepare(state);
  const beforeElapsed = Number(state?.elapsedDays || 0);
  const snapshot = shortworkSnapshot(state);
  const ledger = Base.ledger?.(state);
  const result = Base.advanceDay(state);
  if (!result?.ok) return result;
  if (Number(state?.elapsedDays || 0) > beforeElapsed) settleShortworkBalance(state, snapshot, ledger);
  expose(state);
  return result;
}