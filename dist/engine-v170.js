import * as Base from './engine-v169.js?v=1.6.9';

export * from './engine-v169.js?v=1.6.9';

export const V170_BUSINESSES = Object.freeze({
  mill: Object.freeze({ id: 'mill', label: '磨坊', price: 120, dailyIncome: 0.4 }),
  grainShop: Object.freeze({ id: 'grainShop', label: '粮铺', price: 180, dailyIncome: 0.7 }),
  clothShop: Object.freeze({ id: 'clothShop', label: '布庄', price: 300, dailyIncome: 1.2 }),
  oilMill: Object.freeze({ id: 'oilMill', label: '油坊', price: 450, dailyIncome: 1.8 }),
  caravan: Object.freeze({ id: 'caravan', label: '商队', price: 600, dailyIncome: 2.5 }),
  brewery: Object.freeze({ id: 'brewery', label: '酒坊', price: 800, dailyIncome: 3.4 }),
  inn: Object.freeze({ id: 'inn', label: '客栈', price: 1200, dailyIncome: 5.2 }),
  weavingWorkshop: Object.freeze({ id: 'weavingWorkshop', label: '织坊', price: 1800, dailyIncome: 8 }),
  paperWorkshop: Object.freeze({ id: 'paperWorkshop', label: '纸坊', price: 2400, dailyIncome: 11 }),
  shippingFleet: Object.freeze({ id: 'shippingFleet', label: '水运船队', price: 5000, dailyIncome: 23 })
});

export const V170_STAGE_ORDER = Object.freeze([
  'landPurchase',
  'mill',
  'grainShop',
  'clothShop',
  'oilMill',
  'caravan',
  'brewery',
  'inn',
  'weavingWorkshop',
  'paperWorkshop',
  'shippingFleet'
]);

const NEW_STAGE_ORDER = Object.freeze([
  'mill', 'oilMill', 'brewery', 'inn', 'weavingWorkshop', 'paperWorkshop', 'shippingFleet'
]);
const LEGACY_STAGE_ORDER = Object.freeze(['landPurchase', 'grainShop', 'clothShop', 'caravan']);
const NEW_BUSINESS_IDS = Object.freeze(['mill', 'oilMill', 'brewery', 'inn', 'weavingWorkshop', 'paperWorkshop', 'shippingFleet']);

export const V170_UNLOCKS = Object.freeze({
  mill: Object.freeze({ land: 3, assetValue: 180, reward: 20 }),
  oilMill: Object.freeze({ assetValue: 1000, requiresBusiness: 'grainShop', reward: 80 }),
  brewery: Object.freeze({ assetValue: 2200, reputation: 10, requiresBusiness: 'grainShop', reward: 120 }),
  inn: Object.freeze({ assetValue: 3500, requiresBusiness: 'caravan', reward: 180 }),
  weavingWorkshop: Object.freeze({ assetValue: 5500, requiresBusiness: 'clothShop', reward: 250 }),
  paperWorkshop: Object.freeze({ assetValue: 8000, knowledge: 30, reward: 350 }),
  shippingFleet: Object.freeze({ assetValue: 15000, reputation: 20, caravanCount: 2, reward: 600 })
});

const STAGE_META = Object.freeze({
  mill: Object.freeze({ label: '磨坊', storyTitle: '石磨转起来', story: '家中田地渐多，乡里也有人愿意送粮来磨。村口那间闲置的磨坊，终于成了家里能考虑的一门生意。' }),
  oilMill: Object.freeze({ label: '油坊', storyTitle: '榨坊开张', story: '粮铺站稳后，往来农户越来越多。经营油坊可以把家业从粮食买卖继续向加工生意延伸。' }),
  brewery: Object.freeze({ label: '酒坊', storyTitle: '酒香入巷', story: '家中已有粮路与名望，熟客愿意把酿酒的手艺和销路带进家门，酒坊由此开放。' }),
  inn: Object.freeze({ label: '客栈', storyTitle: '商旅有了落脚处', story: '商队往来渐熟，沿途客商常向你打听落脚之处。有人愿意转让一间客栈，家里的生意又多了一条路。' }),
  weavingWorkshop: Object.freeze({ label: '织坊', storyTitle: '机杼成行', story: '布庄带来了稳定客源，织工也愿意前来投靠。家门可以从卖布继续发展到织坊。' }),
  paperWorkshop: Object.freeze({ label: '纸坊', storyTitle: '读书也能开出新家业', story: '这些年读书识字，你对纸张的好坏与用途已有认识。经熟人引荐，几位纸匠愿意帮你经营纸坊。' }),
  shippingFleet: Object.freeze({ label: '水运船队', storyTitle: '货通江河', story: '家产、名望与商队都已成规模，沿江商人愿意与你合资经营水运船队，家业开始跨越更远的水路。' })
});

