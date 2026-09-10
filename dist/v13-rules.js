export const V13_RULES = Object.freeze({
  FAMILY_ADULT_ACRES: 3,
  FAMILY_YOUTH_ACRES: 1,
  FAMILY_OLDER_ACRES: 1,
  HIRED_WORKER_ACRES: 3,
  HIRED_WORKER_MONTHLY_WAGE: 6,
  BASE_YIELD_PER_MU: 45,
  SPRING_WORK_DAYS: 20,
  SUMMER_WORK_DAYS: 20,
  HARVEST_WORK_DAYS: 5,
  MAX_HIRED_WORKERS: 30
});

const MINOR_MESSAGE_TITLES = new Set([
  '家人染病',
  '临时征敛',
  '故人来信',
  '一纸旧债',
  '田间有收成'
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round1 = value => Math.round(Number(value || 0) * 10) / 10;

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function syncHouseholdResources(state) {
  if (!state?.resources || !state?.household) return;
  state.resources.money = round1(Math.max(0, state.resources.money));
  state.resources.grain = round1(Math.max(0, state.resources.grain));
  state.resources.land = Number(state.household.land || 0);
  state.household.money = state.resources.money;
  state.household.grain = state.resources.grain;
}

export function getSeason(month) {
  const value = Number(month);
  if ([3, 4, 5].includes(value)) return 'spring';
  if ([6, 7, 8].includes(value)) return 'summer';
  if ([9, 10, 11].includes(value)) return 'autumn';
  return 'winter';
}

export function getSeasonLabel(month) {
  return ({ spring: '春耕', summer: '夏管', autumn: '秋收', winter: '冬藏' })[getSeason(month)];
}

function resetCropYear(agriculture, year) {
  agriculture.cropYear = year;
  agriculture.springWorkDays = 0;
  agriculture.summerWorkDays = 0;
  agriculture.harvestWorkDays = 0;
  agriculture.sownAcres = 0;
  agriculture.tendedAcres = 0;
  agriculture.harvestedGrain = 0;
  agriculture.harvestedYear = null;
  agriculture.harvestPlan = null;
}

export function ensureAgriculture(state) {
  if (!state) return null;
  if (!state.agriculture) {
    state.agriculture = {
      cropYear: Number(state.year),
      springWorkDays: 0,
      summerWorkDays: 0,
      harvestWorkDays: 0,
      sownAcres: 0,
      tendedAcres: 0,
      harvestedGrain: 0,
      harvestedYear: null,
      harvestPlan: null,
      hiredWorkers: 0,
      lastWageMonthKey: `${state.year}-${state.month}`,
      weather: {}
    };
  }
  const ag = state.agriculture;
  ag.weather ??= {};
  ag.hiredWorkers = clamp(Math.floor(Number(ag.hiredWorkers) || 0), 0, V13_RULES.MAX_HIRED_WORKERS);
  ag.lastWageMonthKey ??= `${state.year}-${state.month}`;
  if (!Number.isFinite(Number(ag.cropYear))) ag.cropYear = Number(state.year);
  if (Number(ag.cropYear) !== Number(state.year)) resetCropYear(ag, Number(state.year));
  for (const key of ['springWorkDays', 'summerWorkDays', 'harvestWorkDays', 'sownAcres', 'tendedAcres', 'harvestedGrain']) {
    if (!Number.isFinite(Number(ag[key]))) ag[key] = 0;
  }
  return ag;
}

export function getPersonFarmCapacity(person) {
  if (!person?.alive) return 0;
  const age = Number(person.age) || 0;
  const health = Number(person.health) || 0;
  const hunger = Number(person.hunger) || 0;
  if (health < 35 || hunger >= 80) return 0;
  if (age >= 16 && age <= 55) return health < 55 ? 1 : V13_RULES.FAMILY_ADULT_ACRES;
  if (age >= 12 && age <= 15) return V13_RULES.FAMILY_YOUTH_ACRES;
  if (age >= 56 && age <= 65) return V13_RULES.FAMILY_OLDER_ACRES;
  return 0;
}

export function getFamilyFarmCapacity(state) {
  if (!state?.people) return 0;
  const familyId = state.family?.id;
  return Object.values(state.people)
    .filter(person => person?.familyId === familyId)
    .reduce((total, person) => total + getPersonFarmCapacity(person), 0);
}

export function getTotalFarmCapacity(state) {
  const ag = ensureAgriculture(state);
  return getFamilyFarmCapacity(state) + (ag?.hiredWorkers || 0) * V13_RULES.HIRED_WORKER_ACRES;
}

function weatherModifierForYear(state, year) {
  const ag = ensureAgriculture(state);
  return ['spring', 'summer', 'autumn'].reduce((modifier, season) => {
    const weather = ag.weather?.[`${year}-${season}`];
    return modifier * (weather?.yieldModifier ?? 1);
  }, 1);
}

export function getFarmSummary(state) {
  const ag = ensureAgriculture(state);
  const land = Math.max(0, Number(state?.household?.land || 0));
  const familyCapacity = getFamilyFarmCapacity(state);
  const hiredCapacity = (ag?.hiredWorkers || 0) * V13_RULES.HIRED_WORKER_ACRES;
  const totalCapacity = familyCapacity + hiredCapacity;
  const productiveAcres = Math.min(land, totalCapacity);
  const idleAcres = Math.max(0, land - productiveAcres);
  const springQuality = clamp((ag?.springWorkDays || 0) / V13_RULES.SPRING_WORK_DAYS, 0, 1);
  const summerQuality = clamp((ag?.summerWorkDays || 0) / V13_RULES.SUMMER_WORK_DAYS, 0, 1);
  const weatherModifier = weatherModifierForYear(state, Number(state.year));
  const expectedHarvest = round1(productiveAcres * V13_RULES.BASE_YIELD_PER_MU * springQuality * summerQuality * weatherModifier);
  return {
    season: getSeason(state.month),
    seasonLabel: getSeasonLabel(state.month),
    land,
    familyCapacity,
    hiredWorkers: ag?.hiredWorkers || 0,
    hiredCapacity,
    totalCapacity,
    productiveAcres,
    idleAcres,
    springWorkDays: ag?.springWorkDays || 0,
    summerWorkDays: ag?.summerWorkDays || 0,
    harvestWorkDays: ag?.harvestWorkDays || 0,
    expectedHarvest,
    grainSellPrice: getGrainSellPrice(state),
    monthlyWages: round1((ag?.hiredWorkers || 0) * V13_RULES.HIRED_WORKER_MONTHLY_WAGE)
  };
}

function canManageFarmEconomy(state) {
  return Boolean(state && state.phase === 'playing' && !state.endpoint && !state.pendingEvent && !state.running);
}

export function hireFarmWorkers(state, count = 1) {
  if (!canManageFarmEconomy(state)) return { ok: false, message: '请先暂停时间并处理完当前事件，再雇农工。' };
  const amount = Math.floor(Number(count));
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, message: '雇工人数必须大于0。' };
  const ag = ensureAgriculture(state);
  if (ag.hiredWorkers + amount > V13_RULES.MAX_HIRED_WORKERS) return { ok: false, message: `当前最多雇${V13_RULES.MAX_HIRED_WORKERS}名农工。` };
  const cost = amount * V13_RULES.HIRED_WORKER_MONTHLY_WAGE;
  if (Number(state.resources?.money || 0) < cost) return { ok: false, message: `先付本月工钱需要${cost}钱。` };
  state.resources.money = round1(Number(state.resources.money) - cost);
  ag.hiredWorkers += amount;
  ag.lastWageMonthKey = `${state.year}-${state.month}`;
  syncHouseholdResources(state);
  addLog(state, 'choice', '雇请农工', `先付${cost}钱，雇请${amount}名农工。每人可稳定负责${V13_RULES.HIRED_WORKER_ACRES}亩田。`);
  return { ok: true, count: amount, cost, hiredWorkers: ag.hiredWorkers, message: `已雇${amount}名农工，本月工钱${cost}钱。` };
}

export function dismissFarmWorkers(state, count = 1) {
  if (!canManageFarmEconomy(state)) return { ok: false, message: '请先暂停时间并处理完当前事件，再调整农工。' };
  const ag = ensureAgriculture(state);
  const amount = clamp(Math.floor(Number(count) || 0), 0, ag.hiredWorkers);
  if (amount < 1) return { ok: false, message: '当前没有可解雇的农工。' };
  ag.hiredWorkers -= amount;
  addLog(state, 'choice', '遣散农工', `遣散${amount}名农工，现有${ag.hiredWorkers}名。`);
  return { ok: true, count: amount, hiredWorkers: ag.hiredWorkers, message: `已遣散${amount}名农工。` };
}

export function settleMonthlyFarmWages(state) {
  const ag = ensureAgriculture(state);
  const monthKey = `${state.year}-${state.month}`;
  if (!ag || ag.lastWageMonthKey === monthKey) return { charged: 0, paidWorkers: ag?.hiredWorkers || 0, dismissedWorkers: 0 };
  ag.lastWageMonthKey = monthKey;
  const workers = ag.hiredWorkers;
  if (!workers) return { charged: 0, paidWorkers: 0, dismissedWorkers: 0 };
  const money = Math.max(0, Number(state.resources?.money || 0));
  const affordable = Math.min(workers, Math.floor(money / V13_RULES.HIRED_WORKER_MONTHLY_WAGE));
  const charged = affordable * V13_RULES.HIRED_WORKER_MONTHLY_WAGE;
  const dismissedWorkers = workers - affordable;
  state.resources.money = round1(money - charged);
  ag.hiredWorkers = affordable;
  syncHouseholdResources(state);
  if (charged > 0) addLog(state, 'economy', '支付农工月钱', `支付${charged}钱，留下${affordable}名农工。`);
  if (dismissedWorkers > 0) addLog(state, 'warning', '农工离散', `钱不足，${dismissedWorkers}名农工离开田庄。`);
  return { charged, paidWorkers: affordable, dismissedWorkers };
}

export function getGrainSellPrice(state) {
  const market = Math.max(0.5, Number(state?.grainPrice || 1));
  return round1(clamp(0.55 + (market - 1) * 0.18, 0.4, 2.5));
}

export function sellGrain(state, amount) {
  if (!canManageFarmEconomy(state)) return { ok: false, message: '请先暂停时间并处理完当前事件，再出售粮食。' };
  const quantity = Math.floor(Number(amount));
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, message: '出售数量必须大于0。' };
  if (Number(state.resources?.grain || 0) < quantity) return { ok: false, message: `粮仓不足${quantity}粮。` };
  const unitPrice = getGrainSellPrice(state);
  const revenue = round1(quantity * unitPrice);
  state.resources.grain = round1(Number(state.resources.grain) - quantity);
  state.resources.money = round1(Number(state.resources.money || 0) + revenue);
  syncHouseholdResources(state);
  addLog(state, 'economy', '出售余粮', `卖出${quantity}粮，按每粮${unitPrice}钱，共得${revenue}钱。`);
  return { ok: true, amount: quantity, unitPrice, revenue, message: `卖出${quantity}粮，收入${revenue}钱。` };
}

