import * as Base from './engine-v163.js?v=1.6.3';

export * from './engine-v163.js?v=1.6.3';

export const V164_UNLOCKS = Object.freeze({
  landPurchase: Object.freeze({ assetValue: 80 }),
  grainShop: Object.freeze({ assetValue: 350, land: 6 }),
  clothShop: Object.freeze({ assetValue: 700, land: 12, requiresBusiness: 'grainShop' }),
  caravan: Object.freeze({ assetValue: 1500, businessTypes: 2 })
});

export const V164_WORK_POLICY = Object.freeze({
  onlyCurrentProtagonistWorks: true
});

const STAGE_META = Object.freeze({
  landPurchase: Object.freeze({
    label: '置办田产',
    storyTitle: '乡里有人卖田',
    story: '这些年省吃俭用，家里终于有了一点底子。乡里开始有人愿意把田地卖给你，从今天起，可以正式置办更多田产。'
  }),
  grainShop: Object.freeze({
    label: '粮铺',
    storyTitle: '粮行掌柜的邀请',
    story: '家中已有数亩田地，也积下一笔家产。县里的粮商开始把你当成正经的经营户，粮铺这条路终于向家门打开。'
  }),
  clothShop: Object.freeze({
    label: '布庄',
    storyTitle: '布商登门',
    story: '田庄与粮铺让家门站稳了脚跟，往来的商户也多了起来。布商愿意与你合做生意，布庄由此解锁。'
  }),
  caravan: Object.freeze({
    label: '商队',
    storyTitle: '行商邀约',
    story: '家业已经不再局限于一处田庄或铺面。多路商户愿意与你合伙组织远行商队，家门正式迈入更大的商路。'
  })
});

const STAGE_ORDER = ['landPurchase', 'grainShop', 'clothShop', 'caravan'];
const round = value => Math.round((Number(value) || 0) * 100) / 100;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function neutralizeNonPlayerWork(state) {
  if (!state) return state;
  const agriculture = Base.ensureFamilyWork?.(state);
  const work = agriculture?.work;
  if (!work?.assignments) return state;

  for (const person of Object.values(state.people || {})) {
    if (!person?.alive || person.id === state.playerId || person.familyId !== state.family?.id) continue;
    const current = work.assignments[person.id];
    if (person.age < 16) {
      work.assignments[person.id] = 'study';
    } else if (!['study', 'rest'].includes(current)) {
      work.assignments[person.id] = 'rest';
    }
    if (work.recovering) work.recovering[person.id] = false;
  }
  return state;
}

function ownedBusinessTypes(state) {
  const businesses = Base.ensureIndustry?.(state)?.businesses || state?.industry?.businesses || {};
  return ['grainShop', 'clothShop', 'caravan'].filter(id => Number(businesses[id] || 0) > 0).length;
}

function ensureProgression(state, { migrateLegacy = false } = {}) {
  if (!state) return null;
  const previous = state.householdProgression;
  if (previous?.version === 164 && previous.unlocked) {
    previous.unlockHistory ??= [];
    previous.lastUnlock ??= null;
    for (const id of STAGE_ORDER) previous.unlocked[id] = Boolean(previous.unlocked[id]);
    return previous;
  }

  const progression = {
    version: 164,
    unlocked: {
      landPurchase: Boolean(previous?.unlocked?.landPurchase),
      grainShop: Boolean(previous?.unlocked?.grainShop),
      clothShop: Boolean(previous?.unlocked?.clothShop),
      caravan: Boolean(previous?.unlocked?.caravan)
    },
    unlockHistory: Array.isArray(previous?.unlockHistory) ? [...previous.unlockHistory] : [],
    lastUnlock: previous?.lastUnlock || null
  };

  if (migrateLegacy) {
    const businesses = Base.ensureIndustry?.(state)?.businesses || {};
    if (Number(state.household?.land || 0) > 0) progression.unlocked.landPurchase = true;
    if (Number(businesses.grainShop || 0) > 0) progression.unlocked.grainShop = true;
    if (Number(businesses.clothShop || 0) > 0) progression.unlocked.clothShop = true;
    if (Number(businesses.caravan || 0) > 0) progression.unlocked.caravan = true;
  }

  state.householdProgression = progression;
  return progression;
}

function numericCondition(label, current, required, unit = '') {
  const value = round(current);
  const need = round(required);
  return {
    label,
    current: value,
    required: need,
    unit,
    met: value >= need,
    remaining: round(Math.max(0, need - value))
  };
}

function businessCondition(label, count) {
  const current = Number(count || 0) > 0 ? 1 : 0;
  return { label, current, required: 1, unit: '', met: current >= 1, remaining: current >= 1 ? 0 : 1 };
}

function stageConditions(state, id) {
  const assetValue = Base.getHouseholdAssetValue(state);
  const land = Math.max(0, Number(state.household?.land || 0));
  const businesses = Base.ensureIndustry?.(state)?.businesses || state?.industry?.businesses || {};
  if (id === 'landPurchase') {
    return [numericCondition('家产', assetValue, V164_UNLOCKS.landPurchase.assetValue, '钱')];
  }
  if (id === 'grainShop') {
    return [
      numericCondition('田地', land, V164_UNLOCKS.grainShop.land, '亩'),
      numericCondition('家产', assetValue, V164_UNLOCKS.grainShop.assetValue, '钱')
    ];
  }
  if (id === 'clothShop') {
    return [
      numericCondition('田地', land, V164_UNLOCKS.clothShop.land, '亩'),
      numericCondition('家产', assetValue, V164_UNLOCKS.clothShop.assetValue, '钱'),
      businessCondition('已有粮铺', businesses.grainShop)
    ];
  }
  if (id === 'caravan') {
    return [
      numericCondition('家产', assetValue, V164_UNLOCKS.caravan.assetValue, '钱'),
      numericCondition('商业产业种类', ownedBusinessTypes(state), V164_UNLOCKS.caravan.businessTypes, '种')
    ];
  }
  return [];
}

