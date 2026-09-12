import * as Base from './engine-v170.js?v=1.7.0-base';
import * as Core from './engine-v168.js?v=1.6.8';

export * from './engine-v170.js?v=1.7.0-base';

export const V173_BUSINESS_LIMITS = Object.freeze({
  mill: 1,
  grainShop: 1,
  clothShop: 1,
  oilPress: 1,
  caravan: 2,
  winery: 1,
  inn: 1,
  weavingWorkshop: 1,
  paperMill: 1,
  waterFleet: 1
});

const BUSINESS_IDS = Object.freeze(Object.keys(V173_BUSINESS_LIMITS));
const ORIGINAL_REWARD_IDS = Object.freeze(['grainShop', 'clothShop', 'caravan']);
const NEW_REWARD_IDS = Object.freeze(['mill', 'oilPress', 'winery', 'inn', 'weavingWorkshop', 'paperMill', 'waterFleet']);
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

function ensureV173(state) {
  if (!state) return null;
  Base.__v169Test?.ensureRewardState?.(state, { migrateLegacy: false });
  Base.ensureV170Industry?.(state);
  Base.__v170Test?.ensureIndustryProgression?.(state);
  Base.__v170Test?.ensureMilestoneState?.(state);
  Base.__v170Test?.ensureProgress?.(state);
  state.v173IndustryPolicy ??= { version: 173 };
  state.v173IndustryPolicy.version = 173;
  return state;
}

function rewardAmount(id) {
  if (ORIGINAL_REWARD_IDS.includes(id)) return Number(Base.V169_UNLOCK_REWARDS?.[id] || 0);
  return Number(Base.V170_INDUSTRY_UNLOCKS?.[id]?.reward || 0);
}

function rewardClaimed(state, id) {
  ensureV173(state);
  if (ORIGINAL_REWARD_IDS.includes(id)) return Boolean(state.householdMilestoneRewards?.claimed?.[id]);
  if (NEW_REWARD_IDS.includes(id)) return Boolean(state.v170IndustryProgression?.claimedRewards?.[id]);
  return false;
}

function setRewardClaimed(state, id, value) {
  ensureV173(state);
  if (ORIGINAL_REWARD_IDS.includes(id)) state.householdMilestoneRewards.claimed[id] = Boolean(value);
  if (NEW_REWARD_IDS.includes(id)) state.v170IndustryProgression.claimedRewards[id] = Boolean(value);
}

function withIndustryRewardsSuppressed(state, operation) {
  ensureV173(state);
  const before = Object.fromEntries(BUSINESS_IDS.map(id => [id, rewardClaimed(state, id)]));
  for (const id of BUSINESS_IDS) setRewardClaimed(state, id, true);
  try {
    return operation();
  } finally {
    for (const id of BUSINESS_IDS) setRewardClaimed(state, id, before[id]);
  }
}

function withEffectiveIndustryCounts(state, operation) {
  ensureV173(state);
  const businesses = state.industry.businesses;
  const actual = {};
  const effectiveBefore = {};
  for (const id of BUSINESS_IDS) {
    actual[id] = Math.max(0, Math.floor(Number(businesses[id]) || 0));
    effectiveBefore[id] = Math.min(actual[id], V173_BUSINESS_LIMITS[id]);
    businesses[id] = effectiveBefore[id];
  }
  try {
    return operation();
  } finally {
    for (const id of BUSINESS_IDS) {
      const afterEffective = Math.max(0, Math.floor(Number(businesses[id]) || 0));
      const delta = afterEffective - effectiveBefore[id];
      businesses[id] = Math.max(0, actual[id] + delta);
    }
  }
}

function withV173Context(state, operation) {
  ensureV173(state);
  return withIndustryRewardsSuppressed(state, () => withEffectiveIndustryCounts(state, operation));
}

function buildStateFor(state, id, unlocked = false) {
  const count = Math.max(0, Math.floor(Number(state?.industry?.businesses?.[id]) || 0));
  const limit = V173_BUSINESS_LIMITS[id];
  const claimed = rewardClaimed(state, id);
  return {
    count,
    limit,
    effectiveCount: Math.min(count, limit),
    inactiveCount: Math.max(0, count - limit),
    atLimit: count >= limit,
    rewardClaimed: claimed,
    rewardAvailableOnBuild: Boolean(unlocked && count === 0 && !claimed),
    buildState: !unlocked ? 'locked' : count > 0 ? 'built' : 'available'
  };
}

function decorateUnlockStatus(state, source) {
  if (!source) return source;
  const status = { ...source };
  for (const id of BUSINESS_IDS) {
    if (!source[id]) continue;
    const build = buildStateFor(state, id, source[id].unlocked);
    status[id] = {
      ...source[id],
      rewardMoney: rewardAmount(id),
      rewardClaimed: build.rewardClaimed,
      rewardAvailableOnBuild: build.rewardAvailableOnBuild,
      buildState: build.buildState,
      ownershipLimit: build.limit,
      ownedCount: build.count,
      effectiveCount: build.effectiveCount,
      inactiveCount: build.inactiveCount,
      atLimit: build.atLimit,
      rewardLabel: '首次建成奖励'
    };
  }
  return status;
}