function seededUnit(seed, year, season) {
  const seasonIndex = { spring: 11, summer: 23, autumn: 37, winter: 53 }[season] || 7;
  let value = ((Number(seed) || 1) ^ Math.imul(Number(year) || 0, 2654435761) ^ Math.imul(seasonIndex, 2246822519)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 2246822507) >>> 0;
  value ^= value >>> 13;
  value = Math.imul(value, 3266489909) >>> 0;
  value ^= value >>> 16;
  return value / 4294967296;
}

function weatherTemplate(season, severity, variant) {
  if (severity === 'normal') return { severity, type: 'normal', label: '风候平稳', yieldModifier: 1, mitigated: false };
  if (season === 'spring') return severity === 'major'
    ? { severity, type: 'frost', label: '倒春寒', yieldModifier: 0.68, mitigated: false }
    : { severity, type: 'cold', label: '春寒偏重', yieldModifier: 0.9, mitigated: false };
  if (season === 'summer') {
    const drought = variant < 0.5;
    if (severity === 'major') return drought
      ? { severity, type: 'drought', label: '大旱', yieldModifier: 0.55, mitigated: false }
      : { severity, type: 'flood', label: '大水', yieldModifier: 0.58, mitigated: false };
    return drought
      ? { severity, type: 'dry', label: '夏旱', yieldModifier: 0.86, mitigated: false }
      : { severity, type: 'rain', label: '雨水偏多', yieldModifier: 0.88, mitigated: false };
  }
  if (season === 'autumn') return severity === 'major'
    ? { severity, type: 'locust', label: '蝗灾', yieldModifier: 0.5, mitigated: false }
    : { severity, type: 'wet-harvest', label: '秋雨连绵', yieldModifier: 0.87, mitigated: false };
  return severity === 'major'
    ? { severity, type: 'winter-storm', label: '严寒暴雪', yieldModifier: 1, mitigated: false }
    : { severity, type: 'cold-winter', label: '冬寒', yieldModifier: 1, mitigated: false };
}