export const V170_MILESTONES = Object.freeze({
  firstHarvest: Object.freeze({ id: 'firstHarvest', label: '初收喜报', kind: 'harvest', required: 50, unit: '粮', reward: 15 }),
  land10: Object.freeze({ id: 'land10', label: '田庄初成', kind: 'land', required: 10, unit: '亩', reward: 40 }),
  land30: Object.freeze({ id: 'land30', label: '田连阡陌', kind: 'land', required: 30, unit: '亩', reward: 120 }),
  income1: Object.freeze({ id: 'income1', label: '小有进项', kind: 'income', required: 1, unit: '钱/日', reward: 20 }),
  income5: Object.freeze({ id: 'income5', label: '经营有成', kind: 'income', required: 5, unit: '钱/日', reward: 60 }),
  income10: Object.freeze({ id: 'income10', label: '日进十钱', kind: 'income', required: 10, unit: '钱/日', reward: 120 }),
  income30: Object.freeze({ id: 'income30', label: '生意兴隆', kind: 'income', required: 30, unit: '钱/日', reward: 300 }),
  asset500: Object.freeze({ id: 'asset500', label: '小康之家', kind: 'asset', required: 500, unit: '钱', reward: 30 }),
  asset2000: Object.freeze({ id: 'asset2000', label: '家底渐厚', kind: 'asset', required: 2000, unit: '钱', reward: 80 }),
  asset5000: Object.freeze({ id: 'asset5000', label: '家资丰足', kind: 'asset', required: 5000, unit: '钱', reward: 150 }),
  asset20000: Object.freeze({ id: 'asset20000', label: '富甲乡里', kind: 'asset', required: 20000, unit: '钱', reward: 500 }),
  knowledge20: Object.freeze({ id: 'knowledge20', label: '初通文墨', kind: 'knowledge', required: 20, unit: '学识', reward: 30 }),
  knowledge40: Object.freeze({ id: 'knowledge40', label: '学有所成', kind: 'knowledge', required: 40, unit: '学识', reward: 80 }),
  reputation15: Object.freeze({ id: 'reputation15', label: '乡里扬名', kind: 'reputation', required: 15, unit: '声望', reward: 30 }),
  reputation30: Object.freeze({ id: 'reputation30', label: '声名远播', kind: 'reputation', required: 30, unit: '声望', reward: 100 })
});

const MILESTONE_ORDER = Object.freeze(Object.keys(V170_MILESTONES));
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;
const round1 = value => Math.round((Number(value) || 0) * 10) / 10;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function syncMoney(state) {
  state.resources.money = round2(state.resources.money || 0);
  if (state.household) state.household.money = state.resources.money;
}

function recordOtherIncome(state, amount) {
  const currentLedger = Base.ledger?.(state);
  if (!currentLedger) return;
  currentLedger.otherMoney = round2(Number(currentLedger.otherMoney || 0) + Number(amount || 0));
}

function primaryHousehold(state) {
  return state?.family?.households?.[0] || null;
}

