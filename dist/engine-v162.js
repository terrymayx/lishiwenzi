import * as Base from './engine-v161.js?v=1.6.1';

export * from './engine-v161.js?v=1.6.1';

export const V162_AUTO_FARM = Object.freeze({
  WORKER_ACRES: 3,
  MONTHLY_WAGE: 6,
  POLICY_VERSION: 162,
  LEGACY_ACTIVE_WORKER_CAP: 30
});

const round1 = value => Math.round((Number(value) || 0) * 10) / 10;
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function monthKey(state) {
  return `${state.year}-${state.month}`;
}

function nextDate(state) {
  const month = Number(state.month) || 1;
  const day = Number(state.day) || 1;
  const year = Number(state.year) || 290;
  const monthDays = Base.MONTH_DAYS || [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < monthDays[month - 1]) return { year, month, day: day + 1, key: `${year}-${month}` };
  if (month < 12) return { year, month: month + 1, day: 1, key: `${year}-${month + 1}` };
  return { year: year + 1, month: 1, day: 1, key: `${year + 1}-1` };
}

export function getRequiredFarmWorkers(land) {
  return Math.max(0, Math.ceil(Math.max(0, Number(land) || 0) / V162_AUTO_FARM.WORKER_ACRES));
}

function getAgriculture(state) {
  return Base.ensureFamilyWork?.(state) || state?.agriculture || null;
}

function syncLegacyWorkerBridge(state, auto) {
  const agriculture = getAgriculture(state);
  if (!agriculture) return null;
  agriculture.hiredWorkers = Math.min(
    V162_AUTO_FARM.LEGACY_ACTIVE_WORKER_CAP,
    Math.max(0, Math.floor(Number(auto.paidWorkers) || 0))
  );
  agriculture.autoRenew = false;
  agriculture.lastWageMonthKey = auto.lastPayrollMonthKey || monthKey(state);
  return agriculture;
}

export function ensureAutoFarmWorkers(state) {
  if (!state) return null;
  state.autoFarm ??= {};
  const auto = state.autoFarm;
  const requiredWorkers = getRequiredFarmWorkers(state.household?.land);
  const currentKey = monthKey(state);

  if (auto.policyVersion !== V162_AUTO_FARM.POLICY_VERSION) {
    auto.policyVersion = V162_AUTO_FARM.POLICY_VERSION;
    auto.paidWorkers = requiredWorkers;
    auto.lastPayrollMonthKey = currentKey;
    auto.migratedFromManualWorkers = true;
  }

  auto.requiredWorkers = requiredWorkers;
  auto.paidWorkers = Math.min(requiredWorkers, Math.max(0, Math.floor(Number(auto.paidWorkers) || 0)));
  auto.lastPayrollMonthKey ||= currentKey;
  syncLegacyWorkerBridge(state, auto);
  return auto;
}

export function getLandPurchaseQuote(state, acres = 1) {
  const amount = Number(acres);
  const landCost = Base.getLandPrice(state, amount);
  if (!Number.isFinite(landCost)) {
    return { landCost: Infinity, newWorkers: 0, workerWage: 0, totalCost: Infinity };
  }
  const beforeLand = Math.max(0, Number(state?.household?.land || 0));
  const beforeWorkers = getRequiredFarmWorkers(beforeLand);
  const afterWorkers = getRequiredFarmWorkers(beforeLand + amount);
  const newWorkers = Math.max(0, afterWorkers - beforeWorkers);
  const workerWage = round1(newWorkers * V162_AUTO_FARM.MONTHLY_WAGE);
  return {
    acres: amount,
    landCost: round1(landCost),
    beforeWorkers,
    afterWorkers,
    newWorkers,
    workerWage,
    totalCost: round1(landCost + workerWage)
  };
}

// Current UI treats this as the immediate cash required to buy land.
export function getLandPrice(state, acres = 1) {
  return getLandPurchaseQuote(state, acres).totalCost;
}

