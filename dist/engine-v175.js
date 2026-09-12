import * as Base from './engine-v174.js?v=1.7.4-base';

export * from './engine-v174.js?v=1.7.4-base';

export const V175_STRICT_COMPLETION_POLICY = Object.freeze({
  version: 175,
  thresholdDoesNotComplete: true,
  purchaseOrBuildRequired: true,
  nextTaskRequiresCompletion: true
});

const ORIGINAL_REWARD_IDS = Object.freeze(['landPurchase', 'grainShop', 'clothShop', 'caravan']);
const NEW_REWARD_IDS = Object.freeze(['mill', 'oilPress', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet']);

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function ensureContainers(state) {
  state.householdMilestoneRewards ??= { version: 169, claimed: {}, history: [], totalGranted: 0, lastReward: null };
  state.householdMilestoneRewards.claimed ??= {};
  state.householdMilestoneRewards.history = Array.isArray(state.householdMilestoneRewards.history)
    ? state.householdMilestoneRewards.history
    : [];

  state.v170IndustryProgression ??= { version: 170, unlocked: {}, claimedRewards: {}, history: [], rewardHistory: [] };
  state.v170IndustryProgression.unlocked ??= {};
  state.v170IndustryProgression.claimedRewards ??= {};
  state.v170IndustryProgression.rewardHistory = Array.isArray(state.v170IndustryProgression.rewardHistory)
    ? state.v170IndustryProgression.rewardHistory
    : [];

  state.v174Guide ??= {
    version: 174,
    completed: Object.fromEntries(Base.V174_GUIDE_CHAIN.map(item => [item.id, false])),
    history: [],
    lastCompletion: null,
    migratedFromLegacy: false
  };
  state.v174Guide.version = 174;
  state.v174Guide.completed ??= {};
  state.v174Guide.history = Array.isArray(state.v174Guide.history) ? state.v174Guide.history : [];
  for (const item of Base.V174_GUIDE_CHAIN) state.v174Guide.completed[item.id] = Boolean(state.v174Guide.completed[item.id]);
  return state.v174Guide;
}

function hasPaidReward(state, id) {
  ensureContainers(state);
  const histories = ORIGINAL_REWARD_IDS.includes(id)
    ? state.householdMilestoneRewards.history
    : state.v170IndustryProgression.rewardHistory;
  return histories.some(record => record?.id === id && Number(record?.money || 0) > 0);
}

function setRewardClaimed(state, id, value) {
  ensureContainers(state);
  if (ORIGINAL_REWARD_IDS.includes(id)) state.householdMilestoneRewards.claimed[id] = Boolean(value);
  if (NEW_REWARD_IDS.includes(id)) state.v170IndustryProgression.claimedRewards[id] = Boolean(value);
}

function landPurchaseEvidence(state) {
  const actualGuideCompletion = state.v174Guide?.history?.some(record =>
    record?.id === 'landPurchase' && !record?.migrated
  );
  if (actualGuideCompletion) return true;
  return (state.assets || []).some(asset =>
    asset?.type === '田产' && /^新购田地/.test(String(asset?.name || '')) && Number(asset?.area || 0) > 0
  );
}

function businessBuildEvidence(state, id) {
  return Number(state.industry?.businesses?.[id] || 0) > 0;
}

function completionEvidence(state, item) {
  if (item.id === 'landPurchase') return landPurchaseEvidence(state);
  return businessBuildEvidence(state, item.id);
}

function settleCompletedUnderlyingState(state, id) {
  ensureContainers(state);
  if (id === 'landPurchase') {
    state.householdProgression ??= { unlocked: {} };
    state.householdProgression.unlocked ??= {};
    state.householdProgression.unlocked.landPurchase = true;
    setRewardClaimed(state, id, true);
    return;
  }
  if (['grainShop', 'clothShop', 'caravan'].includes(id)) {
    state.householdProgression ??= { unlocked: {} };
    state.householdProgression.unlocked ??= {};
    state.householdProgression.unlocked[id] = true;
  } else {
    state.v170IndustryProgression.unlocked[id] = true;
  }
  setRewardClaimed(state, id, true);
}

export function repairV175Guide(state) {
  if (!state) return null;
  const guide = ensureContainers(state);
  let chainStillContiguous = true;

  for (const item of Base.V174_GUIDE_CHAIN) {
    const evidenced = completionEvidence(state, item);
    const completed = chainStillContiguous && evidenced;
    guide.completed[item.id] = completed;

    if (completed) {
      settleCompletedUnderlyingState(state, item.id);
    } else {
      chainStillContiguous = false;
      if (!hasPaidReward(state, item.id)) setRewardClaimed(state, item.id, false);
    }
  }

  guide.strictCompletionPolicy = 175;
  guide.migratedFromLegacy = true;
  return guide;
}

function decorateStrictRewardState(state, status) {
  if (!status) return status;
  const guide = repairV175Guide(state);
  const currentId = Base.V174_GUIDE_CHAIN.find(item => !guide.completed[item.id])?.id || null;
  const decorated = { ...status };

  for (const item of Base.V174_GUIDE_CHAIN) {
    if (!status[item.id]) continue;
    const completed = Boolean(guide.completed[item.id]);
    const current = item.id === currentId;
    const owned = item.id === 'landPurchase' ? 0 : Number(state.industry?.businesses?.[item.id] || 0);
    decorated[item.id] = {
      ...status[item.id],
      guideCompleted: completed,
      guideCurrent: current,
      rewardClaimed: completed,
      rewardLabel: '完成奖励',
      rewardAvailableOnBuild: item.id !== 'landPurchase' && current && Boolean(status[item.id].unlocked) && owned === 0 && !completed
    };
  }

  decorated.guideCurrentId = currentId;
  decorated.guideCompletedCount = Base.V174_GUIDE_CHAIN.findIndex(item => !guide.completed[item.id]);
  if (decorated.guideCompletedCount < 0) decorated.guideCompletedCount = Base.V174_GUIDE_CHAIN.length;
  decorated.guideAllCompleted = !currentId;
  return decorated;
}

export function createGame(options) {
  const state = Base.createGame(options);
  repairV175Guide(state);
  return expose(state);
}

export function deserializeState(raw) {
  const state = Base.deserializeState(raw);
  repairV175Guide(state);
  Base.getHouseholdUnlockStatus(state);
  repairV175Guide(state);
  return expose(state);
}

export function getHouseholdUnlockStatus(state) {
  repairV175Guide(state);
  const status = Base.getHouseholdUnlockStatus(state);
  repairV175Guide(state);
  return decorateStrictRewardState(state, status);
}

export function getV170MilestoneStatus(state) {
  repairV175Guide(state);
  const result = Base.getV170MilestoneStatus(state);
  repairV175Guide(state);
  return result;
}

export function getV174GuideStatus(state) {
  repairV175Guide(state);
  const result = Base.getV174GuideStatus(state);
  repairV175Guide(state);
  if (!result) return result;

  const currentIndex = Base.V174_GUIDE_CHAIN.findIndex(item => !state.v174Guide.completed[item.id]);
  const normalizedIndex = currentIndex < 0 ? Base.V174_GUIDE_CHAIN.length : currentIndex;
  const list = result.list.map((stage, index) => ({
    ...stage,
    completed: Boolean(state.v174Guide.completed[stage.id]),
    current: index === normalizedIndex,
    chainLocked: index > normalizedIndex
  }));
  const byId = Object.fromEntries(list.map(stage => [stage.id, stage]));
  return {
    ...result,
    list,
    byId,
    currentIndex: normalizedIndex,
    current: normalizedIndex < list.length ? list[normalizedIndex] : null,
    next: normalizedIndex + 1 < list.length ? list[normalizedIndex + 1] : null,
    completedCount: normalizedIndex,
    allCompleted: normalizedIndex >= list.length
  };
}

export function buyLand(state, acres = 1) {
  repairV175Guide(state);
  const result = Base.buyLand(state, acres);
  repairV175Guide(state);
  return result;
}

export function buyBusiness(state, businessId, count = 1) {
  repairV175Guide(state);
  const result = Base.buyBusiness(state, businessId, count);
  repairV175Guide(state);
  return result;
}

export function advanceDay(state) {
  repairV175Guide(state);
  const result = Base.advanceDay(state);
  repairV175Guide(state);
  return result;
}

export function sellGrain(state, amount) {
  repairV175Guide(state);
  const result = Base.sellGrain(state, amount);
  repairV175Guide(state);
  return result;
}

export function resolveEvent(state, eventId, optionId) {
  repairV175Guide(state);
  const result = Base.resolveEvent(state, eventId, optionId);
  repairV175Guide(state);
  return result;
}

export function performGuardianAction(state, ...args) {
  repairV175Guide(state);
  const result = Base.performGuardianAction(state, ...args);
  repairV175Guide(state);
  return result;
}

export function continueAs(state, personId) {
  repairV175Guide(state);
  const result = Base.continueAs(state, personId);
  repairV175Guide(state);
  return result;
}

export const __v175Test = Object.freeze({
  repairV175Guide,
  landPurchaseEvidence,
  businessBuildEvidence,
  hasPaidReward
});