function ensureAllBusinesses(state) {
  const industry = Base.ensureIndustry?.(state) || (state.industry ??= { businesses: {} });
  industry.businesses ??= {};
  for (const id of Object.keys(V170_BUSINESSES)) {
    industry.businesses[id] = Math.max(0, Math.floor(Number(industry.businesses[id]) || 0));
  }
  industry.v170 = true;
  industry.lastDailyIncome = round1(industry.lastDailyIncome || 0);
  industry.lifetimeIncome = round1(industry.lifetimeIncome || 0);
  return industry;
}

export function ensureIndustry(state) {
  return ensureAllBusinesses(state);
}

function countBusinessTypes(state) {
  const businesses = ensureAllBusinesses(state)?.businesses || {};
  return Object.keys(V170_BUSINESSES).filter(id => Number(businesses[id] || 0) > 0).length;
}

function protagonist(state) {
  return state?.people?.[state?.playerId] || null;
}

function knowledge(state) {
  return Math.max(0, Number(protagonist(state)?.skills?.knowledge || 0));
}

function reputation(state) {
  return Math.max(0, Number(state?.resources?.reputation || 0));
}

function assetValue(state) {
  return round2(Base.getHouseholdAssetValue(state));
}

function numericCondition(label, current, required, unit = '') {
  const value = round2(current);
  const need = round2(required);
  return { label, current: value, required: need, unit, met: value >= need, remaining: round2(Math.max(0, need - value)) };
}

function businessCondition(label, value, required = 1, unit = '') {
  return numericCondition(label, Math.max(0, Number(value || 0)), required, unit);
}

function conditionsForStage(state, id) {
  const businesses = ensureAllBusinesses(state).businesses;
  const assets = assetValue(state);
  const land = Math.max(0, Number(state.household?.land || 0));
  if (id === 'caravan') return [
    numericCondition('家产', assets, 1500, '钱'),
    numericCondition('商业产业种类', countBusinessTypes(state), 2, '种')
  ];
  if (id === 'mill') return [numericCondition('田地', land, 3, '亩'), numericCondition('家产', assets, 180, '钱')];
  if (id === 'oilMill') return [numericCondition('家产', assets, 1000, '钱'), businessCondition('已有粮铺', businesses.grainShop)];
  if (id === 'brewery') return [numericCondition('家产', assets, 2200, '钱'), numericCondition('声望', reputation(state), 10, ''), businessCondition('已有粮铺', businesses.grainShop)];
  if (id === 'inn') return [numericCondition('家产', assets, 3500, '钱'), businessCondition('已有商队', businesses.caravan)];
  if (id === 'weavingWorkshop') return [numericCondition('家产', assets, 5500, '钱'), businessCondition('已有布庄', businesses.clothShop)];
  if (id === 'paperWorkshop') return [numericCondition('家产', assets, 8000, '钱'), numericCondition('本人学识', knowledge(state), 30, '')];
  if (id === 'shippingFleet') return [numericCondition('家产', assets, 15000, '钱'), numericCondition('声望', reputation(state), 20, ''), numericCondition('已有商队', businesses.caravan, 2, '支')];
  return [];
}

function ensureV170Progression(state, { migration = false } = {}) {
  if (!state) return null;
  const old = state.v170Progression;
  if (old?.version === 170 && old.unlocked) {
    old.rewardClaimed ??= {};
    old.history = Array.isArray(old.history) ? old.history : [];
    old.rewardHistory = Array.isArray(old.rewardHistory) ? old.rewardHistory : [];
    old.totalGranted = round2(old.totalGranted || 0);
    for (const id of NEW_STAGE_ORDER) {
      old.unlocked[id] = Boolean(old.unlocked[id]);
      old.rewardClaimed[id] = Boolean(old.rewardClaimed[id]);
    }
    return old;
  }
  const businesses = ensureAllBusinesses(state)?.businesses || {};
  const progression = {
    version: 170,
    unlocked: {},
    rewardClaimed: {},
    history: [],
    rewardHistory: [],
    totalGranted: 0,
    lastUnlock: null,
    lastReward: null
  };
  for (const id of NEW_STAGE_ORDER) {
    progression.unlocked[id] = migration && Number(businesses[id] || 0) > 0;
    progression.rewardClaimed[id] = progression.unlocked[id];
  }
  state.v170Progression = progression;
  return progression;
}