export function getHouseholdUnlockStatus(state) {
  ensureV173(state);
  const status = withV173Context(state, () => Base.getHouseholdUnlockStatus(state));
  return decorateUnlockStatus(state, status);
}

export function getV170MilestoneStatus(state) {
  ensureV173(state);
  return withV173Context(state, () => Base.getV170MilestoneStatus(state));
}

export function getIndustrySummary(state) {
  ensureV173(state);
  const businesses = {};
  let dailyIncome = 0;
  for (const [id, definition] of Object.entries(Base.V170_BUSINESSES)) {
    const count = Math.max(0, Math.floor(Number(state.industry.businesses[id]) || 0));
    const limit = V173_BUSINESS_LIMITS[id] ?? count;
    const effectiveCount = Math.min(count, limit);
    const inactiveCount = Math.max(0, count - limit);
    const totalDailyIncome = round1(effectiveCount * definition.dailyIncome);
    dailyIncome += totalDailyIncome;
    businesses[id] = {
      ...definition,
      count,
      limit,
      effectiveCount,
      inactiveCount,
      atLimit: count >= limit,
      totalDailyIncome
    };
  }
  return {
    businesses,
    dailyIncome: round1(dailyIncome),
    lastDailyIncome: round1(state.industry.lastDailyIncome || 0),
    lifetimeIncome: round1(state.industry.lifetimeIncome || 0)
  };
}

export function getOwnedBusinessTypeCount(state) {
  ensureV173(state);
  return BUSINESS_IDS.filter(id => Number(state.industry.businesses[id] || 0) > 0).length;
}

function grantBuildReward(state, id) {
  ensureV173(state);
  if (!BUSINESS_IDS.includes(id) || rewardClaimed(state, id)) return null;
  const amount = rewardAmount(id);
  setRewardClaimed(state, id, true);
  if (amount <= 0) return null;

  state.resources.money = round2((state.resources.money || 0) + amount);
  if (state.household) state.household.money = state.resources.money;
  const ledger = Base.ledger?.(state);
  if (ledger) ledger.otherMoney = round2((ledger.otherMoney || 0) + amount);

  const record = {
    id,
    label: Base.V170_BUSINESSES[id]?.label || id,
    money: amount,
    source: 'firstBuild',
    year: state.year,
    month: state.month,
    day: state.day
  };

  if (ORIGINAL_REWARD_IDS.includes(id)) {
    const rewards = state.householdMilestoneRewards;
    rewards.history ??= [];
    rewards.history.push(record);
    rewards.totalGranted = round2((rewards.totalGranted || 0) + amount);
    rewards.lastReward = record;
  } else {
    const progression = state.v170IndustryProgression;
    progression.rewardHistory ??= [];
    progression.rewardHistory.push(record);
    progression.totalRewardMoney = round2((progression.totalRewardMoney || 0) + amount);
    progression.lastReward = record;
  }

  addLog(state, 'reward', '产业建成奖励', `${record.label}首次建成，获得一次性奖励 +${amount}钱。`);
  return record;
}

function settleExistingBuiltRewards(state) {
  ensureV173(state);
  for (const id of BUSINESS_IDS) {
    if (Number(state.industry.businesses[id] || 0) > 0 && !rewardClaimed(state, id)) setRewardClaimed(state, id, true);
  }
}

function parseSave(raw) {
  if (typeof raw === 'string') return JSON.parse(raw);
  return JSON.parse(JSON.stringify(raw));
}

function prepareSaveForV170Deserialize(raw) {
  const parsed = parseSave(raw);
  const actualCounts = Object.fromEntries(BUSINESS_IDS.map(id => [id, Math.max(0, Math.floor(Number(parsed?.industry?.businesses?.[id]) || 0))]));
  const priorBaseClaims = parsed?.householdMilestoneRewards?.claimed
    ? Object.fromEntries(ORIGINAL_REWARD_IDS.map(id => [id, Boolean(parsed.householdMilestoneRewards.claimed[id])]))
    : null;
  const hadV170Progression = Number(parsed?.v170IndustryProgression?.version || 0) >= 170 && Boolean(parsed?.v170IndustryProgression?.claimedRewards);
  const priorNewClaims = hadV170Progression
    ? Object.fromEntries(NEW_REWARD_IDS.map(id => [id, Boolean(parsed.v170IndustryProgression.claimedRewards[id])]))
    : null;

  parsed.industry ??= { version: 170, businesses: {} };
  parsed.industry.businesses ??= {};
  for (const id of BUSINESS_IDS) parsed.industry.businesses[id] = Math.min(actualCounts[id], V173_BUSINESS_LIMITS[id]);

  if (parsed.householdMilestoneRewards?.claimed) {
    for (const id of ORIGINAL_REWARD_IDS) parsed.householdMilestoneRewards.claimed[id] = true;
  }

  if (!hadV170Progression) {
    parsed.v170IndustryProgression = {
      version: 170,
      unlocked: Object.fromEntries(NEW_REWARD_IDS.map(id => [id, false])),
      claimedRewards: Object.fromEntries(NEW_REWARD_IDS.map(id => [id, true])),
      history: [],
      rewardHistory: [],
      totalRewardMoney: 0,
      lastUnlock: null,
      lastReward: null
    };
  } else {
    for (const id of NEW_REWARD_IDS) parsed.v170IndustryProgression.claimedRewards[id] = true;
  }

  return { parsed, actualCounts, priorBaseClaims, priorNewClaims, hadV170Progression };
}

