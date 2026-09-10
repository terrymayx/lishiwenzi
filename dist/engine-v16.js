import * as Base from './engine-v151.js?v=1.5.3';

export * from './engine-v151.js?v=1.5.3';

export const V160_BUSINESSES = Object.freeze({
  grainShop: Object.freeze({ id: 'grainShop', label: '粮铺', price: 180, dailyIncome: 0.7 }),
  clothShop: Object.freeze({ id: 'clothShop', label: '布庄', price: 300, dailyIncome: 1.2 }),
  caravan: Object.freeze({ id: 'caravan', label: '商队', price: 600, dailyIncome: 2.5 })
});

const round1 = value => Math.round((Number(value) || 0) * 10) / 10;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({
    year: state.year,
    month: state.month,
    day: state.day,
    kind,
    title,
    text
  });
}

function primaryHousehold(state) {
  return state?.family?.households?.[0] || null;
}

export function ensureIndustry(state) {
  if (!state) return null;
  state.industry ??= {};
  state.industry.version = 160;
  state.industry.businesses ??= {};
  for (const id of Object.keys(V160_BUSINESSES)) {
    const count = Math.max(0, Math.floor(Number(state.industry.businesses[id]) || 0));
    state.industry.businesses[id] = count;
  }
  state.industry.lastDailyIncome = round1(state.industry.lastDailyIncome);
  state.industry.lifetimeIncome = round1(state.industry.lifetimeIncome);
  return state.industry;
}

export function getIndustrySummary(state) {
  const industry = ensureIndustry(state);
  const businesses = {};
  let dailyIncome = 0;
  for (const [id, definition] of Object.entries(V160_BUSINESSES)) {
    const count = industry?.businesses?.[id] || 0;
    const totalDailyIncome = round1(count * definition.dailyIncome);
    dailyIncome += totalDailyIncome;
    businesses[id] = { ...definition, count, totalDailyIncome };
  }
  return {
    businesses,
    dailyIncome: round1(dailyIncome),
    lastDailyIncome: round1(industry?.lastDailyIncome),
    lifetimeIncome: round1(industry?.lifetimeIncome)
  };
}

function attachBusinessAsset(state, definition, count, cost) {
  state.assets ??= [];
  let asset = state.assets.find(item => item?.businessType === definition.id);
  if (!asset) {
    state.nextId = Number(state.nextId || 1);
    asset = {
      id: `asset-${state.nextId++}`,
      type: '产业',
      businessType: definition.id,
      name: definition.label,
      units: 0,
      value: 0,
      location: state.region,
      ownerId: state.playerId
    };
    state.assets.push(asset);
  }
  asset.units = Math.max(0, Math.floor(Number(asset.units) || 0)) + count;
  asset.value = round1((Number(asset.value) || 0) + cost);
  asset.name = asset.units > 1 ? `${definition.label} ×${asset.units}` : definition.label;

  const household = primaryHousehold(state);
  if (household) {
    household.assets ??= [];
    if (!household.assets.includes(asset.id)) household.assets.push(asset.id);
  }
  return asset;
}

export function buyBusiness(state, businessId, count = 1) {
  const definition = V160_BUSINESSES[businessId];
  if (!definition) return { ok: false, message: '没有这种可购置产业。' };
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || state.running) {
    return { ok: false, message: '时间暂停且没有待处理事件时才能购置产业。' };
  }
  const amount = Number(count);
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) {
    return { ok: false, message: '一次只能购置1至20份同类产业。' };
  }
  const cost = round1(definition.price * amount);
  const money = Number(state.resources?.money || 0);
  if (money < cost) return { ok: false, message: `购置${amount > 1 ? `${amount}份` : ''}${definition.label}需要${cost}钱。` };

  const industry = ensureIndustry(state);
  state.resources.money = round1(money - cost);
  if (state.household) state.household.money = state.resources.money;
  industry.businesses[businessId] += amount;
  const asset = attachBusinessAsset(state, definition, amount, cost);
  addLog(
    state,
    'choice',
    `购置${definition.label}`,
    `花费${cost}钱购置${amount > 1 ? `${amount}份` : '1份'}${definition.label}，此类产业现有${industry.businesses[businessId]}份，每日合计产出${round1(industry.businesses[businessId] * definition.dailyIncome)}钱。`
  );
  expose(state);
  return {
    ok: true,
    businessId,
    count: amount,
    cost,
    owned: industry.businesses[businessId],
    assetId: asset.id,
    message: `已购置${definition.label}${amount > 1 ? ` ×${amount}` : ''}，花费${cost}钱。`
  };
}

function settleDailyIndustryIncome(state) {
  const industry = ensureIndustry(state);
  const income = getIndustrySummary(state).dailyIncome;
  industry.lastDailyIncome = income;
  if (income <= 0) return 0;
  state.resources.money = round1(Number(state.resources?.money || 0) + income);
  if (state.household) state.household.money = state.resources.money;
  industry.lifetimeIncome = round1(industry.lifetimeIncome + income);
  return income;
}

function prepare(state) {
  ensureIndustry(state);
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
  const elapsedBefore = Number(state?.elapsedDays || 0);
  const result = Base.advanceDay(state);
  if (!result?.ok) return result;
  prepare(state);
  const elapsedAfter = Number(state?.elapsedDays || 0);
  if (elapsedAfter > elapsedBefore) settleDailyIndustryIncome(state);
  else if (state?.industry) state.industry.lastDailyIncome = 0;
  expose(state);
  return result;
}