export function rollSeasonWeather(state) {
  const ag = ensureAgriculture(state);
  const season = getSeason(state.month);
  const key = `${state.year}-${season}`;
  if (ag.weather[key]) return ag.weather[key];
  const roll = seededUnit(state.seed, state.year, season);
  const variant = seededUnit((Number(state.seed) || 1) + 97, state.year, season);
  const severity = roll < 0.08 ? 'major' : roll < 0.24 ? 'minor' : 'normal';
  const weather = weatherTemplate(season, severity, variant);
  ag.weather[key] = weather;
  if (severity === 'normal') {
    addLog(state, 'message', `${getSeasonLabel(state.month)}风候`, `${weather.label}，暂未出现明显灾情。`);
  } else if (severity === 'minor') {
    addLog(state, 'message', weather.label, `本季出现${weather.label}，预计会轻度影响今年收成。时间继续流逝。`);
  } else if (!state.pendingEvent) {
    state.pendingEvent = {
      id: `agri-${key}`,
      source: 'agriculture-major',
      title: weather.label,
      text: `${weather.label}正在威胁田庄，今年收成可能大幅下降。是否投入钱财抢救农田？`,
      options: [
        { id: 'mitigate', label: '投入钱财救田', consequence: '钱 -12，显著减轻减产', cost: 12 },
        { id: 'accept', label: '承受减产', consequence: '不花钱，但维持当前灾害损失', cost: 0 }
      ]
    };
    state.running = false;
    state.pauseReason = `重大天灾：${weather.label}`;
    addLog(state, 'warning', `重大天灾 · ${weather.label}`, '灾情足以改变今年的粮食走势，时间自动暂停等待处置。');
  }
  return weather;
}