export function createGame(options) {
  const state = Core.createGame(options);
  ensureV173(state);
  getHouseholdUnlockStatus(state);
  getV170MilestoneStatus(state);
  return expose(state);
}

export function deserializeState(raw) {
  const prepared = prepareSaveForV170Deserialize(raw);
  const state = Base.deserializeState(JSON.stringify(prepared.parsed));
  ensureV173(state);

  for (const id of BUSINESS_IDS) state.industry.businesses[id] = prepared.actualCounts[id];

  if (prepared.priorBaseClaims) {
    for (const id of ORIGINAL_REWARD_IDS) setRewardClaimed(state, id, prepared.priorBaseClaims[id]);
  }
  if (prepared.hadV170Progression) {
    for (const id of NEW_REWARD_IDS) setRewardClaimed(state, id, prepared.priorNewClaims[id]);
  } else {
    for (const id of NEW_REWARD_IDS) setRewardClaimed(state, id, false);
  }

  settleExistingBuiltRewards(state);
  getHouseholdUnlockStatus(state);
  getV170MilestoneStatus(state);
  return expose(state);
}

export function buyBusiness(state, businessId, count = 1) {
  ensureV173(state);
  const definition = Base.V170_BUSINESSES?.[businessId];
  if (!definition) return { ok: false, message: '没有这种可购置产业。' };

  const amount = Number(count);
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, message: '产业购置数量必须是正整数。' };
  const owned = Math.max(0, Math.floor(Number(state.industry.businesses[businessId]) || 0));
  const limit = V173_BUSINESS_LIMITS[businessId];
  if (owned >= limit) return { ok: false, message: `${definition.label}已达产业上限 ${owned}/${limit}，不能继续购置。` };
  if (owned + amount > limit) return { ok: false, message: `${definition.label}最多还能购置${limit - owned}份，产业上限为${limit}。` };

  const claimedBefore = rewardClaimed(state, businessId);
  const result = withV173Context(state, () => Base.buyBusiness(state, businessId, amount));
  if (!result?.ok) return result;

  const ownedAfter = Math.max(0, Math.floor(Number(state.industry.businesses[businessId]) || 0));
  const buildReward = owned === 0 && ownedAfter > 0 && !claimedBefore ? grantBuildReward(state, businessId) : null;
  const postStatus = getHouseholdUnlockStatus(state);
  getV170MilestoneStatus(state);
  expose(state);

  const rewardText = buildReward ? ` 首次建成奖励 +${buildReward.money}钱已到账。` : '';
  return {
    ...result,
    owned: ownedAfter,
    ownershipLimit: limit,
    buildReward,
    buildRewardMoney: Number(buildReward?.money || 0),
    postUnlocks: postStatus.newlyUnlocked || [],
    message: `${result.message}${rewardText}`
  };
}

export function advanceDay(state) {
  ensureV173(state);
  return withV173Context(state, () => Base.advanceDay(state));
}

export function buyLand(state, acres = 1) {
  ensureV173(state);
  return withV173Context(state, () => Base.buyLand(state, acres));
}

export function sellGrain(state, amount) {
  ensureV173(state);
  return withV173Context(state, () => Base.sellGrain(state, amount));
}

export function resolveEvent(state, eventId, optionId) {
  ensureV173(state);
  return withV173Context(state, () => Base.resolveEvent(state, eventId, optionId));
}

export function performGuardianAction(state, ...args) {
  ensureV173(state);
  return withV173Context(state, () => Base.performGuardianAction(state, ...args));
}

export function continueAs(state, personId) {
  ensureV173(state);
  return withV173Context(state, () => Base.continueAs(state, personId));
}

export const __v173Test = Object.freeze({
  ensureV173,
  rewardClaimed,
  grantBuildReward,
  settleExistingBuiltRewards,
  withEffectiveIndustryCounts,
  withIndustryRewardsSuppressed
});
