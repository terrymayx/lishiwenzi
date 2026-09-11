import * as Base from './engine-v169.js?v=1.6.9';

export * from './engine-v169.js?v=1.6.9';

export const V170_BUSINESSES = Object.freeze({
  mill: Object.freeze({ id: 'mill', label: '磨坊', price: 120, dailyIncome: 0.4 }),
  grainShop: Object.freeze({ id: 'grainShop', label: '粮铺', price: 180, dailyIncome: 0.7 }),
  clothShop: Object.freeze({ id: 'clothShop', label: '布庄', price: 300, dailyIncome: 1.2 }),
  oilPress: Object.freeze({ id: 'oilPress', label: '油坊', price: 450, dailyIncome: 1.8 }),
  caravan: Object.freeze({ id: 'caravan', label: '商队', price: 600, dailyIncome: 2.5 }),
  winery: Object.freeze({ id: 'winery', label: '酒坊', price: 800, dailyIncome: 3.4 }),
  inn: Object.freeze({ id: 'inn', label: '客栈', price: 1200, dailyIncome: 5.2 }),
  weavingWorkshop: Object.freeze({ id: 'weavingWorkshop', label: '织坊', price: 1800, dailyIncome: 8 }),
  paperMill: Object.freeze({ id: 'paperMill', label: '纸坊', price: 2400, dailyIncome: 11 }),
  waterFleet: Object.freeze({ id: 'waterFleet', label: '水运船队', price: 5000, dailyIncome: 23 })
});

export const V170_INDUSTRY_UNLOCKS = Object.freeze({
  mill: Object.freeze({ assetValue: 180, land: 3, reward: 20 }),
  oilPress: Object.freeze({ assetValue: 1000, requiresBusiness: 'grainShop', reward: 80 }),
  winery: Object.freeze({ assetValue: 2200, reputation: 10, requiresBusiness: 'grainShop', reward: 120 }),
  inn: Object.freeze({ assetValue: 3500, requiresBusiness: 'caravan', reward: 180 }),
  weavingWorkshop: Object.freeze({ assetValue: 5500, requiresBusiness: 'clothShop', reward: 250 }),
  paperMill: Object.freeze({ assetValue: 8000, knowledge: 30, reward: 350 }),
  waterFleet: Object.freeze({ assetValue: 15000, reputation: 20, caravanCount: 2, reward: 600 })
});

