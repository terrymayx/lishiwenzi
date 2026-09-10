import * as Base from './engine-v15.js?v=1.5.0';

export * from './engine-v15.js?v=1.5.0';

export const V151_RULES = Object.freeze({
  REPUTATION_UNLOCK: 15,
  ASSET_UNLOCK: 120,
  REPUTATION_AFFLUENT: 30,
  ASSET_AFFLUENT: 220,
  REPUTATION_ELITE: 50,
  ASSET_ELITE: 400
});

export const V153_RULES = Object.freeze({
  DONATION_MONEY_PER_REPUTATION: 1000
});

const MARKET_BANDS = Object.freeze({
  ordinary: { id: 'ordinary', label: '普通婚配', minProfile: 0, maxProfile: 1 },
  affluent: { id: 'affluent', label: '殷实婚配', minProfile: 1, maxProfile: 2 },
  elite: { id: 'elite', label: '门第婚配', minProfile: 2, maxProfile: 4 }
});

const FAMILY_PROFILES = Object.freeze([
  { label: '乡里农户', profession: 'farmer', baseCost: 14, skill: 'trade' },
  { label: '手艺人家', profession: 'artisan', baseCost: 20, skill: 'trade' },
  { label: '小商户', profession: 'trader', baseCost: 28, skill: 'trade' },
  { label: '地方吏户旁支', profession: 'clerk', baseCost: 36, skill: 'knowledge' },
  { label: '旧族旁支', profession: 'clerk', baseCost: 46, skill: 'knowledge' }
]);

const FEMALE_NAMES = ['李氏', '王氏', '张氏', '刘氏', '赵氏', '郭氏', '崔氏', '卢氏'];
const MALE_NAMES = ['李安', '王恭', '张弘', '刘靖', '赵谦', '郭宁', '崔和', '卢允'];
const MEDIATORS = ['王媒婆', '李媒婆', '刘媒人', '赵媒婆'];
const TRAITS = ['勤俭', '温厚', '坚韧', '谨慎', '爽利', '好学', '善农', '善理家'];

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const round = n => Math.round((Number(n) || 0) * 100) / 100;
const monthKey = s => `${s.year}-${s.month}-${s.playerId || 'none'}`;
const nextRng = current => (Math.imul(current >>> 0, 1664525) + 1013904223) >>> 0;

function random(s) {
  s.rngState = nextRng((Number(s.rngState) >>> 0) || 1);
  return s.rngState / 4294967296;
}
function pick(s, list) {
  return list[Math.min(list.length - 1, Math.floor(random(s) * list.length))];
}
function current(s) {
  return s?.playerId ? s.people?.[s.playerId] || null : null;
}
function expose(s) {
  if (typeof window !== 'undefined' && s) window.__luanshiState = s;
  return s;
}

function householdAssetIds(s) {
  const ids = new Set();
  for (const household of s?.family?.households || []) {
    for (const id of household.assets || []) ids.add(id);
  }
  return ids;
}

export function getHouseholdAssetValue(s) {
  if (!s) return 0;
  const ids = householdAssetIds(s);
  let propertyValue = 0;
  for (const asset of s.assets || []) {
    if (ids.size && !ids.has(asset.id)) continue;
    propertyValue += Math.max(0, Number(asset.value) || 0);
  }
  return round(Math.max(0, Number(s.resources?.money) || 0) + propertyValue);
}

export function getMarriageMarketStatus(s) {
  const reputation = Math.max(0, Number(s?.resources?.reputation) || 0);
  const assetValue = getHouseholdAssetValue(s);
  const eligible = reputation >= V151_RULES.REPUTATION_UNLOCK && assetValue >= V151_RULES.ASSET_UNLOCK;
  let band = 'locked';
  if (eligible) {
    band = reputation >= V151_RULES.REPUTATION_ELITE && assetValue >= V151_RULES.ASSET_ELITE ? 'elite'
      : reputation >= V151_RULES.REPUTATION_AFFLUENT && assetValue >= V151_RULES.ASSET_AFFLUENT ? 'affluent'
      : 'ordinary';
  }
  return {
    eligible,
    band,
    label: band === 'locked' ? '尚未进入婚配范围' : MARKET_BANDS[band].label,
    reputation: round(reputation),
    assetValue,
    reputationRequired: V151_RULES.REPUTATION_UNLOCK,
    assetRequired: V151_RULES.ASSET_UNLOCK,
    nextReputation: band === 'ordinary' ? V151_RULES.REPUTATION_AFFLUENT : band === 'affluent' ? V151_RULES.REPUTATION_ELITE : null,
    nextAsset: band === 'ordinary' ? V151_RULES.ASSET_AFFLUENT : band === 'affluent' ? V151_RULES.ASSET_ELITE : null
  };
}

export function donateForReputation(s, amount = V153_RULES.DONATION_MONEY_PER_REPUTATION) {
  const spend = Number(amount);
  const unit = V153_RULES.DONATION_MONEY_PER_REPUTATION;
  if (!s?.resources) return { ok: false, message: '当前没有可使用的家门资源。' };
  if (!Number.isInteger(spend) || spend < unit || spend % unit !== 0) {
    return { ok: false, message: `捐款必须是${unit}钱的整数倍。` };
  }
  if (s.running || s.phase !== 'playing' || s.pendingEvent || s.endpoint) {
    return { ok: false, message: '请先暂停时间并处理完当前事件，再捐钱求名。' };
  }
  const money = Math.max(0, Number(s.resources.money) || 0);
  if (money < spend) {
    return { ok: false, message: `现钱不足，需要${spend}钱才能完成这次捐赠。` };
  }
  const reputationGained = spend / unit;
  s.resources.money = round(money - spend);
  s.resources.reputation = round((Number(s.resources.reputation) || 0) + reputationGained);
  expose(s);
  return {
    ok: true,
    spent: spend,
    reputationGained,
    message: `捐出${spend}钱赈济乡里，声望 +${reputationGained}。`
  };
}

