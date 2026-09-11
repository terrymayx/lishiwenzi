import * as Base from './engine-v166.js?v=1.6.6';

export * from './engine-v166.js?v=1.6.6';

export const V167_MOTHER_FARM = Object.freeze({
  CAPACITY_ACRES: 3,
  WORKER_ACRES: 3,
  MONTHLY_WAGE: 6,
  VERSION: 167
});

const round1 = value => Math.round((Number(value) || 0) * 10) / 10;
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function getInitialMother(state) {
  return Object.values(state?.people || {}).find(person => person?.role === 'mother') || null;
}

export function getMotherFarmSupport(state, landOverride = null) {
  const land = Math.max(0, Number(landOverride ?? state?.household?.land ?? 0));
  const mother = getInitialMother(state);
  const available = Boolean(mother?.alive);
  const capacity = available ? V167_MOTHER_FARM.CAPACITY_ACRES : 0;
  return {
    motherId: mother?.id || null,
    motherName: mother?.name || '母亲',
    available,
    capacity,
    managedAcres: Math.min(land, capacity)
  };
}

function hiredWorkersNeeded(state, landOverride = null) {
  const land = Math.max(0, Number(landOverride ?? state?.household?.land ?? 0));
  const support = getMotherFarmSupport(state, land);
  const uncovered = Math.max(0, land - support.managedAcres);
  return Math.max(0, Math.ceil(uncovered / V167_MOTHER_FARM.WORKER_ACRES));
}

function currentMonthKey(state) {
  return `${state.year}-${state.month}`;
}