function newStageStatus(state, id) {
  const progression = ensureV170Progression(state);
  const meta = STAGE_META[id];
  const conditions = conditionsForStage(state, id);
  return {
    id,
    label: meta.label,
    storyTitle: meta.storyTitle,
    story: meta.story,
    unlocked: Boolean(progression.unlocked[id]),
    conditions,
    allConditionsMet: conditions.length > 0 && conditions.every(item => item.met),
    rewardMoney: V170_UNLOCKS[id].reward,
    rewardClaimed: Boolean(progression.rewardClaimed[id])
  };
}

function grantNewStageReward(state, id) {
  const progression = ensureV170Progression(state);
  if (!progression.unlocked[id] || progression.rewardClaimed[id]) return null;
  const amount = Number(V170_UNLOCKS[id]?.reward || 0);
  progression.rewardClaimed[id] = true;
  if (amount <= 0) return null;
  state.resources.money = round2(Number(state.resources.money || 0) + amount);
  syncMoney(state);
  recordOtherIncome(state, amount);
  const record = { id, label: STAGE_META[id].label, money: amount, year: state.year, month: state.month, day: state.day };
  progression.rewardHistory.push(record);
  progression.totalGranted = round2(progression.totalGranted + amount);
  progression.lastReward = record;
  addLog(state, 'reward', '家业解锁奖励', `${record.label}已解锁，家中获得一次性解锁奖励 +${amount}钱。`);
  return record;
}

function unlockNewStage(state, id) {
  const progression = ensureV170Progression(state);
  if (progression.unlocked[id]) return null;
  const status = newStageStatus(state, id);
  if (!status.allConditionsMet) return null;
  progression.unlocked[id] = true;
  const meta = STAGE_META[id];
  const record = { id, label: meta.label, title: meta.storyTitle, text: meta.story, year: state.year, month: state.month, day: state.day };
  progression.history.push(record);
  progression.lastUnlock = record;
  addLog(state, 'unlock', meta.storyTitle, `${meta.story}【解锁：${meta.label}】`);
  return record;
}

function forceExtendedCaravanUnlock(state) {
  const current = Base.getHouseholdUnlockStatus(state);
  if (current?.caravan?.unlocked) return { changed: false, status: current };
  const conditions = conditionsForStage(state, 'caravan');
  if (!conditions.every(item => item.met)) return { changed: false, status: current };
  const progression = state.householdProgression;
  if (!progression?.unlocked) return { changed: false, status: current };
  progression.unlocked.caravan = true;
  const record = {
    id: 'caravan', label: '商队', title: '行商邀约',
    text: '家业已经不再局限于一处田庄或铺面。多路商户愿意与你合伙组织远行商队，家门正式迈入更大的商路。',
    year: state.year, month: state.month, day: state.day
  };
  progression.unlockHistory ??= [];
  if (!progression.unlockHistory.some(item => item?.id === 'caravan')) progression.unlockHistory.push(record);
  progression.lastUnlock = record;
  addLog(state, 'unlock', record.title, `${record.text}【解锁：商队】`);
  return { changed: true, status: Base.getHouseholdUnlockStatus(state) };
}

function ensureAchievements(state, { migration = false } = {}) {
  if (!state) return null;
  const existing = state.v170Achievements;
  if (existing?.version === 170 && existing.claimed) {
    existing.history = Array.isArray(existing.history) ? existing.history : [];
    existing.totalGranted = round2(existing.totalGranted || 0);
    existing.harvestBaseline = Math.max(0, Number(existing.harvestBaseline || 0));
    for (const id of MILESTONE_ORDER) existing.claimed[id] = Boolean(existing.claimed[id]);
    return existing;
  }
  const achievements = {
    version: 170,
    claimed: Object.fromEntries(MILESTONE_ORDER.map(id => [id, false])),
    history: [],
    totalGranted: 0,
    lastReward: null,
    harvestBaseline: migration ? Math.max(0, Number(state.agriculture?.harvestedGrain || 0)) : 0
  };
  state.v170Achievements = achievements;
  return achievements;
}