export function buyLand(state, acres = 1) {
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || state.running) {
    return { ok: false, message: '时间暂停且没有待处理事件时才能购买田地。' };
  }
  const auto = ensureAutoFarmWorkers(state);
  const quote = getLandPurchaseQuote(state, acres);
  if (!Number.isFinite(quote.totalCost)) return { ok: false, message: '购买亩数必须是1至20亩。' };
  if (Number(state.resources?.money || 0) < quote.totalCost) {
    return {
      ok: false,
      message: quote.workerWage > 0
        ? `买田并自动安排新增农工共需要${quote.totalCost}钱（田价${quote.landCost} + 首月工钱${quote.workerWage}）。`
        : `购买${acres}亩田地需要${quote.totalCost}钱。`
    };
  }

  const beforePaidWorkers = Math.max(0, Number(auto.paidWorkers) || 0);
  const result = Base.buyLand(state, acres);
  if (!result?.ok) return result;

  if (quote.workerWage > 0) {
    state.resources.money = round1(Number(state.resources.money || 0) - quote.workerWage);
    if (state.household) state.household.money = state.resources.money;
    const currentLedger = Base.ledger?.(state);
    if (currentLedger) currentLedger.wages = round2(Number(currentLedger.wages || 0) + quote.workerWage);
  }

  auto.requiredWorkers = quote.afterWorkers;
  auto.paidWorkers = Math.min(quote.afterWorkers, beforePaidWorkers + quote.newWorkers);
  auto.lastPayrollMonthKey = monthKey(state);
  syncLegacyWorkerBridge(state, auto);

  if (quote.newWorkers > 0) {
    addLog(
      state,
      'economy',
      '田庄自动增配农工',
      `新增田产跨过劳力档位，系统自动安排${quote.newWorkers}名农工，并支付本月工钱${quote.workerWage}钱。每3亩田配置1名农工。`
    );
  }
  expose(state);
  return {
    ...result,
    cost: quote.totalCost,
    landCost: quote.landCost,
    workerWage: quote.workerWage,
    newWorkers: quote.newWorkers,
    message: quote.workerWage > 0
      ? `已购置${acres}亩田地：田价${quote.landCost}钱，自动增配${quote.newWorkers}名农工并付首月${quote.workerWage}钱，共支出${quote.totalCost}钱。`
      : `已购置${acres}亩田地，花费${quote.landCost}钱；现有农工配置足以覆盖新增田产。`
  };
}

export function hireFarmWorkers() {
  return { ok: false, message: 'V1.6.2 起农工由田产自动配置，无需手动雇人。' };
}

export function dismissFarmWorkers() {
  return { ok: false, message: 'V1.6.2 起农工随田产自动配置，不能手动解雇。' };
}

function settleAutomaticPayroll(state, targetMonthKey) {
  const auto = ensureAutoFarmWorkers(state);
  const requiredWorkers = getRequiredFarmWorkers(state.household?.land);
  const money = Math.max(0, Number(state.resources?.money || 0));
  const paidWorkers = Math.min(requiredWorkers, Math.floor(money / V162_AUTO_FARM.MONTHLY_WAGE));
  const charged = round1(paidWorkers * V162_AUTO_FARM.MONTHLY_WAGE);
  state.resources.money = round1(money - charged);
  if (state.household) state.household.money = state.resources.money;

  const currentLedger = Base.ledger?.(state);
  if (currentLedger) currentLedger.wages = round2(Number(currentLedger.wages || 0) + charged);

  auto.requiredWorkers = requiredWorkers;
  auto.paidWorkers = paidWorkers;
  auto.lastPayrollMonthKey = targetMonthKey;
  syncLegacyWorkerBridge(state, auto);
  return {
    requiredWorkers,
    paidWorkers,
    unpaidWorkers: requiredWorkers - paidWorkers,
    charged,
    targetMonthKey
  };
}

function weatherModifier(state) {
  const weather = state?.agriculture?.weather || {};
  return ['spring', 'summer', 'autumn'].reduce(
    (value, season) => value * (Number(weather[`${state.year}-${season}`]?.yieldModifier) || 1),
    1
  );
}

function syncFarmProgressFields(state, agriculture) {
  const work = agriculture?.work;
  if (!work) return;
  const land = Math.max(0, Number(state.household?.land || 0));
  agriculture.sownAcres = Number(work.sown || 0);
  agriculture.tendedAcres = Number(work.tended || 0);
  agriculture.springWorkDays = round2(land ? Math.min(20, Number(work.sown || 0) / land * 20) : 0);
  agriculture.summerWorkDays = round2(work.sown ? Math.min(20, Number(work.tended || 0) / Number(work.sown || 1) * 20) : 0);
  agriculture.harvestWorkDays = round2(work.tended ? Math.min(5, Number(work.harvested || 0) / Number(work.tended || 1) * 5) : 0);
}

function supplementWorkersBeyondLegacyCap(state) {
  const auto = ensureAutoFarmWorkers(state);
  const extraWorkers = Math.max(0, Number(auto.paidWorkers || 0) - V162_AUTO_FARM.LEGACY_ACTIVE_WORKER_CAP);
  if (extraWorkers <= 0) return 0;

  const agriculture = getAgriculture(state);
  const work = agriculture?.work;
  const land = Math.max(0, Number(state.household?.land || 0));
  const season = Base.getSeason?.(state.month);
  if (!work || !land || season === 'winter') return 0;

  const extraCapacity = extraWorkers * V162_AUTO_FARM.WORKER_ACRES;
  let grainHarvested = 0;
  if (season === 'spring') {
    work.sown = Math.min(land, Number(work.sown || 0) + extraCapacity / 20);
  } else if (season === 'summer') {
    work.tended = Math.min(land, Number(work.sown || 0), Number(work.tended || 0) + extraCapacity / 20);
  } else if (season === 'autumn') {
    const remaining = Math.max(0, Math.min(land, Number(work.tended || 0)) - Number(work.harvested || 0));
    const area = Math.min(extraCapacity / 5, remaining);
    if (area > 0) {
      work.harvested = Number(work.harvested || 0) + area;
      grainHarvested = round2(area * 90 * weatherModifier(state));
      state.resources.grain = round2(Number(state.resources.grain || 0) + grainHarvested);
      if (state.household) state.household.grain = state.resources.grain;
      agriculture.harvestedGrain = round2(Number(agriculture.harvestedGrain || 0) + grainHarvested);
      const currentLedger = Base.ledger?.(state);
      if (currentLedger) currentLedger.harvest = round2(Number(currentLedger.harvest || 0) + grainHarvested);
    }
  }
  syncFarmProgressFields(state, agriculture);
  return grainHarvested;
}

