import * as Base from './engine-v173.js?v=1.7.3-base';
import * as Core from './engine-v168.js?v=1.6.8-guide';

export * from './engine-v173.js?v=1.7.3-base';

const BUSINESS_ORDER = Object.freeze(['mill', 'grainShop', 'clothShop', 'oilPress', 'caravan', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet']);
const ORIGINAL_BUSINESS_IDS = Object.freeze(['grainShop', 'clothShop', 'caravan']);
const NEW_BUSINESS_IDS = Object.freeze(['mill', 'oilPress', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet']);
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function rewardFor(id) {
  if (id === 'landPurchase' || ORIGINAL_BUSINESS_IDS.includes(id)) return Number(Base.V169_UNLOCK_REWARDS?.[id] || 0);
  return Number(Base.V170_INDUSTRY_UNLOCKS?.[id]?.reward || 0);
}

export const V174_GUIDE_CHAIN = Object.freeze([
  Object.freeze({ id: 'landPurchase', label: '置办新田', type: 'land', reward: rewardFor('landPurchase'), earlyGuide: true }),
  Object.freeze({ id: 'mill', label: '建成磨坊', type: 'business', businessId: 'mill', reward: rewardFor('mill'), earlyGuide: true }),
  Object.freeze({ id: 'grainShop', label: '建成粮铺', type: 'business', businessId: 'grainShop', reward: rewardFor('grainShop'), earlyGuide: true }),
  Object.freeze({ id: 'clothShop', label: '建成布庄', type: 'business', businessId: 'clothShop', reward: rewardFor('clothShop'), earlyGuide: true }),
  Object.freeze({ id: 'oilPress', label: '建成油坊', type: 'business', businessId: 'oilPress', reward: rewardFor('oilPress'), earlyGuide: true }),
  Object.freeze({ id: 'caravan', label: '组建第一支商队', type: 'business', businessId: 'caravan', reward: rewardFor('caravan'), earlyGuide: true }),
  Object.freeze({ id: 'winery', label: '建成酒坊', type: 'business', businessId: 'winery', reward: rewardFor('winery'), earlyGuide: false }),
  Object.freeze({ id: 'inn', label: '建成客栈', type: 'business', businessId: 'inn', reward: rewardFor('inn'), earlyGuide: false }),
  Object.freeze({ id: 'weavingWorkshop', label: '建成织坊', type: 'business', businessId: 'weavingWorkshop', reward: rewardFor('weavingWorkshop'), earlyGuide: false }),
  Object.freeze({ id: 'paperMill', label: '建成纸坊', type: 'business', businessId: 'paperMill', reward: rewardFor('paperMill'), earlyGuide: false }),
  Object.freeze({ id: 'waterFleet', label: '建成水运船队', type: 'business', businessId: 'waterFleet', reward: rewardFor('waterFleet'), earlyGuide: false })
]);

const GUIDE_INDEX = Object.freeze(Object.fromEntries(V174_GUIDE_CHAIN.map((item, index) => [item.id, index])));
const GUIDE_BY_ID = Object.freeze(Object.fromEntries(V174_GUIDE_CHAIN.map(item => [item.id, item])));

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function ensureRewardContainers(state) {
  Base.__v173Test?.ensureV173?.(state);
  state.householdMilestoneRewards ??= { version: 169, claimed: {}, history: [], totalGranted: 0, lastReward: null };
  state.householdMilestoneRewards.claimed ??= {};
  state.householdMilestoneRewards.history = Array.isArray(state.householdMilestoneRewards.history) ? state.householdMilestoneRewards.history : [];
  state.v170IndustryProgression ??= { version: 170, unlocked: {}, claimedRewards: {}, history: [], rewardHistory: [] };
  state.v170IndustryProgression.unlocked ??= {};
  state.v170IndustryProgression.claimedRewards ??= {};
}

function rawGuide(state) {
  const current = state?.v174Guide;
  if (current?.version === 174 && current.completed) {
    for (const item of V174_GUIDE_CHAIN) current.completed[item.id] = Boolean(current.completed[item.id]);
    current.history = Array.isArray(current.history) ? current.history : [];
    current.lastCompletion ??= null;
    return current;
  }
  state.v174Guide = {
    version: 174,
    completed: Object.fromEntries(V174_GUIDE_CHAIN.map(item => [item.id, false])),
    history: [],
    lastCompletion: null,
    migratedFromLegacy: false
  };
  return state.v174Guide;
}

function markUnderlyingSettled(state, id) {
  ensureRewardContainers(state);
  if (id === 'landPurchase') {
    state.householdProgression ??= { unlocked: {} };
    state.householdProgression.unlocked ??= {};
    state.householdProgression.unlocked.landPurchase = true;
    state.householdMilestoneRewards.claimed.landPurchase = true;
    return;
  }
  if (ORIGINAL_BUSINESS_IDS.includes(id)) {
    state.householdProgression ??= { unlocked: {} };
    state.householdProgression.unlocked ??= {};
    state.householdProgression.unlocked[id] = true;
    state.householdMilestoneRewards.claimed[id] = true;
    return;
  }
  if (NEW_BUSINESS_IDS.includes(id)) {
    state.v170IndustryProgression.unlocked[id] = true;
    state.v170IndustryProgression.claimedRewards[id] = true;
  }
}

function migrateLegacyGuide(state) {
  const guide = rawGuide(state);
  if (guide.migratedFromLegacy) return guide;
  const businesses = state?.industry?.businesses || {};
  let furthest = -1;
  for (let index = 1; index < V174_GUIDE_CHAIN.length; index += 1) {
    const id = V174_GUIDE_CHAIN[index].id;
    if (Number(businesses[id] || 0) > 0) furthest = Math.max(furthest, index);
  }
  if (furthest >= 1) {
    for (let index = 0; index <= furthest; index += 1) {
      const id = V174_GUIDE_CHAIN[index].id;
      guide.completed[id] = true;
      markUnderlyingSettled(state, id);
    }
  } else if (Boolean(state?.householdProgression?.unlocked?.landPurchase) && Number(state?.household?.land || 0) > 0) {
    guide.completed.landPurchase = true;
    markUnderlyingSettled(state, 'landPurchase');
  }
  guide.migratedFromLegacy = true;
  return guide;
}

function ensureV174(state, { migrateLegacy = false } = {}) {
  if (!state) return null;
  ensureRewardContainers(state);
  const guide = rawGuide(state);
  if (migrateLegacy) migrateLegacyGuide(state);
  return guide;
}

function currentGuideIndex(state) {
  const guide = ensureV174(state);
  const index = V174_GUIDE_CHAIN.findIndex(item => !guide.completed[item.id]);
  return index < 0 ? V174_GUIDE_CHAIN.length : index;
}

function guideLabel(id) {
  return GUIDE_BY_ID[id]?.label || Base.V170_BUSINESSES?.[id]?.label || id;
}

function isFutureStage(state, id) {
  const index = GUIDE_INDEX[id];
  return Number.isInteger(index) && index > currentGuideIndex(state);
}

function withLandRewardSuppressed(state, operation) {
  ensureV174(state);
  const rewards = state.householdMilestoneRewards;
  const before = Boolean(rewards.claimed.landPurchase);
  rewards.claimed.landPurchase = true;
  try {
    return operation();
  } finally {
    rewards.claimed.landPurchase = before;
  }
}

function snapshotUnlocks(state) {
  ensureV174(state);
  return {
    householdUnlocked: { ...(state.householdProgression?.unlocked || {}) },
    householdHistory: [...(state.householdProgression?.unlockHistory || [])],
    householdLast: state.householdProgression?.lastUnlock || null,
    industryUnlocked: { ...(state.v170IndustryProgression?.unlocked || {}) },
    industryHistory: [...(state.v170IndustryProgression?.history || [])],
    industryLast: state.v170IndustryProgression?.lastUnlock || null,
    eventLog: [...(state.eventLog || [])]
  };
}

function allowedAtCurrentStep(state, id) {
  const index = GUIDE_INDEX[id];
  if (!Number.isInteger(index)) return true;
  return index <= currentGuideIndex(state);
}

function restoreFutureUnlocks(state, before) {
  const household = state.householdProgression;
  if (household?.unlocked) {
    for (const id of ['landPurchase', ...ORIGINAL_BUSINESS_IDS]) {
      if (!allowedAtCurrentStep(state, id)) household.unlocked[id] = Boolean(before.householdUnlocked[id]);
    }
    const kept = (household.unlockHistory || []).filter((record, index) => index < before.householdHistory.length || allowedAtCurrentStep(state, record?.id));
    household.unlockHistory = kept;
    household.lastUnlock = kept.at(-1) || before.householdLast || null;
  }

  const progression = state.v170IndustryProgression;
  if (progression?.unlocked) {
    for (const id of NEW_BUSINESS_IDS) {
      if (!allowedAtCurrentStep(state, id)) progression.unlocked[id] = Boolean(before.industryUnlocked[id]);
    }
    const kept = (progression.history || []).filter((record, index) => index < before.industryHistory.length || allowedAtCurrentStep(state, record?.id));
    progression.history = kept;
    progression.lastUnlock = kept.at(-1) || before.industryLast || null;
  }

  const originalLength = before.eventLog.length;
  const keptAdded = (state.eventLog || []).slice(originalLength).filter(entry => {
    if (entry?.kind !== 'unlock') return true;
    const future = V174_GUIDE_CHAIN.find(item => isFutureStage(state, item.id) && (entry.text || '').includes(Base.V170_BUSINESSES?.[item.id]?.label || item.label.replace(/^建成|^组建第一支/, '')));
    return !future;
  });
  state.eventLog = [...before.eventLog, ...keptAdded];
}

function normalizeCurrentUnlockLog(state, beforeLength) {
  const currentIndex = currentGuideIndex(state);
  if (currentIndex >= V174_GUIDE_CHAIN.length) return;
  const current = V174_GUIDE_CHAIN[currentIndex];
  for (const entry of (state.eventLog || []).slice(beforeLength)) {
    if (entry?.kind !== 'unlock') continue;
    const businessLabel = Base.V170_BUSINESSES?.[current.id]?.label;
    if (current.id === 'landPurchase' || (businessLabel && (entry.text || '').includes(businessLabel))) {
      entry.title = '家业目标已具备条件';
      entry.text = current.id === 'landPurchase'
        ? '置办新田的条件已经满足。真正买下至少1亩新田后，才算完成当前目标并领取奖励。'
        : `${businessLabel}的建设条件已经满足。真正建成后，才算完成当前目标并领取奖励。`;
    }
  }
}

function withGuidePolicy(state, operation) {
  ensureV174(state);
  const before = snapshotUnlocks(state);
  const beforeEventLength = before.eventLog.length;
  const result = withLandRewardSuppressed(state, operation);
  restoreFutureUnlocks(state, before);
  normalizeCurrentUnlockLog(state, beforeEventLength);
  return result;
}

function chainCondition(previous) {
  return {
    label: previous ? `先完成「${previous.label}」` : '完成上一个家业目标',
    current: 0,
    required: 1,
    unit: '',
    met: false,
    remaining: 1,
    guideGate: true
  };
}

function decorateStatus(state, source) {
  const guide = ensureV174(state);
  const currentIndex = currentGuideIndex(state);
  const status = { ...source };

  for (let index = 0; index < V174_GUIDE_CHAIN.length; index += 1) {
    const item = V174_GUIDE_CHAIN[index];
    const baseStage = source?.[item.id] || { id: item.id, label: item.label, conditions: [] };
    const completed = Boolean(guide.completed[item.id]);
    const current = index === currentIndex;
    const chainLocked = index > currentIndex;
    const underlyingUnlocked = Boolean(baseStage.unlocked);
    const unlocked = completed ? true : current ? underlyingUnlocked : false;
    const conditions = chainLocked
      ? [chainCondition(V174_GUIDE_CHAIN[index - 1]), ...(baseStage.conditions || [])]
      : [...(baseStage.conditions || [])];
    const ownedCount = item.type === 'business' ? Math.max(0, Math.floor(Number(state.industry?.businesses?.[item.id]) || 0)) : 0;

    status[item.id] = {
      ...baseStage,
      id: item.id,
      label: item.label,
      guideLabel: item.label,
      guideIndex: index,
      guideCompleted: completed,
      guideCurrent: current,
      chainLocked,
      unlocked,
      allConditionsMet: completed ? true : current ? Boolean(baseStage.allConditionsMet || underlyingUnlocked) : false,
      conditions,
      rewardMoney: item.reward,
      rewardLabel: '完成奖励',
      rewardClaimed: item.id === 'landPurchase'
        ? Boolean(state.householdMilestoneRewards?.claimed?.landPurchase)
        : Boolean(baseStage.rewardClaimed),
      rewardAvailableOnBuild: item.type === 'business' && current && underlyingUnlocked && ownedCount === 0 && !baseStage.rewardClaimed,
      buildState: chainLocked ? 'chainLocked' : completed ? 'completed' : current ? (underlyingUnlocked ? 'available' : 'locked') : baseStage.buildState
    };
  }

  status.newlyUnlocked = (source?.newlyUnlocked || []).filter(id => !isFutureStage(state, id));
  status.guideCurrentId = currentIndex < V174_GUIDE_CHAIN.length ? V174_GUIDE_CHAIN[currentIndex].id : null;
  status.guideCompletedCount = currentIndex;
  status.guideAllCompleted = currentIndex >= V174_GUIDE_CHAIN.length;
  return status;
}

export function getHouseholdUnlockStatus(state) {
  ensureV174(state);
  const source = withGuidePolicy(state, () => Base.getHouseholdUnlockStatus(state));
  return decorateStatus(state, source);
}

export function getV170MilestoneStatus(state) {
  ensureV174(state);
  return withGuidePolicy(state, () => Base.getV170MilestoneStatus(state));
}

export function getV174GuideStatus(state) {
  ensureV174(state);
  const status = getHouseholdUnlockStatus(state);
  const guide = state.v174Guide;
  const currentIndex = currentGuideIndex(state);
  const list = V174_GUIDE_CHAIN.map((item, index) => {
    const stage = status[item.id] || {};
    const business = item.type === 'business' ? Base.V170_BUSINESSES?.[item.id] : null;
    const completed = Boolean(guide.completed[item.id]);
    const current = index === currentIndex;
    return {
      ...item,
      index,
      completed,
      current,
      chainLocked: index > currentIndex,
      thresholdReady: completed || (current && Boolean(stage.unlocked)),
      canComplete: current && Boolean(stage.unlocked),
      conditions: stage.conditions || [],
      price: Number(business?.price || stage.price || 0),
      dailyIncome: Number(business?.dailyIncome || stage.dailyIncome || 0),
      ownedCount: item.type === 'business' ? Math.max(0, Math.floor(Number(state.industry?.businesses?.[item.id]) || 0)) : 0
    };
  });
  const byId = Object.fromEntries(list.map(item => [item.id, item]));
  return {
    list,
    byId,
    currentIndex,
    current: currentIndex < list.length ? list[currentIndex] : null,
    next: currentIndex + 1 < list.length ? list[currentIndex + 1] : null,
    completedCount: Math.min(currentIndex, list.length),
    total: list.length,
    allCompleted: currentIndex >= list.length,
    history: [...guide.history],
    lastCompletion: guide.lastCompletion
  };
}

function recordGuideCompletion(state, id, rewardMoney = 0, { migrated = false } = {}) {
  const guide = ensureV174(state);
  if (guide.completed[id]) return null;
  const expected = V174_GUIDE_CHAIN[currentGuideIndex(state)]?.id;
  if (!migrated && expected !== id) return null;
  guide.completed[id] = true;
  const item = GUIDE_BY_ID[id];
  const nextIndex = GUIDE_INDEX[id] + 1;
  const next = V174_GUIDE_CHAIN[nextIndex] || null;
  const record = {
    id,
    label: item?.label || guideLabel(id),
    rewardMoney: Number(rewardMoney || 0),
    nextId: next?.id || null,
    nextLabel: next?.label || null,
    year: state.year,
    month: state.month,
    day: state.day,
    migrated: Boolean(migrated)
  };
  guide.history.push(record);
  guide.lastCompletion = record;
  if (!migrated) {
    addLog(state, 'guide', '家业引导完成', `${record.label}已经完成${record.rewardMoney ? `，获得奖励 +${record.rewardMoney}钱` : ''}。${next ? `下一目标：${next.label}。` : '家业引导链已经全部完成。'}`);
  }
  return record;
}

function grantLandCompletionReward(state) {
  ensureV174(state);
  const rewards = state.householdMilestoneRewards;
  if (rewards.claimed.landPurchase) return 0;
  const amount = rewardFor('landPurchase') || 20;
  rewards.claimed.landPurchase = true;
  state.resources.money = round2((state.resources.money || 0) + amount);
  if (state.household) state.household.money = state.resources.money;
  const ledger = Base.ledger?.(state);
  if (ledger) ledger.otherMoney = round2((ledger.otherMoney || 0) + amount);
  const record = {
    id: 'landPurchase', label: '置办新田', money: amount, source: 'guideCompletion',
    year: state.year, month: state.month, day: state.day
  };
  rewards.history.push(record);
  rewards.totalGranted = round2((rewards.totalGranted || 0) + amount);
  rewards.lastReward = record;
  addLog(state, 'reward', '家业引导完成奖励', `真正置办新田后，获得一次性完成奖励 +${amount}钱。`);
  return amount;
}

function chainBlockedMessage(state, id) {
  const guide = getV174GuideStatus(state);
  const current = guide.current;
  const target = GUIDE_BY_ID[id];
  if (!target) return '该项目不在家业引导链中。';
  if (!current) return `${target.label}已经不受前期引导限制。`;
  return `${target.label}尚未开放：请先完成当前家业目标「${current.label}」。`;
}

export function createGame(options) {
  const state = Core.createGame(options);
  ensureV174(state);
  getHouseholdUnlockStatus(state);
  getV170MilestoneStatus(state);
  return expose(state);
}

function parseSave(raw) {
  if (typeof raw === 'string') return JSON.parse(raw);
  return JSON.parse(JSON.stringify(raw));
}

export function deserializeState(raw) {
  const parsed = parseSave(raw);
  const hadGuide = Number(parsed?.v174Guide?.version || 0) >= 174;
  const priorLandClaim = Boolean(parsed?.householdMilestoneRewards?.claimed?.landPurchase);
  if (parsed?.householdMilestoneRewards?.claimed) parsed.householdMilestoneRewards.claimed.landPurchase = true;
  const originalEventLength = Array.isArray(parsed?.eventLog) ? parsed.eventLog.length : 0;
  const state = Base.deserializeState(JSON.stringify(parsed));
  ensureV174(state, { migrateLegacy: !hadGuide });
  if (hadGuide) {
    state.v174Guide = parsed.v174Guide;
    ensureV174(state);
    state.householdMilestoneRewards.claimed.landPurchase = priorLandClaim || Boolean(state.v174Guide.completed.landPurchase);
  }

  const guide = ensureV174(state);
  for (const item of V174_GUIDE_CHAIN) {
    if (guide.completed[item.id]) markUnderlyingSettled(state, item.id);
  }
  state.eventLog = (state.eventLog || []).filter((entry, index) => {
    if (index < originalEventLength || entry?.kind !== 'unlock') return true;
    return !V174_GUIDE_CHAIN.some(item => isFutureStage(state, item.id) && (entry.text || '').includes(Base.V170_BUSINESSES?.[item.id]?.label || item.label));
  });
  getHouseholdUnlockStatus(state);
  getV170MilestoneStatus(state);
  return expose(state);
}

export function buyLand(state, acres = 1) {
  ensureV174(state);
  const guideBefore = getV174GuideStatus(state);
  const completing = guideBefore.current?.id === 'landPurchase';
  const result = withGuidePolicy(state, () => Base.buyLand(state, acres));
  if (!result?.ok) return result;

  let guideCompleted = null;
  let guideRewardMoney = 0;
  if (completing) {
    guideRewardMoney = grantLandCompletionReward(state);
    guideCompleted = recordGuideCompletion(state, 'landPurchase', guideRewardMoney);
  }
  const guideAfter = getV174GuideStatus(state);
  expose(state);
  return {
    ...result,
    guideCompleted,
    guideRewardMoney,
    guideNext: guideAfter.current,
    message: `${result.message}${guideCompleted ? ` 家业目标完成，奖励 +${guideRewardMoney}钱；下一目标：${guideAfter.current?.label || '家业引导全部完成'}。` : ''}`
  };
}

export function buyBusiness(state, businessId, count = 1) {
  ensureV174(state);
  if (!BUSINESS_ORDER.includes(businessId)) return Base.buyBusiness(state, businessId, count);
  const guideBefore = getV174GuideStatus(state);
  const stage = guideBefore.byId[businessId];
  const completedBefore = Boolean(stage?.completed);
  const isCurrent = guideBefore.current?.id === businessId;
  if (!completedBefore && !isCurrent) return { ok: false, message: chainBlockedMessage(state, businessId) };

  const ownedBefore = Math.max(0, Math.floor(Number(state.industry?.businesses?.[businessId]) || 0));
  const result = withGuidePolicy(state, () => Base.buyBusiness(state, businessId, count));
  if (!result?.ok) return result;
  const ownedAfter = Math.max(0, Math.floor(Number(state.industry?.businesses?.[businessId]) || 0));

  let guideCompleted = null;
  if (isCurrent && ownedBefore === 0 && ownedAfter > 0) {
    guideCompleted = recordGuideCompletion(state, businessId, Number(result.buildRewardMoney || 0));
  }
  const guideAfter = getV174GuideStatus(state);
  expose(state);
  return {
    ...result,
    guideCompleted,
    guideRewardMoney: guideCompleted ? Number(result.buildRewardMoney || 0) : 0,
    guideNext: guideAfter.current,
    message: `${result.message}${guideCompleted ? ` 家业目标完成；下一目标：${guideAfter.current?.label || '家业引导全部完成'}。` : ''}`
  };
}

export function advanceDay(state) {
  ensureV174(state);
  return withGuidePolicy(state, () => Base.advanceDay(state));
}

export function sellGrain(state, amount) {
  ensureV174(state);
  return withGuidePolicy(state, () => Base.sellGrain(state, amount));
}

export function resolveEvent(state, eventId, optionId) {
  ensureV174(state);
  return withGuidePolicy(state, () => Base.resolveEvent(state, eventId, optionId));
}

export function performGuardianAction(state, ...args) {
  ensureV174(state);
  return withGuidePolicy(state, () => Base.performGuardianAction(state, ...args));
}

export function continueAs(state, personId) {
  ensureV174(state);
  return withGuidePolicy(state, () => Base.continueAs(state, personId));
}

export const __v174Test = Object.freeze({
  ensureV174,
  migrateLegacyGuide,
  currentGuideIndex,
  recordGuideCompletion,
  grantLandCompletionReward,
  withGuidePolicy
});