const NEW_BUSINESS_IDS = Object.freeze(['mill', 'oilPress', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet']);
const ORIGINAL_BUSINESS_IDS = Object.freeze(['grainShop', 'clothShop', 'caravan']);
const BUSINESS_ORDER = Object.freeze(Object.keys(V170_BUSINESSES));

const INDUSTRY_STORIES = Object.freeze({
  mill: Object.freeze({ title: '石磨转起来', text: '家中田地渐多，乡里也有人愿意送粮来磨。村口闲置的磨坊，终于成了你能考虑的一门生意。' }),
  oilPress: Object.freeze({ title: '油香出坊', text: '粮铺让你熟悉了乡里的买卖往来，榨油作坊也愿意把一门稳定生意交到你手里。' }),
  winery: Object.freeze({ title: '酒旗初立', text: '家业与名声渐起，粮食生意又给酒坊带来原料与客源，一面酒旗终于可以挂起来。' }),
  inn: Object.freeze({ title: '商旅有了落脚处', text: '商队往来渐熟，沿途客商常向你打听落脚之处。有人愿意转让一间客栈。' }),
  weavingWorkshop: Object.freeze({ title: '机杼成坊', text: '布庄带来稳定销路，几户织工愿意合在一处做活，家中的布业开始从铺面延伸到作坊。' }),
  paperMill: Object.freeze({ title: '读书开出新家业', text: '这些年读书识字，你对纸张的好坏与用途已有认识。经熟人引荐，几位纸匠愿意帮你经营纸坊。' }),
  waterFleet: Object.freeze({ title: '舟楫通商', text: '商路已经不只在陆上延伸。资金、声望与商队经验齐备后，你终于能把生意推上江河。' })
});

export const V170_MILESTONES = Object.freeze([
  Object.freeze({ id: 'firstHarvest', label: '初收喜报', type: 'harvest', threshold: 50, reward: 15, unit: '粮' }),
  Object.freeze({ id: 'land10', label: '田庄初成', type: 'land', threshold: 10, reward: 40, unit: '亩' }),
  Object.freeze({ id: 'land30', label: '田连阡陌', type: 'land', threshold: 30, reward: 120, unit: '亩' }),
  Object.freeze({ id: 'industry1', label: '小有进项', type: 'industryIncome', threshold: 1, reward: 20, unit: '钱/日' }),
  Object.freeze({ id: 'industry5', label: '经营有成', type: 'industryIncome', threshold: 5, reward: 60, unit: '钱/日' }),
  Object.freeze({ id: 'industry10', label: '日进十钱', type: 'industryIncome', threshold: 10, reward: 120, unit: '钱/日' }),
  Object.freeze({ id: 'industry30', label: '生意兴隆', type: 'industryIncome', threshold: 30, reward: 300, unit: '钱/日' }),
  Object.freeze({ id: 'assets500', label: '小康之家', type: 'assets', threshold: 500, reward: 30, unit: '钱' }),
  Object.freeze({ id: 'assets2000', label: '家底渐厚', type: 'assets', threshold: 2000, reward: 80, unit: '钱' }),
  Object.freeze({ id: 'assets5000', label: '家资丰足', type: 'assets', threshold: 5000, reward: 150, unit: '钱' }),
  Object.freeze({ id: 'assets20000', label: '富甲乡里', type: 'assets', threshold: 20000, reward: 500, unit: '钱' }),
  Object.freeze({ id: 'knowledge20', label: '初通文墨', type: 'knowledge', threshold: 20, reward: 30, unit: '' }),
  Object.freeze({ id: 'knowledge40', label: '学有所成', type: 'knowledge', threshold: 40, reward: 80, unit: '' }),
  Object.freeze({ id: 'reputation15', label: '乡里扬名', type: 'reputation', threshold: 15, reward: 30, unit: '' }),
  Object.freeze({ id: 'reputation30', label: '声名远播', type: 'reputation', threshold: 30, reward: 100, unit: '' })
]);

const round1 = value => Math.round((Number(value) || 0) * 10) / 10;
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;
const clampNonNegative = value => Math.max(0, Number(value) || 0);

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function currentPerson(state) {
  return state?.playerId ? state.people?.[state.playerId] : null;
}

function getKnowledge(state) {
  const person = currentPerson(state);
  return clampNonNegative(person?.skills?.knowledge ?? person?.knowledge ?? 0);
}

function getReputation(state) {
  return clampNonNegative(state?.resources?.reputation ?? state?.reputation ?? 0);
}

function primaryHousehold(state) {
  return state?.family?.households?.[0] || null;
}

function syncMoney(state) {
  if (!state?.resources) return;
  state.resources.money = round2(state.resources.money || 0);
  if (state.household) state.household.money = state.resources.money;
}

function recordRewardIncome(state, amount) {
  const ledger = Base.ledger?.(state);
  if (!ledger) return;
  ledger.otherMoney = round2((ledger.otherMoney || 0) + amount);
}

export function ensureV170Industry(state) {
  const industry = Base.ensureIndustry?.(state) || state?.industry;
  if (!state || !industry) return industry || null;
  state.industry.version = 170;
  state.industry.businesses ??= {};
  for (const id of BUSINESS_ORDER) {
    state.industry.businesses[id] = Math.max(0, Math.floor(Number(state.industry.businesses[id]) || 0));
  }
  state.industry.lastDailyIncome = round1(state.industry.lastDailyIncome || 0);
  state.industry.lifetimeIncome = round1(state.industry.lifetimeIncome || 0);
  return state.industry;
}

function ensureIndustryProgression(state) {
  if (!state) return null;
  const current = state.v170IndustryProgression;
  if (current?.version === 170 && current.unlocked && current.claimedRewards) {
    for (const id of NEW_BUSINESS_IDS) {
      current.unlocked[id] = Boolean(current.unlocked[id]);
      current.claimedRewards[id] = Boolean(current.claimedRewards[id]);
    }
    current.history = Array.isArray(current.history) ? current.history : [];
    current.rewardHistory = Array.isArray(current.rewardHistory) ? current.rewardHistory : [];
    current.totalRewardMoney = round2(current.totalRewardMoney || 0);
    current.lastUnlock ??= null;
    current.lastReward ??= null;
    return current;
  }
  state.v170IndustryProgression = {
    version: 170,
    unlocked: Object.fromEntries(NEW_BUSINESS_IDS.map(id => [id, false])),
    claimedRewards: Object.fromEntries(NEW_BUSINESS_IDS.map(id => [id, false])),
    history: [],
    rewardHistory: [],
    totalRewardMoney: 0,
    lastUnlock: null,
    lastReward: null
  };
  return state.v170IndustryProgression;
}

function ensureMilestoneState(state) {
  if (!state) return null;
  const current = state.v170Milestones;
  if (current?.version === 170 && current.claimed) {
    for (const item of V170_MILESTONES) current.claimed[item.id] = Boolean(current.claimed[item.id]);
    current.history = Array.isArray(current.history) ? current.history : [];
    current.totalRewardMoney = round2(current.totalRewardMoney || 0);
    current.lastReward ??= null;
    return current;
  }
  state.v170Milestones = {
    version: 170,
    claimed: Object.fromEntries(V170_MILESTONES.map(item => [item.id, false])),
    history: [],
    totalRewardMoney: 0,
    lastReward: null
  };
  return state.v170Milestones;
}

function ensureProgress(state) {
  if (!state) return null;
  state.v170Progress ??= { version: 170, harvestSince170: 0 };
  state.v170Progress.version = 170;
  state.v170Progress.harvestSince170 = round1(Math.max(0, Number(state.v170Progress.harvestSince170 || 0)));
  return state.v170Progress;
}

function prepare(state) {
  ensureV170Industry(state);
  ensureIndustryProgression(state);
  ensureMilestoneState(state);
  ensureProgress(state);
  return expose(state);
}

export function getIndustrySummary(state) {
  const industry = ensureV170Industry(state);
  const businesses = {};
  let dailyIncome = 0;
  for (const [id, definition] of Object.entries(V170_BUSINESSES)) {
    const count = Math.max(0, Number(industry?.businesses?.[id] || 0));
    const totalDailyIncome = round1(count * definition.dailyIncome);
    dailyIncome += totalDailyIncome;
    businesses[id] = { ...definition, count, totalDailyIncome };
  }
  return {
    businesses,
    dailyIncome: round1(dailyIncome),
    lastDailyIncome: round1(industry?.lastDailyIncome || 0),
    lifetimeIncome: round1(industry?.lifetimeIncome || 0)
  };
}

export function getOwnedBusinessTypeCount(state) {
  const industry = ensureV170Industry(state);
  return BUSINESS_ORDER.filter(id => Number(industry?.businesses?.[id] || 0) > 0).length;
}

function numericCondition(label, current, required, unit = '') {
  const value = round2(current);
  const need = round2(required);
  return { label, current: value, required: need, unit, met: value >= need, remaining: round2(Math.max(0, need - value)) };
}

function businessCondition(label, count, required = 1) {
  const current = Math.max(0, Number(count || 0));
  return { label, current, required, unit: required === 1 ? '' : '份', met: current >= required, remaining: Math.max(0, required - current) };
}

function v170IndustryConditions(state, id) {
  const def = V170_INDUSTRY_UNLOCKS[id];
  if (!def) return [];
  const assetValue = Base.getHouseholdAssetValue(state);
  const land = clampNonNegative(state?.household?.land || 0);
  const businesses = ensureV170Industry(state)?.businesses || {};
  const conditions = [];
  if (def.land) conditions.push(numericCondition('田地', land, def.land, '亩'));
  if (def.assetValue) conditions.push(numericCondition('家产', assetValue, def.assetValue, '钱'));
  if (def.reputation) conditions.push(numericCondition('声望', getReputation(state), def.reputation, ''));
  if (def.knowledge) conditions.push(numericCondition('本人学识', getKnowledge(state), def.knowledge, ''));
  if (def.requiresBusiness) conditions.push(businessCondition(`已有${V170_BUSINESSES[def.requiresBusiness]?.label || '前置产业'}`, businesses[def.requiresBusiness], 1));
  if (def.caravanCount) conditions.push(businessCondition('已有商队', businesses.caravan, def.caravanCount));
  return conditions;
}

function recordIndustryUnlock(state, id) {
  const progression = ensureIndustryProgression(state);
  if (!progression || progression.unlocked[id]) return null;
  const story = INDUSTRY_STORIES[id];
  const record = {
    id,
    label: V170_BUSINESSES[id].label,
    title: story?.title || `${V170_BUSINESSES[id].label}解锁`,
    text: story?.text || `家业达到新的阶段，${V170_BUSINESSES[id].label}已经开放。`,
    year: state.year,
    month: state.month,
    day: state.day
  };
  progression.unlocked[id] = true;
  progression.history.push(record);
  progression.lastUnlock = record;
  addLog(state, 'unlock', record.title, `${record.text}【解锁：${record.label}】`);
  return record;
}

function grantIndustryReward(state, id) {
  const progression = ensureIndustryProgression(state);
  if (!progression?.unlocked?.[id] || progression.claimedRewards[id]) return null;
  progression.claimedRewards[id] = true;
  const amount = Number(V170_INDUSTRY_UNLOCKS[id]?.reward || 0);
  if (amount <= 0) return null;
  state.resources.money = round2((state.resources.money || 0) + amount);
  syncMoney(state);
  recordRewardIncome(state, amount);
  const record = { id, label: V170_BUSINESSES[id].label, money: amount, year: state.year, month: state.month, day: state.day };
  progression.rewardHistory.push(record);
  progression.totalRewardMoney = round2(progression.totalRewardMoney + amount);
  progression.lastReward = record;
  addLog(state, 'reward', '产业解锁奖励', `${record.label}已解锁，家中获得一次性奖励 +${amount}钱。`);
  return record;
}

function maybeUnlockCaravanViaAllBusinessTypes(state) {
  const progression = state?.householdProgression;
  if (!progression?.unlocked || progression.unlocked.caravan) return null;
  const assetValue = Base.getHouseholdAssetValue(state);
  const typeCount = getOwnedBusinessTypeCount(state);
  if (assetValue < 1500 || typeCount < 2) return null;
  progression.unlocked.caravan = true;
  progression.unlockHistory ??= [];
  const record = {
    id: 'caravan', label: '商队', title: '行商邀约',
    text: '家业已经不再局限于一处田庄或铺面。多路商户愿意与你合伙组织远行商队，家门正式迈入更大的商路。',
    year: state.year, month: state.month, day: state.day
  };
  progression.unlockHistory.push(record);
  progression.lastUnlock = record;
  addLog(state, 'unlock', record.title, `${record.text}【解锁：商队】`);
  return record;
}

function stageStatusForNewIndustry(state, id) {
  const progression = ensureIndustryProgression(state);
  const conditions = v170IndustryConditions(state, id);
  const story = INDUSTRY_STORIES[id];
  return {
    id,
    label: V170_BUSINESSES[id].label,
    unlocked: Boolean(progression?.unlocked?.[id]),
    conditions,
    allConditionsMet: conditions.length > 0 && conditions.every(item => item.met),
    storyTitle: story?.title || `${V170_BUSINESSES[id].label}解锁`,
    story: story?.text || '',
    rewardMoney: Number(V170_INDUSTRY_UNLOCKS[id]?.reward || 0),
    rewardClaimed: Boolean(progression?.claimedRewards?.[id]),
    price: V170_BUSINESSES[id].price,
    dailyIncome: V170_BUSINESSES[id].dailyIncome
  };
}

function milestoneCurrentValue(state, milestone) {
  if (milestone.type === 'harvest') return clampNonNegative(state?.v170Progress?.harvestSince170 || 0);
  if (milestone.type === 'land') return clampNonNegative(state?.household?.land || 0);
  if (milestone.type === 'industryIncome') return getIndustrySummary(state).dailyIncome;
  if (milestone.type === 'assets') return Base.getHouseholdAssetValue(state);
  if (milestone.type === 'knowledge') return getKnowledge(state);
  if (milestone.type === 'reputation') return getReputation(state);
  return 0;
}

function grantMilestone(state, milestone) {
  const milestones = ensureMilestoneState(state);
  if (!milestones || milestones.claimed[milestone.id]) return null;
  const current = milestoneCurrentValue(state, milestone);
  if (current < milestone.threshold) return null;
  milestones.claimed[milestone.id] = true;
  const amount = Number(milestone.reward || 0);
  state.resources.money = round2((state.resources.money || 0) + amount);
  syncMoney(state);
  recordRewardIncome(state, amount);
  const record = {
    id: milestone.id, label: milestone.label, money: amount,
    current: round2(current), threshold: milestone.threshold,
    year: state.year, month: state.month, day: state.day
  };
  milestones.history.push(record);
  milestones.totalRewardMoney = round2(milestones.totalRewardMoney + amount);
  milestones.lastReward = record;
  addLog(state, 'reward', `经营成就 · ${milestone.label}`, `达成家业里程碑“${milestone.label}”，获得一次性奖励 +${amount}钱。`);
  return record;
}

function evaluateV170(state) {
  prepare(state);
  const newUnlocks = [];
  const newIndustryRewards = [];
  const newMilestoneRewards = [];
  const baseRewards = [];
  const baseUnlocks = [];

  for (let pass = 0; pass < 12; pass += 1) {
    let changed = false;
    const caravanUnlock = maybeUnlockCaravanViaAllBusinessTypes(state);
    if (caravanUnlock) { baseUnlocks.push('caravan'); changed = true; }

    const baseStatus = Base.getHouseholdUnlockStatus(state);
    for (const id of baseStatus?.newlyUnlocked || []) if (!baseUnlocks.includes(id)) baseUnlocks.push(id);
    for (const record of baseStatus?.newRewards || []) {
      if (!baseRewards.some(item => item.id === record.id)) baseRewards.push(record);
    }
    if (baseStatus?.newlyUnlocked?.length || baseStatus?.newRewards?.length) changed = true;

    for (const id of NEW_BUSINESS_IDS) {
      const progression = ensureIndustryProgression(state);
      if (!progression.unlocked[id]) {
        const conditions = v170IndustryConditions(state, id);
        if (conditions.length && conditions.every(item => item.met)) {
          const unlock = recordIndustryUnlock(state, id);
          if (unlock) { newUnlocks.push(id); changed = true; }
        }
      }
      const reward = grantIndustryReward(state, id);
      if (reward) { newIndustryRewards.push(reward); changed = true; }
    }

    for (const milestone of V170_MILESTONES) {
      const reward = grantMilestone(state, milestone);
      if (reward) { newMilestoneRewards.push(reward); changed = true; }
    }
    if (!changed) break;
  }

  const baseStatus = Base.getHouseholdUnlockStatus(state);
  const typeCount = getOwnedBusinessTypeCount(state);
  const caravanConditions = [
    numericCondition('家产', Base.getHouseholdAssetValue(state), 1500, '钱'),
    numericCondition('商业产业种类', typeCount, 2, '种')
  ];
  const status = {
    ...baseStatus,
    caravan: {
      ...baseStatus.caravan,
      conditions: caravanConditions,
      allConditionsMet: caravanConditions.every(item => item.met)
    }
  };
  for (const id of NEW_BUSINESS_IDS) status[id] = stageStatusForNewIndustry(state, id);
  status.newlyUnlocked = [...new Set([...(baseStatus.newlyUnlocked || []), ...baseUnlocks, ...newUnlocks])];
  status.newRewards = [...baseRewards, ...newIndustryRewards, ...newMilestoneRewards];
  status.newRewardMoney = round2(status.newRewards.reduce((sum, item) => sum + Number(item.money || 0), 0));
  status.businessTypeCount = typeCount;
  status.v170MilestoneRewards = newMilestoneRewards;
  status.v170IndustryRewards = newIndustryRewards;
  expose(state);
  return status;
}

export function getHouseholdUnlockStatus(state) {
  return evaluateV170(state);
}

export function getV170MilestoneStatus(state) {
  evaluateV170(state);
  const byId = {};
  const milestoneState = ensureMilestoneState(state);
  for (const milestone of V170_MILESTONES) {
    const current = round2(milestoneCurrentValue(state, milestone));
    byId[milestone.id] = {
      ...milestone,
      current,
      completed: Boolean(milestoneState.claimed[milestone.id]),
      remaining: round2(Math.max(0, milestone.threshold - current))
    };
  }
  const list = V170_MILESTONES.map(item => byId[item.id]);
  return {
    list,
    byId,
    completed: list.filter(item => item.completed),
    incomplete: list.filter(item => !item.completed),
    totalRewardMoney: round2(milestoneState.totalRewardMoney || 0),
    lastReward: milestoneState.lastReward || null,
    harvestSince170: round1(state.v170Progress?.harvestSince170 || 0)
  };
}

function attachBusinessAsset(state, definition, count, cost) {
  state.assets ??= [];
  let asset = state.assets.find(item => item?.businessType === definition.id);
  if (!asset) {
    state.nextId = Number(state.nextId || 1);
    asset = {
      id: `asset-${state.nextId++}`,
      type: '产业', businessType: definition.id, name: definition.label,
      units: 0, value: 0, location: state.region, ownerId: state.playerId
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

function missingRequirementMessage(stage) {
  const missing = (stage?.conditions || []).filter(item => !item.met);
  if (!missing.length) return `${stage?.label || '该产业'}尚未解锁。`;
  const text = missing.map(item => item.label.startsWith('已有')
    ? `${item.label}${item.required > 1 ? `还差${item.remaining}份` : ''}`
    : `${item.label}还差${item.remaining}${item.unit}`).join('，');
  return `${stage.label}尚未解锁：${text}。`;
}

function buyNewBusiness(state, businessId, count = 1) {
  const definition = V170_BUSINESSES[businessId];
  const status = evaluateV170(state);
  const stage = status[businessId];
  if (!stage?.unlocked) return { ok: false, message: missingRequirementMessage(stage) };
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || state.running) {
    return { ok: false, message: '时间暂停且没有待处理事件时才能购置产业。' };
  }
  const amount = Number(count);
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) return { ok: false, message: '一次只能购置1至20份同类产业。' };
  const cost = round1(definition.price * amount);
  const money = Number(state.resources?.money || 0);
  if (money < cost) return { ok: false, message: `购置${amount > 1 ? `${amount}份` : ''}${definition.label}需要${cost}钱。` };

  const industry = ensureV170Industry(state);
  state.resources.money = round1(money - cost);
  if (state.household) state.household.money = state.resources.money;
  const ledger = Base.ledger?.(state);
  if (ledger) ledger.investment = round1((Number(ledger.investment) || 0) + cost);
  industry.businesses[businessId] += amount;
  const asset = attachBusinessAsset(state, definition, amount, cost);
  addLog(state, 'choice', `购置${definition.label}`, `花费${cost}钱购置${amount > 1 ? `${amount}份` : '1份'}${definition.label}，现有${industry.businesses[businessId]}份，每日合计产出${round1(industry.businesses[businessId] * definition.dailyIncome)}钱。`);
  const rewards = evaluateV170(state);
  return {
    ok: true, businessId, count: amount, cost, owned: industry.businesses[businessId], assetId: asset.id,
    milestoneRewards: rewards.newRewards,
    milestoneRewardMoney: rewards.newRewardMoney,
    message: `已购置${definition.label}${amount > 1 ? ` ×${amount}` : ''}，花费${cost}钱。`
  };
}

export function buyBusiness(state, businessId, count = 1) {
  prepare(state);
  evaluateV170(state);
  if (NEW_BUSINESS_IDS.includes(businessId)) return buyNewBusiness(state, businessId, count);
  if (!ORIGINAL_BUSINESS_IDS.includes(businessId)) return { ok: false, message: '没有这种可购置产业。' };
  const result = Base.buyBusiness(state, businessId, count);
  const status = evaluateV170(state);
  if (!result || typeof result !== 'object' || !status.newRewardMoney) return result;
  return { ...result, v170Rewards: status.newRewards, v170RewardMoney: status.newRewardMoney };
}

function settleExtraIndustryIncome(state) {
  const industry = ensureV170Industry(state);
  let extra = 0;
  for (const id of NEW_BUSINESS_IDS) {
    const def = V170_BUSINESSES[id];
    extra += Number(industry.businesses[id] || 0) * def.dailyIncome;
  }
  extra = round1(extra);
  const total = getIndustrySummary(state).dailyIncome;
  industry.lastDailyIncome = total;
  if (extra <= 0) return 0;
  state.resources.money = round1(Number(state.resources.money || 0) + extra);
  if (state.household) state.household.money = state.resources.money;
  const ledger = Base.ledger?.(state);
  if (ledger) ledger.otherMoney = round1((Number(ledger.otherMoney) || 0) + extra);
  industry.lifetimeIncome = round1(Number(industry.lifetimeIncome || 0) + extra);
  return extra;
}

function recordHarvestDelta(state, beforeHarvest) {
  const afterHarvest = Number(Base.ledger?.(state)?.harvest || 0);
  const delta = round1(Math.max(0, afterHarvest - Number(beforeHarvest || 0)));
  if (delta > 0) {
    const progress = ensureProgress(state);
    progress.harvestSince170 = round1(progress.harvestSince170 + delta);
  }
  return delta;
}

export function createGame(options) {
  const state = Base.createGame(options);
  prepare(state);
  evaluateV170(state);
  return expose(state);
}

export function deserializeState(raw) {
  const state = Base.deserializeState(raw);
  const hadV170Progress = Number(state?.v170Progress?.version || 0) >= 170;
  const hadIndustryProgression = Number(state?.v170IndustryProgression?.version || 0) >= 170;
  const hadMilestones = Number(state?.v170Milestones?.version || 0) >= 170;
  if (!hadV170Progress) state.v170Progress = { version: 170, harvestSince170: 0 };
  if (!hadIndustryProgression) delete state.v170IndustryProgression;
  if (!hadMilestones) delete state.v170Milestones;
  prepare(state);
  evaluateV170(state);
  return expose(state);
}

function settleAfterMutation(state, result) {
  const status = evaluateV170(state);
  if (!result || typeof result !== 'object' || !status.newRewardMoney) return result;
  return { ...result, v170Rewards: status.newRewards, v170RewardMoney: status.newRewardMoney };
}

export function advanceDay(state) {
  prepare(state);
  const elapsedBefore = Number(state?.elapsedDays || 0);
  const harvestBefore = Number(Base.ledger?.(state)?.harvest || 0);
  const result = Base.advanceDay(state);
  if (!result?.ok) return result;
  prepare(state);
  const elapsedAfter = Number(state?.elapsedDays || 0);
  if (elapsedAfter > elapsedBefore) {
    recordHarvestDelta(state, harvestBefore);
    settleExtraIndustryIncome(state);
  }
  return settleAfterMutation(state, result);
}

export function buyLand(state, acres = 1) {
  const result = Base.buyLand(state, acres);
  return settleAfterMutation(state, result);
}

export function sellGrain(state, amount) {
  const result = Base.sellGrain(state, amount);
  return settleAfterMutation(state, result);
}

export function resolveEvent(state, eventId, optionId) {
  const result = Base.resolveEvent(state, eventId, optionId);
  return settleAfterMutation(state, result);
}

export function performGuardianAction(state, ...args) {
  const result = Base.performGuardianAction(state, ...args);
  return settleAfterMutation(state, result);
}

export function continueAs(state, personId) {
  const result = Base.continueAs(state, personId);
  return settleAfterMutation(state, result);
}

export const __v170Test = Object.freeze({
  ensureIndustryProgression,
  ensureMilestoneState,
  ensureProgress,
  v170IndustryConditions,
  milestoneCurrentValue,
  grantMilestone,
  grantIndustryReward,
  recordHarvestDelta,
  evaluateV170
});