function canAdvance(state) {
  return Boolean(state && state.phase === 'playing' && !state.endpoint && !state.pendingEvent && state.currentActivity);
}

function addPayrollLog(state, payroll) {
  if (!payroll || payroll.requiredWorkers <= 0) return;
  if (payroll.unpaidWorkers > 0) {
    addLog(
      state,
      'warning',
      '田庄工资不足',
      `本月田庄需要${payroll.requiredWorkers}名农工，工资应为${payroll.requiredWorkers * V162_AUTO_FARM.MONTHLY_WAGE}钱；现钱只够支付${payroll.paidWorkers}人，共${payroll.charged}钱。其余${payroll.unpaidWorkers}名本月暂不上工，下月会自动重新结算。`
    );
  } else {
    addLog(state, 'economy', '田庄自动发薪', `本月自动支付${payroll.charged}钱，${payroll.paidWorkers}名农工全部到岗。`);
  }
}

export function getFarmSummary(state) {
  const auto = ensureAutoFarmWorkers(state);
  const baseSummary = Base.getFarmSummary(state);
  const land = Math.max(0, Number(state.household?.land || 0));
  const paidWorkers = Math.max(0, Number(auto.paidWorkers || 0));
  const requiredWorkers = getRequiredFarmWorkers(land);
  const autoManagedAcres = Math.min(land, paidWorkers * V162_AUTO_FARM.WORKER_ACRES);
  const familyCapacity = Math.max(0, Number(baseSummary.familyCapacity || 0));
  const totalCapacity = familyCapacity + paidWorkers * V162_AUTO_FARM.WORKER_ACRES;
  return {
    ...baseSummary,
    land,
    requiredWorkers,
    paidWorkers,
    unpaidWorkers: Math.max(0, requiredWorkers - paidWorkers),
    workerAcres: V162_AUTO_FARM.WORKER_ACRES,
    workerMonthlyWage: V162_AUTO_FARM.MONTHLY_WAGE,
    requiredMonthlyWage: requiredWorkers * V162_AUTO_FARM.MONTHLY_WAGE,
    autoManagedAcres,
    unmanagedAutoAcres: Math.max(0, land - autoManagedAcres),
    hasWorkerCap: false,
    hiredWorkers: paidWorkers,
    hiredCapacity: paidWorkers * V162_AUTO_FARM.WORKER_ACRES,
    totalCapacity,
    productiveAcres: Math.min(land, totalCapacity),
    idleAcres: Math.max(0, land - totalCapacity),
    monthlyWages: requiredWorkers * V162_AUTO_FARM.MONTHLY_WAGE,
    workersNeeded: 0,
    remainingWorkerSlots: Infinity,
    workerLimitReached: false
  };
}

export function getActions(state) {
  return Base.getActions(state).map(action => {
    if (!['longfarm', 'cultivate'].includes(action.id)) return action;
    return {
      ...action,
      desc: action.id === 'longfarm'
        ? '田庄按每3亩自动配置1名农工并按月发薪；你仍可亲自长期务农，帮助家中把农时做得更稳。'
        : '田庄已有自动农工负责日常打理；你亲自下田时继续参与春耕、夏管和秋收。'
    };
  });
}

function prepare(state) {
  Base.ensureIndustry?.(state);
  ensureAutoFarmWorkers(state);
  return expose(state);
}

export function createGame(options) {
  return prepare(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepare(Base.deserializeState(raw));
}

export function advanceDay(state) {
  prepare(state);
  const beforeElapsed = Number(state?.elapsedDays || 0);
  const currentKey = monthKey(state);
  const next = nextDate(state);
  let payroll = null;

  if (canAdvance(state) && next.key !== currentKey) {
    payroll = settleAutomaticPayroll(state, next.key);
  }

  let result = Base.advanceDay(state);
  if (!result?.ok) return result;

  const advanced = Number(state?.elapsedDays || 0) > beforeElapsed;
  if (advanced) {
    prepare(state);
    supplementWorkersBeyondLegacyCap(state);
    addPayrollLog(state, payroll);
  }
  expose(state);
  return result;
}