function baseMarriageEligible(s, target = current(s)) {
  if (!target?.alive || target.married || target.age < 18) return false;
  if (target.sex === '女' && target.age > 45) return false;
  if (target.sex !== '女' && target.age > 60) return false;
  const f = Base.ensureFamilyLife(s);
  return !f.wedding && !f.pendingCandidate && s.elapsedDays >= f.matchmakerCooldownUntil;
}

function generateCandidate(s, target) {
  const status = getMarriageMarketStatus(s);
  if (!status.eligible) return null;
  const band = MARKET_BANDS[status.band];
  const profileTier = band.minProfile + Math.floor(random(s) * (band.maxProfile - band.minProfile + 1));
  const profile = FAMILY_PROFILES[profileTier];
  const sex = target.sex === '女' ? '男' : '女';
  const name = pick(s, sex === '女' ? FEMALE_NAMES : MALE_NAMES);
  const age = clamp(Math.floor(target.age) + Math.floor(random(s) * 7) - 3, 18, 45);
  const health = 66 + Math.floor(random(s) * 25);
  const traits = [...new Set([pick(s, TRAITS), pick(s, TRAITS)])];
  const skills = { knowledge: 1, martial: 1, trade: 1, social: 1, strategy: 1 };
  skills[profile.skill] += 2 + profileTier * 0.5;
  if (profile.profession === 'farmer') skills.trade += 1;
  return {
    name,
    age,
    sex,
    health,
    traits,
    skills,
    profession: profile.profession,
    familyLabel: profile.label,
    bridePrice: profile.baseCost + Math.floor(random(s) * 6) * 2,
    mediator: pick(s, MEDIATORS),
    tier: profileTier,
    profileTier,
    marketBand: status.band,
    marketLabel: status.label
  };
}

export function queueMatchmaker(s, overrides = {}) {
  const target = current(s);
  if (!baseMarriageEligible(s, target) || !getMarriageMarketStatus(s).eligible) return null;
  const candidate = { ...generateCandidate(s, target), ...overrides };
  candidate.profileTier ??= candidate.tier ?? 0;
  candidate.marketBand ??= getMarriageMarketStatus(s).band;
  candidate.marketLabel ??= MARKET_BANDS[candidate.marketBand]?.label || '普通婚配';
  return Base.__v15Test.queueMatchmaker(s, candidate);
}

function nextMonthKey(s) {
  let year = Number(s.year) || 0;
  let month = Number(s.month) || 1;
  let day = (Number(s.day) || 1) + 1;
  const days = Base.MONTH_DAYS?.[month - 1] || 30;
  if (day > days) {
    day = 1;
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return `${year}-${month}-${s.playerId || 'none'}`;
}

function prepare(s) {
  if (!s) return s;
  const f = Base.ensureFamilyLife(s);
  if (!('v151MarriageCheckKey' in f)) f.v151MarriageCheckKey = monthKey(s);
  f.marketPolicyVersion = 152;
  return expose(s);
}

function maybeTieredMarriageEvent(s) {
  prepare(s);
  const f = Base.ensureFamilyLife(s);
  if (!s || s.pendingEvent || s.phase !== 'playing' || s.endpoint || f.wedding) return null;
  const target = current(s);
  if (!target?.alive || target.married) return null;
  const key = monthKey(s);
  if (f.v151MarriageCheckKey === key) return null;
  f.v151MarriageCheckKey = key;
  if (!baseMarriageEligible(s, target)) return null;
  const status = getMarriageMarketStatus(s);
  if (!status.eligible) return null;
  if (random(s) >= Base.V15_RULES.MATCHMAKER_BASE_CHANCE) return null;
  return queueMatchmaker(s);
}

export function maybeFamilyLifeEvent(s) {
  prepare(s);
  const target = current(s);
  if (target?.married) return Base.maybeFamilyLifeEvent(s);
  return maybeTieredMarriageEvent(s);
}

export function createGame(options) {
  return prepare(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepare(Base.deserializeState(raw));
}

export function advanceDay(s) {
  prepare(s);
  const target = current(s);
  if (target?.alive && !target.married) {
    // Prevent V1.5's unrestricted monthly matchmaker roll; V1.5.2 owns that roll.
    Base.ensureFamilyLife(s).marriageCheckKey = nextMonthKey(s);
  }
  let result = Base.advanceDay(s);
  if (!result?.ok) return result;
  prepare(s);
  if (!s.pendingEvent && s.phase === 'playing' && !s.endpoint && !result.paused) {
    const event = maybeTieredMarriageEvent(s);
    if (event) result = { ...result, paused: true, reason: s.pauseReason };
  }
  return expose(s) && result;
}

export const __v15Test = {
  ...Base.__v15Test,
  queueMatchmaker(s, overrides = {}) { return queueMatchmaker(s, overrides); },
  getMarriageMarketStatus(s) { return getMarriageMarketStatus(s); },
  generateCandidate(s) {
    const target = current(s);
    return target ? generateCandidate(s, target) : null;
  }
};