function recordUnlock(state, id) {
  const progression = ensureProgression(state);
  if (!progression || progression.unlocked[id]) return false;
  progression.unlocked[id] = true;
  const meta = STAGE_META[id];
  const record = {
    id,
    label: meta.label,
    title: meta.storyTitle,
    text: meta.story,
    year: state.year,
    month: state.month,
    day: state.day
  };
  progression.unlockHistory.push(record);
  progression.lastUnlock = record;
  addLog(state, 'unlock', meta.storyTitle, `${meta.story}【解锁：${meta.label}】`);
  return true;
}

function evaluateUnlocks(state) {
  const progression = ensureProgression(state);
  const newlyUnlocked = [];
  if (!progression) return newlyUnlocked;
  for (const id of STAGE_ORDER) {
    if (progression.unlocked[id]) continue;
    const conditions = stageConditions(state, id);
    if (conditions.length && conditions.every(condition => condition.met)) {
      if (recordUnlock(state, id)) newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

function stageStatus(state, id) {
  const progression = ensureProgression(state);
  const conditions = stageConditions(state, id);
  const meta = STAGE_META[id];
  return {
    id,
    label: meta.label,
    unlocked: Boolean(progression?.unlocked?.[id]),
    conditions,
    allConditionsMet: conditions.length > 0 && conditions.every(condition => condition.met),
    storyTitle: meta.storyTitle,
    story: meta.story
  };
}

export function getHouseholdUnlockStatus(state) {
  ensureProgression(state);
  const newlyUnlocked = evaluateUnlocks(state);
  const assetValue = Base.getHouseholdAssetValue(state);
  return {
    assetValue,
    newlyUnlocked,
    lastUnlock: state?.householdProgression?.lastUnlock || null,
    landPurchase: stageStatus(state, 'landPurchase'),
    grainShop: stageStatus(state, 'grainShop'),
    clothShop: stageStatus(state, 'clothShop'),
    caravan: stageStatus(state, 'caravan')
  };
}

export function getFamilyWorkAssignments(state) {
  neutralizeNonPlayerWork(state);
  return Base.getFamilyWorkAssignments(state).map(job => job.personId === state.playerId
    ? job
    : { ...job, dailyIncome: 0, farmCapacity: 0 });
}

export function getFarmSummary(state) {
  neutralizeNonPlayerWork(state);
  return Base.getFarmSummary(state);
}

export function getHouseholdBudget(state) {
  neutralizeNonPlayerWork(state);
  return Base.getHouseholdBudget(state);
}

export function setFamilyWorkAssignment(state, id, job) {
  if (!state?.people?.[id]) return { ok: false, message: '未找到该人物。' };
  if (id !== state.playerId) {
    neutralizeNonPlayerWork(state);
    return { ok: false, message: '只有当前执笔人本人可以指派工作；母亲和其他家属不参与挣钱任务。' };
  }
  return Base.setFamilyWorkAssignment(state, id, job);
}

function missingRequirementMessage(stage) {
  const missing = stage.conditions.filter(condition => !condition.met);
  if (!missing.length) return `${stage.label}尚未解锁。`;
  const text = missing.map(condition => {
    if (condition.label.startsWith('已有')) return condition.label;
    return `${condition.label}还差${condition.remaining}${condition.unit}`;
  }).join('，');
  return `${stage.label}尚未解锁：${text}。`;
}

function prepareNew(state) {
  neutralizeNonPlayerWork(state);
  ensureProgression(state, { migrateLegacy: false });
  evaluateUnlocks(state);
  return expose(state);
}

function prepareLoaded(state, hadProgression) {
  neutralizeNonPlayerWork(state);
  ensureProgression(state, { migrateLegacy: !hadProgression });
  evaluateUnlocks(state);
  return expose(state);
}

export function createGame(options) {
  return prepareNew(Base.createGame(options));
}

export function deserializeState(raw) {
  const state = Base.deserializeState(raw);
  const hadProgression = Boolean(state?.householdProgression);
  return prepareLoaded(state, hadProgression);
}

export function buyLand(state, acres = 1) {
  const status = getHouseholdUnlockStatus(state);
  if (!status.landPurchase.unlocked) {
    return { ok: false, message: missingRequirementMessage(status.landPurchase) };
  }
  const result = Base.buyLand(state, acres);
  if (result?.ok) evaluateUnlocks(state);
  return result;
}

export function buyBusiness(state, businessId, count = 1) {
  const status = getHouseholdUnlockStatus(state);
  const stage = status[businessId];
  if (stage && !stage.unlocked) {
    return { ok: false, message: missingRequirementMessage(stage) };
  }
  const result = Base.buyBusiness(state, businessId, count);
  if (result?.ok) evaluateUnlocks(state);
  return result;
}

export function advanceDay(state) {
  neutralizeNonPlayerWork(state);
  ensureProgression(state);
  const result = Base.advanceDay(state);
  neutralizeNonPlayerWork(state);
  if (result?.ok) evaluateUnlocks(state);
  expose(state);
  return result;
}