function milestoneCurrent(state, definition) {
  if (definition.kind === 'harvest') {
    const achievements = ensureAchievements(state);
    return Math.max(0, Number(state.agriculture?.harvestedGrain || 0) - Number(achievements.harvestBaseline || 0));
  }
  if (definition.kind === 'land') return Math.max(0, Number(state.household?.land || 0));
  if (definition.kind === 'income') return getIndustrySummary(state).dailyIncome;
  if (definition.kind === 'asset') return assetValue(state);
  if (definition.kind === 'knowledge') return knowledge(state);
  if (definition.kind === 'reputation') return reputation(state);
  return 0;
}

function milestoneStatus(state, definition) {
  const achievements = ensureAchievements(state);
  const current = round2(milestoneCurrent(state, definition));
  const required = Number(definition.required || 0);
  return {
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    current,
    required,
    unit: definition.unit,
    met: current >= required,
    remaining: round2(Math.max(0, required - current)),
    claimed: Boolean(achievements.claimed[definition.id]),
    rewardMoney: definition.reward
  };
}

function grantMilestone(state, definition) {
  const achievements = ensureAchievements(state);
  if (achievements.claimed[definition.id]) return null;
  const status = milestoneStatus(state, definition);
  if (!status.met) return null;
  achievements.claimed[definition.id] = true;
  const amount = Number(definition.reward || 0);
  if (amount > 0) {
    state.resources.money = round2(Number(state.resources.money || 0) + amount);
    syncMoney(state);
    recordOtherIncome(state, amount);
  }
  const record = { id: definition.id, label: definition.label, money: amount, year: state.year, month: state.month, day: state.day };
  achievements.history.push(record);
  achievements.totalGranted = round2(achievements.totalGranted + amount);
  achievements.lastReward = record;
  addLog(state, 'reward', `经营成就 · ${definition.label}`, `达成“${definition.label}”，家中获得一次性成就奖励 +${amount}钱。`);
  return record;
}

function settleV170Progression(state) {
  ensureAllBusinesses(state);
  ensureV170Progression(state);
  ensureAchievements(state);
  const newStages = [];
  const newStageRewards = [];
  const newMilestones = [];
  const oldNewlyUnlocked = [];
  const oldRewards = [];
  let legacyStatus = Base.getHouseholdUnlockStatus(state);
  for (const id of legacyStatus?.newlyUnlocked || []) oldNewlyUnlocked.push(id);
  for (const item of legacyStatus?.newRewards || []) oldRewards.push(item);

  for (let pass = 0; pass < 20; pass += 1) {
    let changed = false;
    const forced = forceExtendedCaravanUnlock(state);
    if (forced.changed) {
      changed = true;
      legacyStatus = forced.status;
      oldNewlyUnlocked.push('caravan');
      for (const item of legacyStatus?.newRewards || []) oldRewards.push(item);
    } else legacyStatus = forced.status;

    for (const id of NEW_STAGE_ORDER) {
      const unlocked = unlockNewStage(state, id);
      if (unlocked) { newStages.push(id); changed = true; }
      const reward = grantNewStageReward(state, id);
      if (reward) { newStageRewards.push(reward); changed = true; }
    }

    for (const id of MILESTONE_ORDER) {
      const reward = grantMilestone(state, V170_MILESTONES[id]);
      if (reward) { newMilestones.push(reward); changed = true; }
    }

    if (!changed) break;
    legacyStatus = Base.getHouseholdUnlockStatus(state);
    for (const id of legacyStatus?.newlyUnlocked || []) oldNewlyUnlocked.push(id);
    for (const item of legacyStatus?.newRewards || []) oldRewards.push(item);
  }

  const progression = ensureV170Progression(state);
  const achievements = ensureAchievements(state);
  const allRewards = [...oldRewards, ...newStageRewards, ...newMilestones];
  const combined = { ...legacyStatus };
  combined.caravan = {
    ...legacyStatus.caravan,
    conditions: conditionsForStage(state, 'caravan'),
    allConditionsMet: conditionsForStage(state, 'caravan').every(item => item.met)
  };
  for (const id of NEW_STAGE_ORDER) combined[id] = newStageStatus(state, id);
  combined.stageOrder = [...V170_STAGE_ORDER];
  combined.milestones = MILESTONE_ORDER.map(id => milestoneStatus(state, V170_MILESTONES[id]));
  combined.newlyUnlocked = [...new Set([...oldNewlyUnlocked, ...newStages])];
  combined.newMilestones = newMilestones;
  combined.newRewards = allRewards;
  combined.newRewardMoney = round2(allRewards.reduce((sum, item) => sum + Number(item?.money || 0), 0));
  combined.totalRewardMoney = round2(Number(legacyStatus?.totalRewardMoney || 0) + Number(progression.totalGranted || 0) + Number(achievements.totalGranted || 0));
  combined.v170RewardMoney = round2(Number(progression.totalGranted || 0) + Number(achievements.totalGranted || 0));
  combined.assetValue = assetValue(state);
  expose(state);
  return combined;
}