function nextDate(state) {
  const days = Base.MONTH_DAYS || [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const year = Number(state?.year || 290);
  const month = Number(state?.month || 1);
  const day = Number(state?.day || 1);
  if (day < days[month - 1]) return { year, month, day: day + 1, key: `${year}-${month}` };
  if (month < 12) return { year, month: month + 1, day: 1, key: `${year}-${month + 1}` };
  return { year: year + 1, month: 1, day: 1, key: `${year + 1}-1` };
}

function canAdvance(state) {
  return Boolean(state && state.phase === 'playing' && !state.endpoint && !state.pendingEvent && state.currentActivity);
}

function ensureMotherFarmState(state) {
  if (!state) return null;
  const auto = Base.ensureAutoFarmWorkers?.(state);
  state.motherFarm ??= { version: V167_MOTHER_FARM.VERSION, virtualWorkerActive: false };
  const motherFarm = state.motherFarm;
  const land = Math.max(0, Number(state.household?.land || 0));
  const support = getMotherFarmSupport(state, land);
  const shouldUseVirtualWorker = support.available && land > 0;
  const wasUsingVirtualWorker = Boolean(motherFarm.virtualWorkerActive);

  if (auto && wasUsingVirtualWorker && !shouldUseVirtualWorker) {
    auto.paidWorkers = Math.max(0, Number(auto.paidWorkers || 0) - 1);
  }
  if (auto && shouldUseVirtualWorker) {
    auto.paidWorkers = Math.max(1, Number(auto.paidWorkers || 0));
  }

  motherFarm.version = V167_MOTHER_FARM.VERSION;
  motherFarm.motherId = support.motherId;
  motherFarm.virtualWorkerActive = shouldUseVirtualWorker;
  motherFarm.capacity = support.capacity;
  motherFarm.managedAcres = support.managedAcres;
  motherFarm.updatedMonthKey = currentMonthKey(state);
  return motherFarm;
}

function snapshotProgression(state) {
  return state?.householdProgression ? JSON.parse(JSON.stringify(state.householdProgression)) : null;
}

function restoreProgressionAndReevaluate(state, snapshot, logStart) {
  if (snapshot) state.householdProgression = snapshot;
  if (Array.isArray(state?.eventLog) && Number.isInteger(logStart)) {
    const old = state.eventLog.slice(0, logStart);
    const fresh = state.eventLog.slice(logStart).filter(entry => entry?.kind !== 'unlock');
    state.eventLog = [...old, ...fresh];
  }
  Base.getHouseholdUnlockStatus?.(state);
}

function removeNewFarmPayrollLogs(state, logStart) {
  if (!Array.isArray(state?.eventLog) || !Number.isInteger(logStart)) return;
  const old = state.eventLog.slice(0, logStart);
  const fresh = state.eventLog.slice(logStart).filter(entry => !['田庄自动发薪', '田庄工资不足'].includes(entry?.title));
  state.eventLog = [...old, ...fresh];
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function addAccuratePayrollLog(state) {
  const summary = getFarmSummary(state);
  if (summary.requiredWorkers <= 0) return;
  if (summary.unpaidWorkers > 0) {
    addLog(
      state,
      'warning',
      '田庄工资不足',
      `母亲免费照看${summary.motherManagedAcres}亩；其余田地需要${summary.requiredWorkers}名农工，本月已付${summary.paidWorkers}人，还有${summary.unpaidWorkers}人暂未上工。`
    );
  } else {
    addLog(
      state,
      'economy',
      '田庄自动发薪',
      `母亲免费照看${summary.motherManagedAcres}亩；本月另支付${summary.requiredMonthlyWage}钱，${summary.paidWorkers}名农工全部到岗。`
    );
  }
}

function prepare(state) {
  ensureMotherFarmState(state);
  return expose(state);
}

export function createGame(options) {
  return prepare(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepare(Base.deserializeState(raw));
}

export function getFarmSummary(state) {
  prepare(state);
  const base = Base.getFarmSummary(state);
  const land = Math.max(0, Number(state?.household?.land || 0));
  const support = getMotherFarmSupport(state, land);
  const requiredWorkers = hiredWorkersNeeded(state, land);
  const virtualMother = support.available && land > 0 ? 1 : 0;
  const totalPaidSlots = Math.max(0, Number(state?.autoFarm?.paidWorkers ?? base.paidWorkers ?? 0));
  const paidWorkers = Math.max(0, Math.min(requiredWorkers, totalPaidSlots - virtualMother));
  const hiredManagedAcres = Math.min(Math.max(0, land - support.managedAcres), paidWorkers * V167_MOTHER_FARM.WORKER_ACRES);
  const productiveAcres = Math.min(land, support.managedAcres + hiredManagedAcres);

  return {
    ...base,
    land,
    motherAvailable: support.available,
    motherId: support.motherId,
    motherFarmCapacity: support.capacity,
    motherManagedAcres: support.managedAcres,
    requiredWorkers,
    paidWorkers,
    unpaidWorkers: Math.max(0, requiredWorkers - paidWorkers),
    workerAcres: V167_MOTHER_FARM.WORKER_ACRES,
    workerMonthlyWage: V167_MOTHER_FARM.MONTHLY_WAGE,
    requiredMonthlyWage: requiredWorkers * V167_MOTHER_FARM.MONTHLY_WAGE,
    monthlyWages: requiredWorkers * V167_MOTHER_FARM.MONTHLY_WAGE,
    hiredWorkers: paidWorkers,
    hiredCapacity: paidWorkers * V167_MOTHER_FARM.WORKER_ACRES,
    familyCapacity: support.managedAcres,
    autoManagedAcres: hiredManagedAcres,
    totalManagedAcres: productiveAcres,
    totalCapacity: support.managedAcres + paidWorkers * V167_MOTHER_FARM.WORKER_ACRES,
    productiveAcres,
    idleAcres: Math.max(0, land - productiveAcres),
    unmanagedAutoAcres: Math.max(0, land - productiveAcres),
    workersNeeded: Math.max(0, requiredWorkers - paidWorkers),
    remainingWorkerSlots: Infinity,
    workerLimitReached: false,
    hasWorkerCap: false
  };
}

export function getLandPurchaseQuote(state, acres = 1) {
  prepare(state);
  const baseQuote = Base.getLandPurchaseQuote(state, acres);
  if (!Number.isFinite(baseQuote?.landCost)) return baseQuote;
  const amount = Number(acres);
  const beforeLand = Math.max(0, Number(state?.household?.land || 0));
  const afterLand = beforeLand + amount;
  const beforeWorkers = hiredWorkersNeeded(state, beforeLand);
  const afterWorkers = hiredWorkersNeeded(state, afterLand);
  const newWorkers = Math.max(0, afterWorkers - beforeWorkers);
  const workerWage = round1(newWorkers * V167_MOTHER_FARM.MONTHLY_WAGE);
  const motherBefore = getMotherFarmSupport(state, beforeLand).managedAcres;
  const motherAfter = getMotherFarmSupport(state, afterLand).managedAcres;

  return {
    ...baseQuote,
    beforeWorkers,
    afterWorkers,
    newWorkers,
    workerWage,
    totalCost: round1(Number(baseQuote.landCost || 0) + workerWage),
    motherManagedBefore: motherBefore,
    motherManagedAfter: motherAfter,
    motherCoversNewLand: motherAfter > motherBefore
  };
}

export function getLandPrice(state, acres = 1) {
  return getLandPurchaseQuote(state, acres).totalCost;
}

export function buyLand(state, acres = 1) {
  prepare(state);
  const unlock = Base.getHouseholdUnlockStatus?.(state);
  if (unlock?.landPurchase && !unlock.landPurchase.unlocked) return Base.buyLand(state, acres);

  const desired = getLandPurchaseQuote(state, acres);
  if (!Number.isFinite(desired?.totalCost)) return Base.buyLand(state, acres);
  if (Number(state.resources?.money || 0) < desired.totalCost) {
    return {
      ok: false,
      message: desired.workerWage > 0
        ? `买田并安排新增农工共需要${desired.totalCost}钱（田价${desired.landCost} + 首月工钱${desired.workerWage}）。`
        : `购买${acres}亩田地需要${desired.totalCost}钱。`
    };
  }

  const baseQuote = Base.getLandPurchaseQuote(state, acres);
  const subsidy = round1(Math.max(0, Number(baseQuote.workerWage || 0) - Number(desired.workerWage || 0)));
  const logStart = state.eventLog?.length || 0;
  const progression = snapshotProgression(state);
  const wageLedgerBefore = Number(Base.ledger?.(state)?.wages || 0);

  if (subsidy > 0) {
    state.resources.money = round1(Number(state.resources.money || 0) + subsidy);
    if (state.household) state.household.money = state.resources.money;
  }

  const result = Base.buyLand(state, acres);
  if (!result?.ok) {
    if (subsidy > 0) {
      state.resources.money = round1(Math.max(0, Number(state.resources.money || 0) - subsidy));
      if (state.household) state.household.money = state.resources.money;
    }
    return result;
  }

  if (subsidy > 0) {
    const ledger = Base.ledger?.(state);
    if (ledger) ledger.wages = round2(Math.max(wageLedgerBefore, Number(ledger.wages || 0) - subsidy));
  }

  if (Array.isArray(state.eventLog)) {
    const old = state.eventLog.slice(0, logStart);
    const fresh = state.eventLog.slice(logStart).filter(entry => entry?.title !== '田庄自动增配农工' && entry?.kind !== 'unlock');
    state.eventLog = [...old, ...fresh];
  }

  prepare(state);
  restoreProgressionAndReevaluate(state, progression, state.eventLog?.length || 0);

  if (desired.newWorkers > 0) {
    addLog(state, 'economy', '田庄自动增配农工', `母亲免费照看前3亩；新增田产后，其余部分自动增配${desired.newWorkers}名农工，并支付首月工钱${desired.workerWage}钱。`);
  } else if (desired.motherCoversNewLand) {
    addLog(state, 'economy', '母亲照看田地', `新增田产仍在母亲可照看的前3亩范围内，本次无需新增农工，也不产生工钱。`);
  }

  expose(state);
  return {
    ...result,
    cost: desired.totalCost,
    landCost: desired.landCost,
    workerWage: desired.workerWage,
    newWorkers: desired.newWorkers,
    motherCoversNewLand: desired.motherCoversNewLand,
    message: desired.workerWage > 0
      ? `已购置${acres}亩田地：田价${desired.landCost}钱，新增${desired.newWorkers}名农工首月${desired.workerWage}钱，共支出${desired.totalCost}钱。`
      : `已购置${acres}亩田地，花费${desired.landCost}钱；母亲可继续照看，无需新增农工。`
  };
}

export function advanceDay(state) {
  prepare(state);
  const support = getMotherFarmSupport(state);
  const next = nextDate(state);
  const crossingMonth = canAdvance(state) && next.key !== currentMonthKey(state);
  const virtualMother = support.available && support.managedAcres > 0 && crossingMonth;
  const stipend = virtualMother ? V167_MOTHER_FARM.MONTHLY_WAGE : 0;
  const logStart = state.eventLog?.length || 0;
  const progression = snapshotProgression(state);
  const wagesBefore = Number(Base.ledger?.(state)?.wages || 0);

  if (stipend > 0) {
    state.resources.money = round1(Number(state.resources.money || 0) + stipend);
    if (state.household) state.household.money = state.resources.money;
  }

  const result = Base.advanceDay(state);
  if (!result?.ok) {
    if (stipend > 0) {
      state.resources.money = round1(Math.max(0, Number(state.resources.money || 0) - stipend));
      if (state.household) state.household.money = state.resources.money;
    }
    return result;
  }

  if (stipend > 0) {
    const ledger = Base.ledger?.(state);
    const wageDelta = Math.max(0, Number(ledger?.wages || 0) - wagesBefore);
    if (ledger && wageDelta >= stipend) {
      ledger.wages = round2(Number(ledger.wages || 0) - stipend);
    } else {
      state.resources.money = round1(Math.max(0, Number(state.resources.money || 0) - stipend));
      if (state.household) state.household.money = state.resources.money;
    }
  }

  prepare(state);
  if (crossingMonth) {
    removeNewFarmPayrollLogs(state, logStart);
    addAccuratePayrollLog(state);
  }
  restoreProgressionAndReevaluate(state, progression, state.eventLog?.length || 0);
  expose(state);
  return result;
}