export function resolveAgricultureEvent(state, eventId, optionId) {
  const event = state?.pendingEvent;
  if (!event || event.source !== 'agriculture-major' || event.id !== eventId) return { ok: false, message: '没有对应的农业灾害事件。' };
  const option = event.options?.find(item => item.id === optionId);
  if (!option) return { ok: false, message: '没有这个处置选项。' };
  const cost = Number(option.cost || 0);
  if (Number(state.resources?.money || 0) < cost) return { ok: false, message: `需要${cost}钱才能采取这项措施。` };
  const key = event.id.replace(/^agri-/, '');
  const weather = ensureAgriculture(state).weather[key];
  if (cost > 0) state.resources.money = round1(Number(state.resources.money) - cost);
  if (optionId === 'mitigate' && weather) {
    weather.mitigated = true;
    weather.yieldModifier = round1(Math.min(0.85, Number(weather.yieldModifier || 1) + 0.25));
    addLog(state, 'choice', '抢救农田', `投入${cost}钱应对${weather.label}，预计减产幅度得到缓解。`);
  } else {
    addLog(state, 'choice', '承受灾情', `家门没有额外投入，${weather?.label || '灾情'}造成的减产将由今年秋收承担。`);
  }
  state.pendingEvent = null;
  state.pauseReason = '重大天灾已经处置，可继续时间';
  syncHouseholdResources(state);
  return { ok: true, message: optionId === 'mitigate' ? '已经投入钱财抢救农田。' : '已决定承受本季减产。' };
}