export function getHouseholdUnlockStatus(state) {
  return settleV170Progression(state);
}

export function getIndustrySummary(state) {
  const industry = ensureAllBusinesses(state);
  const businesses = {};
  let dailyIncome = 0;
  for (const [id, definition] of Object.entries(V170_BUSINESSES)) {
    const count = Math.max(0, Number(industry.businesses[id] || 0));
    const totalDailyIncome = round1(count * definition.dailyIncome);
    dailyIncome += totalDailyIncome;
    businesses[id] = { ...definition, count, totalDailyIncome };
  }
  return {
    businesses,
    dailyIncome: round1(dailyIncome),
    lastDailyIncome: round1(industry.lastDailyIncome || 0),
    lifetimeIncome: round1(industry.lifetimeIncome || 0)
  };
}

function attachBusinessAsset(state, definition, count, cost) {
  state.assets ??= [];
  let item = state.assets.find(asset => asset?.businessType === definition.id);
  if (!item) {
    state.nextId = Number(state.nextId || 1);
    item = { id: `asset-${state.nextId++}`, type: '产业', businessType: definition.id, name: definition.label, units: 0, value: 0, location: state.region, ownerId: state.playerId };
    state.assets.push(item);
  }
  item.units = Math.max(0, Math.floor(Number(item.units) || 0)) + count;
  item.value = round1(Number(item.value || 0) + cost);
  item.name = item.units > 1 ? `${definition.label} ×${item.units}` : definition.label;
  const household = primaryHousehold(state);
  if (household) {
    household.assets ??= [];
    if (!household.assets.includes(item.id)) household.assets.push(item.id);
  }
  return item;
}

function missingRequirementMessage(stage) {
  const missing = (stage?.conditions || []).filter(item => !item.met);
  if (!missing.length) return `${stage?.label || '产业'}尚未解锁。`;
  return `${stage.label}尚未解锁：${missing.map(item => item.label.startsWith('已有') ? item.label : `${item.label}还差${item.remaining}${item.unit || ''}`).join('，')}。`;
}

