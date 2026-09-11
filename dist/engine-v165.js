import * as Base from './engine-v164.js?v=1.6.4';

export * from './engine-v164.js?v=1.6.4';

export const V165_SHORTWORK_TERMS = Object.freeze({
  spring: Object.freeze({ availability: 0.8, wage: 0.8 }),
  summer: Object.freeze({ availability: 0.65, wage: 0.8 }),
  autumn: Object.freeze({ availability: 0.85, wage: 0.9 }),
  winter: Object.freeze({ availability: 0.45, wage: 0.7 })
});

export const V165_WORK_POLICY = Object.freeze({
  manualFarmingEnabled: false,
  farmActions: Object.freeze(['longfarm', 'cultivate']),
  farmJobs: Object.freeze(['longfarm', 'agriculture'])
});

const FARM_ACTIONS = new Set(V165_WORK_POLICY.farmActions);
const FARM_JOBS = new Set(V165_WORK_POLICY.farmJobs);
const seasonLabels = Object.freeze({ spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' });
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function seasonFor(state) {
  return Base.getSeason?.(state?.month) || 'winter';
}

export function getShortworkTerms(state) {
  const season = seasonFor(state);
  const terms = V165_SHORTWORK_TERMS[season] || V165_SHORTWORK_TERMS.winter;
  return {
    season,
    availability: terms.availability,
    wage: terms.wage,
    expectedDailyIncome: round2(terms.availability * terms.wage)
  };
}

export function isShortworkAvailable(state, personId) {
  return Base.isShortworkAvailable(state, personId);
}

function migrateManualFarming(state) {
  if (!state) return state;
  const agriculture = Base.ensureFamilyWork?.(state);
  const assignments = agriculture?.work?.assignments;
  if (assignments && state.playerId && FARM_JOBS.has(assignments[state.playerId])) {
    assignments[state.playerId] = 'shortwork';
  }

  if (FARM_ACTIONS.has(state.currentActivity?.id)) {
    state.currentActivity = {
      id: 'trade',
      kind: 'routine',
      elapsed: 0,
      duration: null,
      destination: null,
      charged: false
    };
    state.pauseReason = state.running
      ? '旧版务农已改为短工谋生，时间继续推进'
      : '旧版务农已取消，已改为短工谋生';
  }
  return state;
}

function prepare(state) {
  migrateManualFarming(state);
  return expose(state);
}

export function createGame(options) {
  return prepare(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepare(Base.deserializeState(raw));
}

export function getActions(state) {
  const terms = getShortworkTerms(state);
  const chance = Math.round(terms.availability * 100);
  return Base.getActions(state)
    .filter(action => !FARM_ACTIONS.has(action.id))
    .map(action => {
      if (action.id !== 'trade') return action;
      return {
        ...action,
        label: '短工谋生',
        risk: null,
        desc: `${seasonLabels[terms.season] || ''}找到活约${chance}%，有活日收入${terms.wage}钱，长期平均约${terms.expectedDailyIncome}钱/日。田地由自动农工打理，不需要本人下田；没找到活当天0收入，也不扣短工健康。`
      };
    });
}

export function selectActivity(state, id, options = {}) {
  if (FARM_ACTIONS.has(id)) {
    return { ok: false, message: 'V1.6.5 起本人不再手动务农，田地统一由自动农工打理。' };
  }
  return Base.selectActivity(state, id, options);
}

export function setFamilyWorkAssignment(state, id, job) {
  if (id === state?.playerId && FARM_JOBS.has(job)) {
    return { ok: false, message: '本人务农已取消；田地由自动农工打理，请选择短工、家庭副业、求学或休养。' };
  }
  return Base.setFamilyWorkAssignment(state, id, job);
}

export function getFamilyWorkAssignments(state) {
  migrateManualFarming(state);
  const terms = getShortworkTerms(state);
  return Base.getFamilyWorkAssignments(state).map(job => {
    if (job.personId !== state.playerId || job.assignment !== 'shortwork') return job;
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
  migrateManualFarming(state);
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
      annualBasis: '按当前行动估算；本人不再手动务农，短工收入按当前季节找活概率折算，田产由自动农工经营。'
    },
    assignments: jobs
  };
}

function shortworkBonusSnapshot(state) {
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || !state.currentActivity) return null;
  migrateManualFarming(state);
  const playerJob = Base.getFamilyWorkAssignments(state).find(job => job.personId === state.playerId);
  if (playerJob?.assignment !== 'shortwork') return null;
  if (!Base.isShortworkAvailable(state, state.playerId)) return null;
  const oldWage = Number(Base.getShortworkTerms?.(state)?.wage || 0);
  const newWage = Number(getShortworkTerms(state).wage || 0);
  const bonus = round2(Math.max(0, newWage - oldWage));
  return bonus > 0 ? { bonus, playerId: state.playerId } : null;
}

function settleShortworkBonus(state, snapshot) {
  if (!snapshot?.bonus) return;
  state.resources.money = round2(Number(state.resources?.money || 0) + snapshot.bonus);
  if (state.household) state.household.money = state.resources.money;

  const ledger = Base.ledger?.(state);
  if (ledger) ledger.workIncome = round2(Number(ledger.workIncome || 0) + snapshot.bonus);

  const last = state.agriculture?.work?.lastDailyWork || state.agriculture?.lastDailyWork;
  if (last) {
    const playerJob = (last.jobs || []).find(job => job.personId === snapshot.playerId);
    if (playerJob?.assignment === 'shortwork') {
      playerJob.dailyIncome = round2(Number(playerJob.dailyIncome || 0) + snapshot.bonus);
    }
    last.income = round2(Number(last.income || 0) + snapshot.bonus);
  }

  if (state.shortworkMarket?.lastDay) {
    state.shortworkMarket.lastDay.actualIncome = round2(Number(state.shortworkMarket.lastDay.actualIncome || 0) + snapshot.bonus);
  }
  Base.sync?.(state);
}

export function advanceDay(state) {
  prepare(state);
  const beforeElapsed = Number(state?.elapsedDays || 0);
  const snapshot = shortworkBonusSnapshot(state);
  const result = Base.advanceDay(state);
  if (!result?.ok) return result;
  if (Number(state?.elapsedDays || 0) > beforeElapsed) settleShortworkBonus(state, snapshot);
  expose(state);
  return result;
}