function currentHarvestTotal(state) {
  const ag = ensureAgriculture(state);
  const capacity = getTotalFarmCapacity(state);
  const land = Math.max(0, Number(state.household?.land || 0));
  const productiveAcres = Math.min(land, capacity);
  const sownAcres = Math.min(productiveAcres, ag.sownAcres || productiveAcres);
  const tendedAcres = Math.min(sownAcres, ag.tendedAcres || sownAcres);
  const springQuality = clamp(ag.springWorkDays / V13_RULES.SPRING_WORK_DAYS, 0, 1);
  const summerQuality = clamp(ag.summerWorkDays / V13_RULES.SUMMER_WORK_DAYS, 0, 1);
  return round1(tendedAcres * V13_RULES.BASE_YIELD_PER_MU * springQuality * summerQuality * weatherModifierForYear(state, Number(state.year)));
}

export function recordCultivationDay(state) {
  const ag = ensureAgriculture(state);
  const season = getSeason(state.month);
  const productiveAcres = Math.min(Math.max(0, Number(state.household?.land || 0)), getTotalFarmCapacity(state));
  if (productiveAcres <= 0) return { season, productiveAcres: 0, grainHarvested: 0, message: '没有可有效耕作的田地。' };

  rollSeasonWeather(state);

  if (season === 'spring') {
    ag.springWorkDays = Math.min(V13_RULES.SPRING_WORK_DAYS, ag.springWorkDays + 1);
    ag.sownAcres = Math.max(ag.sownAcres, productiveAcres);
    return { season, productiveAcres, grainHarvested: 0, message: `春耕 ${ag.springWorkDays}/${V13_RULES.SPRING_WORK_DAYS}日` };
  }
  if (season === 'summer') {
    ag.summerWorkDays = Math.min(V13_RULES.SUMMER_WORK_DAYS, ag.summerWorkDays + 1);
    ag.tendedAcres = Math.max(ag.tendedAcres, Math.min(ag.sownAcres || productiveAcres, productiveAcres));
    return { season, productiveAcres, grainHarvested: 0, message: `夏管 ${ag.summerWorkDays}/${V13_RULES.SUMMER_WORK_DAYS}日` };
  }
  if (season === 'autumn') {
    if (ag.harvestedYear === Number(state.year) || ag.harvestWorkDays >= V13_RULES.HARVEST_WORK_DAYS) return { season, productiveAcres, grainHarvested: 0, message: '今年秋粮已经收完。' };
    if (!ag.harvestPlan) {
      ag.harvestPlan = { total: currentHarvestTotal(state), remaining: currentHarvestTotal(state) };
    }
    ag.harvestWorkDays += 1;
    const daysLeftBefore = V13_RULES.HARVEST_WORK_DAYS - ag.harvestWorkDays + 1;
    const grainHarvested = round1(daysLeftBefore > 0 ? ag.harvestPlan.remaining / daysLeftBefore : ag.harvestPlan.remaining);
    ag.harvestPlan.remaining = round1(Math.max(0, ag.harvestPlan.remaining - grainHarvested));
    ag.harvestedGrain = round1(ag.harvestedGrain + grainHarvested);
    state.resources.grain = round1(Number(state.resources.grain || 0) + grainHarvested);
    syncHouseholdResources(state);
    if (ag.harvestWorkDays >= V13_RULES.HARVEST_WORK_DAYS) {
      ag.harvestedYear = Number(state.year);
      addLog(state, 'economy', '秋收入仓', `今年秋收完成，共收得约${ag.harvestedGrain}粮。`);
    }
    return { season, productiveAcres, grainHarvested, message: `秋收 ${ag.harvestWorkDays}/${V13_RULES.HARVEST_WORK_DAYS}日，本日入仓${grainHarvested}粮` };
  }
  return { season, productiveAcres, grainHarvested: 0, message: '冬季以休整、储粮和修农具为主，没有新粮收获。' };
}

export function isMinorMessageEvent(event) {
  return Boolean(event && MINOR_MESSAGE_TITLES.has(event.title));
}

export function convertPendingMinorEventToMessage(state) {
  const event = state?.pendingEvent;
  if (!isMinorMessageEvent(event)) return false;
  addLog(state, 'message', event.title, `${event.text || event.title}（记入家书，时间继续，不需要停下来选择。）`);
  state.pendingEvent = null;
  state.pauseReason = null;
  state.running = true;
  return true;
}
