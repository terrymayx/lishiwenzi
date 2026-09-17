import * as Base from './engine-v180.js?v=1.8.1-base';
import * as Strict from './engine-v175.js?v=1.7.5-v182';

export * from './engine-v180.js?v=1.8.1-base';

export const V181_GUIDE_CASH_THRESHOLDS = Object.freeze({
  landPurchase: 40,
  mill: 100,
  grainShop: 220,
  clothShop: 500,
  oilPress: 1000,
  caravan: 1500,
  winery: 2200,
  inn: 3500,
  weavingWorkshop: 5500,
  paperMill: 8000,
  waterFleet: 15000
});

export const V182_EARLY_GUIDE_HINTS = Object.freeze([
  Object.freeze({
    turn: 1,
    title: '先谋生',
    text: '先选择“短工谋生”，再点击“度过本月”。前期先把现金和粮食稳定住。',
    detail: '钱用于买粮、置办田地和建设产业；粮每天自动消耗；体力过低会自动休养。'
  }),
  Object.freeze({
    turn: 2,
    title: '置办新田',
    text: '现金达到40钱后，当前任务会允许“置办新田”。达到门槛不算完成，必须真实购买至少1亩新田才完成任务。',
    detail: '实际买田成功后获得 +20钱完成奖励，并开启下一项家业目标。'
  }),
  Object.freeze({
    turn: 3,
    title: '田庄产粮',
    text: '母亲健在时可以免费照看前3亩田地，先利用好这份免费耕作能力。',
    detail: '田地会在夏收、秋收转化为粮食；超过母亲可照看的范围后，系统会自动安排付费农工。'
  }),
  Object.freeze({
    turn: 4,
    title: '第一份产业',
    text: '磨坊是第一份被动产业，建成后会每天自动带来收入，不占用主角的本月行动。',
    detail: '现金达到100钱且田地达到3亩后取得建设资格；实际建成仍需支付磨坊本身的建设费用。'
  }),
  Object.freeze({
    turn: 5,
    title: '产业扩张',
    text: '接下来关注粮铺等产业，让家庭收入逐步从短工转向稳定的产业收入。',
    detail: '粮铺当前任务现金门槛降为220钱；产业收益按天结算，并会汇总进每个月的月报。'
  })
]);

const ORIGINAL_PROGRESS_IDS = new Set(['landPurchase', 'grainShop', 'clothShop', 'caravan']);
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function currentCash(state) {
  return Math.max(0, round2(state?.resources?.money));
}

function cashCondition(state, id) {
  const required = Number(V181_GUIDE_CASH_THRESHOLDS[id] || 0);
  if (!required) return null;
  const current = currentCash(state);
  return {
    label: '现金',
    current,
    required,
    unit: '钱',
    met: current >= required,
    remaining: round2(Math.max(0, required - current)),
    cashGuide: true
  };
}

function replaceAssetWithCashCondition(state, id, conditions = []) {
  const cash = cashCondition(state, id);
  if (!cash) return [...conditions];
  let replaced = false;
  const next = (conditions || []).map(condition => {
    if (condition?.label !== '家产') return { ...condition };
    replaced = true;
    return cash;
  });
  if (!replaced) next.push(cash);
  return next;
}

function conditionsReady(conditions = []) {
  return conditions.length > 0 && conditions.every(condition => Boolean(condition?.met));
}

function patchCurrentHouseholdStatus(state, source) {
  const currentId = source?.guideCurrentId;
  if (!currentId || !V181_GUIDE_CASH_THRESHOLDS[currentId] || !source?.[currentId]) {
    return { ...source, cashValue: currentCash(state) };
  }
  const stage = source[currentId];
  if (stage.guideCompleted) return { ...source, cashValue: currentCash(state) };
  const conditions = replaceAssetWithCashCondition(state, currentId, stage.conditions || []);
  const ready = conditionsReady(conditions);
  return {
    ...source,
    cashValue: currentCash(state),
    newlyUnlocked: (source.newlyUnlocked || []).filter(id => id !== currentId || ready),
    [currentId]: {
      ...stage,
      conditions,
      unlocked: ready,
      allConditionsMet: ready,
      rewardAvailableOnBuild: Boolean(stage.rewardAvailableOnBuild) && ready,
      buildState: ready ? 'available' : 'locked'
    }
  };
}

function patchCurrentGuideStatus(state, source) {
  const currentId = source?.current?.id;
  if (!currentId || !V181_GUIDE_CASH_THRESHOLDS[currentId]) return source;
  const current = source.current;
  const conditions = replaceAssetWithCashCondition(state, currentId, current.conditions || []);
  const ready = conditionsReady(conditions);
  const patchedCurrent = {
    ...current,
    conditions,
    thresholdReady: current.completed ? true : ready,
    canComplete: Boolean(current.current) && ready
  };
  const list = (source.list || []).map(item => item.id === currentId ? patchedCurrent : item);
  const byId = { ...(source.byId || {}), [currentId]: patchedCurrent };
  return {
    ...source,
    list,
    byId,
    current: patchedCurrent,
    cashValue: currentCash(state)
  };
}

function missingCurrentGuideMessage(current) {
  const missing = (current?.conditions || []).filter(condition => !condition.met);
  if (!missing.length) return `${current?.label || '当前任务'}尚未具备执行条件。`;
  const detail = missing.map(condition => {
    if (condition.label === '现金') return `现金还差${condition.remaining}${condition.unit || '钱'}`;
    if (condition.label?.startsWith('已有')) return condition.label;
    return `${condition.label}还差${condition.remaining}${condition.unit || ''}`;
  }).join('，');
  return `${current?.label || '当前任务'}尚未具备执行条件：${detail}。`;
}

function unlockUnderlyingCurrent(state, id) {
  if (!state || !id) return;
  if (ORIGINAL_PROGRESS_IDS.has(id)) {
    state.householdProgression ??= { unlocked: {} };
    state.householdProgression.unlocked ??= {};
    state.householdProgression.unlocked[id] = true;
    return;
  }
  state.v170IndustryProgression ??= { version: 170, unlocked: {}, claimedRewards: {}, history: [], rewardHistory: [] };
  state.v170IndustryProgression.unlocked ??= {};
  state.v170IndustryProgression.unlocked[id] = true;
}

export function getHouseholdUnlockStatus(state) {
  return patchCurrentHouseholdStatus(state, Strict.getHouseholdUnlockStatus(state));
}

export function getV174GuideStatus(state) {
  return patchCurrentGuideStatus(state, Strict.getV174GuideStatus(state));
}

export function buyLand(state, acres = 1) {
  const guide = getV174GuideStatus(state);
  if (guide.current?.id === 'landPurchase') {
    if (!guide.current.thresholdReady) return { ok: false, message: missingCurrentGuideMessage(guide.current) };
    unlockUnderlyingCurrent(state, 'landPurchase');
  }
  return Strict.buyLand(state, acres);
}

export function buyBusiness(state, businessId, count = 1) {
  const guide = getV174GuideStatus(state);
  if (guide.current?.id === businessId) {
    if (!guide.current.thresholdReady) return { ok: false, message: missingCurrentGuideMessage(guide.current) };
    unlockUnderlyingCurrent(state, businessId);
  }
  return Strict.buyBusiness(state, businessId, count);
}

export function getEarlyGuideHint(state) {
  if (!state || state.endpoint) return null;
  const status = Base.getMonthTurnStatus(state);
  const turn = status.active ? Math.max(1, Number(status.turn || 1)) : Number(status.turn || 0) + 1;
  const hint = V182_EARLY_GUIDE_HINTS[turn - 1];
  return hint ? { ...hint } : null;
}