export function buyBusiness(state, businessId, count = 1) {
  ensureAllBusinesses(state);
  const status = getHouseholdUnlockStatus(state);
  const stage = status[businessId];
  if (stage && !stage.unlocked) return { ok: false, message: missingRequirementMessage(stage) };
  if (LEGACY_STAGE_ORDER.includes(businessId)) {
    const result = Base.buyBusiness(state, businessId, count);
    if (result?.ok) settleV170Progression(state);
    return result;
  }
  const definition = V170_BUSINESSES[businessId];
  if (!definition) return { ok: false, message: '没有这种可购置产业。' };
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || state.running) return { ok: false, message: '时间暂停且没有待处理事件时才能购置产业。' };
  const amount = Number(count);
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) return { ok: false, message: '一次只能购置1至20份同类产业。' };
  const cost = round1(definition.price * amount);
  if (Number(state.resources.money || 0) < cost) return { ok: false, message: `购置${definition.label}需要${cost}钱。` };
  const industry = ensureAllBusinesses(state);
  state.resources.money = round2(Number(state.resources.money || 0) - cost);
  syncMoney(state);
  const currentLedger = Base.ledger?.(state);
  if (currentLedger) currentLedger.investment = round2(Number(currentLedger.investment || 0) + cost);
  industry.businesses[businessId] += amount;
  const item = attachBusinessAsset(state, definition, amount, cost);
  addLog(state, 'choice', `购置${definition.label}`, `花费${cost}钱购置${amount > 1 ? `${amount}份` : '1份'}${definition.label}，此类产业现有${industry.businesses[businessId]}份，每日合计产出${round1(industry.businesses[businessId] * definition.dailyIncome)}钱。`);
  const progressionStatus = settleV170Progression(state);
  return { ok: true, businessId, count: amount, cost, owned: industry.businesses[businessId], assetId: item.id, milestoneRewards: progressionStatus.newRewards, milestoneRewardMoney: progressionStatus.newRewardMoney, message: `已购置${definition.label}${amount > 1 ? ` ×${amount}` : ''}，花费${cost}钱。` };
}

function settleNewBusinessDailyIncome(state) {
  const industry = ensureAllBusinesses(state);
  let extra = 0;
  for (const id of NEW_BUSINESS_IDS) extra += Number(industry.businesses[id] || 0) * V170_BUSINESSES[id].dailyIncome;
  extra = round1(extra);
  if (extra > 0) {
    state.resources.money = round2(Number(state.resources.money || 0) + extra);
    syncMoney(state);
    recordOtherIncome(state, extra);
    industry.lifetimeIncome = round1(Number(industry.lifetimeIncome || 0) + extra);
  }
  industry.lastDailyIncome = getIndustrySummary(state).dailyIncome;
  return extra;
}

function prepareNew(state) {
  ensureAllBusinesses(state);
  ensureV170Progression(state, { migration: false });
  ensureAchievements(state, { migration: false });
  settleV170Progression(state);
  return expose(state);
}

function prepareLoaded(state, hadV170Progression, hadV170Achievements) {
  ensureAllBusinesses(state);
  ensureV170Progression(state, { migration: !hadV170Progression });
  ensureAchievements(state, { migration: !hadV170Achievements });
  settleV170Progression(state);
  return expose(state);
}

export function createGame(options) {
  return prepareNew(Base.createGame(options));
}

export function deserializeState(raw) {
  const state = Base.deserializeState(raw);
  const hadProgression = Number(state?.v170Progression?.version || 0) >= 170;
  const hadAchievements = Number(state?.v170Achievements?.version || 0) >= 170;
  return prepareLoaded(state, hadProgression, hadAchievements);
}

function settleMutation(state, result) {
  const status = settleV170Progression(state);
  if (!result || typeof result !== 'object' || !status.newRewardMoney) return result;
  return { ...result, milestoneRewards: status.newRewards, milestoneRewardMoney: status.newRewardMoney };
}

export function advanceDay(state) {
  ensureAllBusinesses(state);
  const before = Number(state?.elapsedDays || 0);
  const result = Base.advanceDay(state);
  if (!result?.ok) return result;
  if (Number(state?.elapsedDays || 0) > before) settleNewBusinessDailyIncome(state);
  return settleMutation(state, result);
}

export function buyLand(state, acres = 1) {
  return settleMutation(state, Base.buyLand(state, acres));
}

export function sellGrain(state, amount) {
  return settleMutation(state, Base.sellGrain(state, amount));
}

export function resolveEvent(state, eventId, optionId) {
  return settleMutation(state, Base.resolveEvent(state, eventId, optionId));
}

export function performGuardianAction(state, ...args) {
  return settleMutation(state, Base.performGuardianAction(state, ...args));
}

export function continueAs(state, personId) {
  return settleMutation(state, Base.continueAs(state, personId));
}

export const __v170Test = Object.freeze({ ensureV170Progression, ensureAchievements, settleV170Progression, countBusinessTypes });
