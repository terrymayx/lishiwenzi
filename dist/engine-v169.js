import * as Base from './engine-v168.js?v=1.6.8';

export * from './engine-v168.js?v=1.6.8';

export const V169_UNLOCK_REWARDS = Object.freeze({
  landPurchase: 20,
  grainShop: 50,
  clothShop: 100,
  caravan: 200
});

const STAGE_ORDER = ['landPurchase', 'grainShop', 'clothShop', 'caravan'];
const STAGE_LABELS = Object.freeze({
  landPurchase: '置办田产',
  grainShop: '粮铺',
  clothShop: '布庄',
  caravan: '商队'
});

const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function blankClaimed() {
  return Object.fromEntries(STAGE_ORDER.map(id => [id, false]));
}

function ensureRewardState(state, { migrateLegacy = false } = {}) {
  if (!state) return null;
  const current = state.householdMilestoneRewards;
  if (current?.version === 169 && current.claimed) {
    for (const id of STAGE_ORDER) current.claimed[id] = Boolean(current.claimed[id]);
    current.history = Array.isArray(current.history) ? current.history : [];
    current.totalGranted = round2(current.totalGranted || 0);
    current.lastReward ??= null;
    return current;
  }

  const rewardState = {
    version: 169,
    claimed: blankClaimed(),
    history: [],
    totalGranted: 0,
    lastReward: null
  };

  if (migrateLegacy) {
    for (const id of STAGE_ORDER) {
      rewardState.claimed[id] = Boolean(state.householdProgression?.unlocked?.[id]);
    }
  }

  state.householdMilestoneRewards = rewardState;
  return rewardState;
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

function grantReward(state, id) {
  const rewards = ensureRewardState(state);
  if (!rewards || rewards.claimed[id]) return null;
  if (!state.householdProgression?.unlocked?.[id]) return null;

  const amount = Number(V169_UNLOCK_REWARDS[id] || 0);
  rewards.claimed[id] = true;
  if (amount <= 0) return null;

  state.resources.money = round2((state.resources.money || 0) + amount);
  syncMoney(state);
  recordRewardIncome(state, amount);

  const record = {
    id,
    label: STAGE_LABELS[id],
    money: amount,
    year: state.year,
    month: state.month,
    day: state.day
  };
  rewards.history.push(record);
  rewards.totalGranted = round2(rewards.totalGranted + amount);
  rewards.lastReward = record;
  addLog(state, 'reward', '家业里程碑奖励', `${record.label}已解锁，家中获得一次性里程碑奖励 +${amount}钱。`);
  return record;
}

function settlePendingRewards(state) {
  const granted = [];
  ensureRewardState(state);
  for (const id of STAGE_ORDER) {
    const record = grantReward(state, id);
    if (record) granted.push(record);
  }
  expose(state);
  return granted;
}

function enrichStatus(state, status, { newlyUnlocked = [], rewards = [] } = {}) {
  const rewardState = ensureRewardState(state);
  const enriched = { ...status };
  for (const id of STAGE_ORDER) {
    if (!status?.[id]) continue;
    enriched[id] = {
      ...status[id],
      rewardMoney: V169_UNLOCK_REWARDS[id],
      rewardClaimed: Boolean(rewardState?.claimed?.[id])
    };
  }
  enriched.newlyUnlocked = [...new Set(newlyUnlocked)];
  enriched.newRewards = rewards;
  enriched.newRewardMoney = round2(rewards.reduce((sum, item) => sum + Number(item.money || 0), 0));
  enriched.totalRewardMoney = round2(rewardState?.totalGranted || 0);
  enriched.lastReward = rewardState?.lastReward || null;
  return enriched;
}

function evaluateAndReward(state) {
  ensureRewardState(state);
  const newlyUnlocked = [];
  const granted = [];
  let status = Base.getHouseholdUnlockStatus(state);
  for (const id of status?.newlyUnlocked || []) newlyUnlocked.push(id);

  for (let pass = 0; pass <= STAGE_ORDER.length; pass += 1) {
    const rewards = settlePendingRewards(state);
    if (!rewards.length) break;
    granted.push(...rewards);
    status = Base.getHouseholdUnlockStatus(state);
    for (const id of status?.newlyUnlocked || []) newlyUnlocked.push(id);
  }

  return enrichStatus(state, status, { newlyUnlocked, rewards: granted });
}

export function createGame(options) {
  const state = Base.createGame(options);
  ensureRewardState(state, { migrateLegacy: false });
  evaluateAndReward(state);
  return expose(state);
}

export function deserializeState(raw) {
  const state = Base.deserializeState(raw);
  const hadV169Rewards = Number(state?.householdMilestoneRewards?.version || 0) >= 169;
  ensureRewardState(state, { migrateLegacy: !hadV169Rewards });
  if (hadV169Rewards) evaluateAndReward(state);
  return expose(state);
}

export function getHouseholdUnlockStatus(state) {
  return evaluateAndReward(state);
}

function settleAfterMutation(state, result) {
  const status = evaluateAndReward(state);
  if (!result || typeof result !== 'object') return result;
  if (!status.newRewardMoney) return result;
  return {
    ...result,
    milestoneRewards: status.newRewards,
    milestoneRewardMoney: status.newRewardMoney
  };
}

export function advanceDay(state) {
  return settleAfterMutation(state, Base.advanceDay(state));
}

export function buyLand(state, acres = 1) {
  return settleAfterMutation(state, Base.buyLand(state, acres));
}

export function buyBusiness(state, businessId, count = 1) {
  return settleAfterMutation(state, Base.buyBusiness(state, businessId, count));
}

export function sellGrain(state, amount) {
  return settleAfterMutation(state, Base.sellGrain(state, amount));
}

export function resolveEvent(state, eventId, optionId) {
  return settleAfterMutation(state, Base.resolveEvent(state, eventId, optionId));
}

export function performGuardianAction(state, ...args) {
  return settleAfterMutation(state, Base.performGuardianAction(state, ...args));
}

export function continueAs(state, personId) {
  return settleAfterMutation(state, Base.continueAs(state, personId));
}

export const __v169Test = Object.freeze({
  ensureRewardState,
  grantReward,
  settlePendingRewards,
  evaluateAndReward
});
