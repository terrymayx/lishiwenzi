import * as Base from './engine-v14.js?base=1.4.2';
import * as Rules from './v14-rules.js?v=1.4.1';

export * from './engine-v14.js?base=1.4.2';

export const V15_RULES = Object.freeze({
  MATCHMAKER_BASE_CHANCE: 0.22,
  MATCHMAKER_REJECT_MIN_DAYS: 90,
  MATCHMAKER_REJECT_MAX_DAYS: 180,
  WEDDING_PREP_DAYS: 15,
  PREGNANCY_DAYS: 270,
  POSTPARTUM_COOLDOWN_DAYS: 360,
  DOCTOR_COST: 8,
  PREGNANCY_MIN_HEALTH: 45,
  PREGNANCY_MAX_HUNGER: 60
});

const FAMILY_EVENT_SOURCES = new Set(['family-marriage', 'family-pregnancy', 'family-birth']);
const FEMALE_NAMES = ['李氏', '王氏', '张氏', '刘氏', '赵氏', '郭氏', '崔氏', '卢氏'];
const MALE_NAMES = ['李安', '王恭', '张弘', '刘靖', '赵谦', '郭宁', '崔和', '卢允'];
const CHILD_NAMES = ['安', '宁', '和', '昭', '清', '彦', '容', '仪', '谦', '晏', '柔', '恭'];
const MEDIATORS = ['王媒婆', '李媒婆', '刘媒人', '赵媒婆'];
const TRAITS = ['勤俭', '温厚', '坚韧', '谨慎', '爽利', '好学', '善农', '善理家'];
const FAMILY_TIERS = [
  { label: '乡里农户', profession: 'farmer', baseCost: 14, skill: 'trade' },
  { label: '手艺人家', profession: 'artisan', baseCost: 20, skill: 'trade' },
  { label: '小商户', profession: 'trader', baseCost: 28, skill: 'trade' },
  { label: '地方吏户旁支', profession: 'clerk', baseCost: 36, skill: 'knowledge' },
  { label: '旧族旁支', profession: 'clerk', baseCost: 46, skill: 'knowledge' }
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const round = n => Math.round((Number(n) || 0) * 100) / 100;
const monthKey = s => `${s.year}-${s.month}-${s.playerId || 'none'}`;
const nextRng = current => (Math.imul(current >>> 0, 1664525) + 1013904223) >>> 0;
function random(s) {
  s.rngState = nextRng((Number(s.rngState) >>> 0) || 1);
  return s.rngState / 4294967296;
}
function pick(s, list) { return list[Math.min(list.length - 1, Math.floor(random(s) * list.length))]; }
function log(s, kind, title, text) {
  s.eventLog ??= [];
  s.eventLog.push({ year: s.year, month: s.month, day: s.day, kind, title, text });
}
function expose(s) { if (typeof window !== 'undefined' && s) window.__luanshiState = s; return s; }
function current(s) { return s?.playerId ? s.people?.[s.playerId] || null : null; }

export function ensureFamilyLife(s) {
  if (!s) return null;
  s.familyLife ??= {};
  const f = s.familyLife;
  f.policyVersion = 150;
  if (!('wedding' in f)) f.wedding = null;
  if (!('pregnancy' in f)) f.pregnancy = null;
  if (!('pendingCandidate' in f)) f.pendingCandidate = null;
  if (!Number.isFinite(Number(f.matchmakerCooldownUntil))) f.matchmakerCooldownUntil = 0;
  if (!Number.isFinite(Number(f.eventSerial))) f.eventSerial = 0;
  if (!('birthEventQueued' in f)) f.birthEventQueued = false;

  // Migrate the old direct-pregnancy field before the base engine can auto-deliver it.
  if (!f.pregnancy) {
    const legacyMother = Object.values(s.people || {}).find(p => p?.alive && p.pregnancy?.remainingDays > 0);
    if (legacyMother) {
      f.pregnancy = {
        motherId: legacyMother.id,
        fatherId: legacyMother.pregnancy.fatherId,
        remainingDays: Math.max(1, Number(legacyMother.pregnancy.remainingDays) || V15_RULES.PREGNANCY_DAYS),
        startedElapsedDay: legacyMother.pregnancy.startedElapsedDay ?? s.elapsedDays,
        care: 'normal',
        migrated: true
      };
      legacyMother.pregnancy = null;
      legacyMother.birthCooldownDays = 0;
      log(s, 'story', '孕事转入新制', `${legacyMother.name}已有的孕期继续保留，今后会在临盆时自动暂停。`);
    }
  }

  if (!f.marriageCheckKey) f.marriageCheckKey = monthKey(s);
  if (!f.pregnancyCheckKey) f.pregnancyCheckKey = monthKey(s);

  if (!f.legacyActionMigrated && ['marry', 'child'].includes(s.currentActivity?.id)) {
    const old = s.currentActivity.id;
    s.currentActivity = null;
    s.running = false;
    s.pauseReason = '旧版主动婚育行动已取消，请重新选择日常行动；婚育今后由人生事件触发';
    f.legacyActionMigrated = true;
    log(s, 'story', '婚育规则更新', old === 'marry'
      ? '旧版“筹办婚事”主动行动已停止，今后等待媒人上门。'
      : '旧版“商议添丁”主动行动已停止，今后由婚后随机有孕触发。');
  }
  return f;
}

function queueFamilyEvent(s, event, source) {
  s.pendingEvent = { ...event, source };
  s.running = false;
  s.pauseReason = source === 'family-marriage' ? '媒人登门，等待婚事决定'
    : source === 'family-pregnancy' ? '家中有孕，等待照护决定'
    : '临盆在即，时间自动暂停';
  log(s, 'story', event.title, event.text);
  return s.pendingEvent;
}

function marriageEligible(s, person = current(s)) {
  if (!person?.alive || person.married || person.age < 18) return false;
  if (person.sex === '女' && person.age > 45) return false;
  if (person.sex !== '女' && person.age > 60) return false;
  const f = ensureFamilyLife(s);
  return !f.wedding && !f.pendingCandidate && s.elapsedDays >= f.matchmakerCooldownUntil;
}

function candidateTier(s) {
  const score = Number(s.resources?.reputation || 0) + Number(s.household?.land || 0) * 4 + Number(s.resources?.money || 0) / 12;
  return clamp(Math.floor(score / 24), 0, FAMILY_TIERS.length - 1);
}

function generateCandidate(s, target) {
  const maxTier = candidateTier(s);
  const tier = Math.floor(random(s) * (maxTier + 1));
  const profile = FAMILY_TIERS[tier];
  const sex = target.sex === '女' ? '男' : '女';
  const name = pick(s, sex === '女' ? FEMALE_NAMES : MALE_NAMES);
  const age = clamp(Math.floor(target.age) + Math.floor(random(s) * 7) - 3, 18, 45);
  const health = 66 + Math.floor(random(s) * 25);
  const traits = [...new Set([pick(s, TRAITS), pick(s, TRAITS)])];
  const skills = { knowledge: 1, martial: 1, trade: 1, social: 1, strategy: 1 };
  skills[profile.skill] += 2 + tier * 0.5;
  if (profile.profession === 'farmer') skills.trade += 1;
  const bridePrice = profile.baseCost + Math.floor(random(s) * 6) * 2;
  return {
    name, age, sex, health, traits, skills,
    profession: profile.profession,
    familyLabel: profile.label,
    bridePrice,
    mediator: pick(s, MEDIATORS),
    tier
  };
}

export function queueMatchmaker(s, overrides = {}) {
  const target = current(s);
  if (!marriageEligible(s, target)) return null;
  const f = ensureFamilyLife(s);
  const candidate = { ...generateCandidate(s, target), ...overrides };
  candidate.costLabel = target.sex === '女' ? '婚仪钱物' : '聘礼';
  f.pendingCandidate = candidate;
  const id = `matchmaker-${s.elapsedDays}-${++f.eventSerial}`;
  const traitText = (candidate.traits || []).join('、') || '尚待相处';
  const text = `${candidate.mediator}登门，说${candidate.familyLabel}的${candidate.name}年${Math.floor(candidate.age)}，` +
    `身体约${Math.round(candidate.health)}，性情听来是${traitText}。若应下婚事，需备${candidate.costLabel}${candidate.bridePrice}钱，随后筹备十五日。`;
  return queueFamilyEvent(s, {
    id,
    title: '媒人登门',
    text,
    familyData: { targetId: target.id, candidate },
    options: [
      { id: 'accept', label: `应下婚事 · ${candidate.costLabel}${candidate.bridePrice}钱`, consequence: `支付${candidate.bridePrice}钱，进入15日婚事筹备`, disabled: Number(s.resources.money) < candidate.bridePrice },
      { id: 'reject', label: '婉言谢绝', consequence: '暂不成婚，数月后仍可能再有人说媒', disabled: false }
    ]
  }, 'family-marriage');
}

function createSpouse(s, target, candidate) {
  const id = `person-${s.nextId++}`;
  const spouse = {
    id,
    name: candidate.name,
    age: Number(candidate.age),
    role: 'spouse',
    sex: candidate.sex,
    origin: s.origin,
    alive: true,
    health: clamp(candidate.health, 1, 100),
    hunger: 0,
    married: true,
    spouseId: target.id,
    childrenIds: [],
    parentId: null,
    parentIds: [],
    familyId: s.family.id,
    bloodlineFromRoot: false,
    skills: { knowledge: 1, martial: 1, trade: 1, social: 1, strategy: 1, ...(candidate.skills || {}) },
    profession: candidate.profession || 'farmer',
    traits: [...(candidate.traits || ['谨慎'])],
    location: target.location || s.region,
    generation: Number(target.generation) || 0,
    notes: [`由${candidate.mediator || '媒人'}说合成婚`],
    lifespan: 78 + Math.floor(random(s) * 12),
    pregnancy: null,
    birthCooldownDays: 0,
    warningLogged: false
  };
  s.people[id] = spouse;
  target.married = true;
  target.spouseId = id;
  s.family.households?.[0]?.memberIds?.push(id);
  const relation = { type: '婚姻', trust: 55, from: target.id, to: id };
  s.relations[`${target.id}:${id}`] = relation;
  s.relations[`${id}:${target.id}`] = { ...relation, from: id, to: target.id };
  Rules.ensureFamilyWork(s);
  return spouse;
}

function completeWedding(s) {
  const f = ensureFamilyLife(s);
  const wedding = f.wedding;
  if (!wedding) return null;
  const target = s.people?.[wedding.targetId];
  if (!target?.alive || target.married) {
    log(s, 'story', '婚事中止', '原定婚事因人物状态变化未能继续。已付钱物不退。');
    f.wedding = null;
    return null;
  }
  const spouse = createSpouse(s, target, wedding.candidate);
  f.wedding = null;
  f.pendingCandidate = null;
  f.lastMarriageElapsedDay = s.elapsedDays;
  log(s, 'story', '婚事办妥', `${target.name}与${spouse.name}成婚，新的姻亲已经加入家谱。`);
  Rules.sync(s);
  return spouse;
}

function pregnancyParents(s, target = current(s)) {
  const f = ensureFamilyLife(s);
  if (f.pregnancy || f.wedding || !target?.alive || !target.married || target.age < 18) return null;
  const spouse = target.spouseId ? s.people?.[target.spouseId] : null;
  if (!spouse?.alive || spouse.age < 18) return null;
  const mother = target.sex === '女' ? target : spouse.sex === '女' ? spouse : null;
  const father = mother?.id === target.id ? spouse : target;
  if (!mother || !father?.alive) return null;
  if (mother.age < 18 || mother.age > 45 || mother.birthCooldownDays > 0) return null;
  if (mother.health < V15_RULES.PREGNANCY_MIN_HEALTH || mother.hunger >= V15_RULES.PREGNANCY_MAX_HUNGER) return null;
  return { mother, father };
}

function pregnancyChance(s, mother) {
  const age = Number(mother.age) || 0;
  let chance = age < 30 ? 0.09 : age < 35 ? 0.06 : age < 40 ? 0.03 : 0.01;
  chance *= clamp(mother.health / 78, 0.55, 1.08);
  chance *= clamp(1 - Number(s.unrest || 0) / 180, 0.5, 1);
  if (mother.hunger >= 30) chance *= 0.65;
  return clamp(chance, 0, 0.12);
}

export function queuePregnancy(s) {
  const parents = pregnancyParents(s);
  if (!parents) return null;
  const f = ensureFamilyLife(s);
  const { mother, father } = parents;
  f.pregnancy = {
    motherId: mother.id,
    fatherId: father.id,
    remainingDays: V15_RULES.PREGNANCY_DAYS,
    startedElapsedDay: s.elapsedDays,
    care: 'pending'
  };
  const id = `pregnancy-${s.elapsedDays}-${++f.eventSerial}`;
  const subject = mother.id === s.playerId ? '你已有身孕' : `${mother.name}已有身孕`;
  return queueFamilyEvent(s, {
    id,
    title: '家中有孕',
    text: `${subject}。若一切顺利，大约二百七十日后临盆。接下来如何照护，会影响生产风险。`,
    familyData: { motherId: mother.id, fatherId: father.id },
    options: [
      { id: 'rest', label: `让${mother.id === s.playerId ? '自己' : mother.name}静养`, consequence: '孕期暂停劳动，足粮时休养恢复；生产风险降低', disabled: false },
      { id: 'normal', label: '照常生活', consequence: '保持原来的工作安排，生产风险正常', disabled: false },
      { id: 'doctor', label: `请医者照看 · ${V15_RULES.DOCTOR_COST}钱`, consequence: `钱 -${V15_RULES.DOCTOR_COST}，生产风险明显降低`, disabled: Number(s.resources.money) < V15_RULES.DOCTOR_COST }
    ]
  }, 'family-pregnancy');
}

export function getPregnancyRisk(s) {
  const p = ensureFamilyLife(s)?.pregnancy;
  if (!p) return 0;
  const mother = s.people?.[p.motherId];
  if (!mother) return 1;
  let risk = 0.06;
  if (mother.age >= 35) risk += 0.07;
  if (mother.age >= 40) risk += 0.08;
  if (mother.health < 70) risk += (70 - mother.health) * 0.004;
  if (mother.hunger >= 30) risk += 0.05;
  if (mother.hunger >= 60) risk += 0.10;
  if (s.unrest > 40) risk += (s.unrest - 40) * 0.001;
  if (p.care === 'rest') risk -= 0.04;
  if (p.care === 'doctor') risk -= 0.08;
  return round(clamp(risk, 0.02, 0.45));
}

function chooseBirthOutcome(s) {
  const f = ensureFamilyLife(s);
  if (f.__testBirthOutcome) {
    const forced = f.__testBirthOutcome;
    delete f.__testBirthOutcome;
    return forced;
  }
  const risk = getPregnancyRisk(s);
  if (random(s) >= risk) return 'healthy';
  const severity = random(s);
  if (severity < 0.55) return 'weak';
  if (severity < 0.80) return 'difficult';
  if (severity < 0.94) return 'stillbirth';
  return 'maternalDeath';
}

function birthText(outcome, motherName, childName, sex) {
  const child = `${childName}（${sex === '男' ? '男' : '女'}）`;
  if (outcome === 'weak') return `${motherName}临盆，${child}顺利出生，但孩子体弱，需要更多照看。`;
  if (outcome === 'difficult') return `${motherName}经历一场难产，${child}保住了，母亲身体受到明显损伤。`;
  if (outcome === 'stillbirth') return `${motherName}临盆不顺，孩子未能活下来。家中需要料理后事并让母亲休养。`;
  if (outcome === 'maternalDeath') return `${motherName}遭遇极重难产，${child}出生，但母亲有生命危险。`;
  return `${motherName}平安临盆，${child}出生，母子平安。`;
}

function queueBirthEvent(s) {
  const f = ensureFamilyLife(s);
  const p = f.pregnancy;
  if (!p || f.birthEventQueued || s.pendingEvent) return null;
  const mother = s.people?.[p.motherId];
  if (!mother?.alive) {
    f.pregnancy = null;
    log(s, 'story', '孕事中止', '孕妇已经离世，本次孕事未能继续。');
    return null;
  }
  const father = s.people?.[p.fatherId];
  const outcome = chooseBirthOutcome(s);
  const sex = random(s) < 0.52 ? '男' : '女';
  const childName = `${s.surname}${pick(s, CHILD_NAMES)}`;
  const risk = getPregnancyRisk(s);
  const id = `birth-${s.elapsedDays}-${++f.eventSerial}`;
  f.birthEventQueued = true;
  return queueFamilyEvent(s, {
    id,
    title: outcome === 'healthy' ? '临盆 · 添丁' : '临盆',
    text: birthText(outcome, mother.name, childName, sex),
    familyData: { motherId: mother.id, fatherId: father?.id || p.fatherId, outcome, childSex: sex, childName, risk },
    options: [
      { id: 'welcome', label: outcome === 'stillbirth' ? '料理后事' : '迎接新生', consequence: outcome === 'healthy' ? '新生儿加入家谱' : '接受此次生产结果并继续家书', disabled: false }
    ]
  }, 'family-birth');
}

function createChild(s, data) {
  const mother = s.people?.[data.motherId];
  const father = s.people?.[data.fatherId];
  const bloodline = Boolean(mother?.bloodlineFromRoot || father?.bloodlineFromRoot);
  const id = `person-${s.nextId++}`;
  const baseHealth = data.outcome === 'weak' ? 48 + Math.floor(random(s) * 12)
    : data.outcome === 'difficult' ? 60 + Math.floor(random(s) * 15)
    : data.outcome === 'maternalDeath' ? 56 + Math.floor(random(s) * 14)
    : 78 + Math.floor(random(s) * 13);
  const child = {
    id,
    name: data.childName,
    age: 0,
    role: 'child',
    sex: data.childSex,
    origin: s.origin,
    alive: true,
    health: clamp(baseHealth, 1, 100),
    hunger: 0,
    married: false,
    spouseId: null,
    childrenIds: [],
    parentId: bloodline && mother?.bloodlineFromRoot ? mother.id : bloodline && father?.bloodlineFromRoot ? father.id : mother?.id || father?.id || null,
    parentIds: [mother?.id, father?.id].filter(Boolean),
    familyId: s.family.id,
    bloodlineFromRoot: bloodline,
    skills: { knowledge: 1, martial: 1, trade: 1, social: 1, strategy: 1 },
    profession: 'farmer',
    traits: ['幼年'],
    location: mother?.location || father?.location || s.region,
    generation: Math.max(Number(mother?.generation) || 0, Number(father?.generation) || 0) + 1,
    notes: [`生于${s.year}年${s.month}月${s.day}日`],
    lifespan: 78 + Math.floor(random(s) * 12),
    pregnancy: null,
    birthCooldownDays: 0,
    warningLogged: false
  };
  s.people[id] = child;
  if (mother) { mother.childrenIds ??= []; mother.childrenIds.push(id); }
  if (father) { father.childrenIds ??= []; father.childrenIds.push(id); }
  s.family.households?.[0]?.memberIds?.push(id);
  Rules.ensureFamilyWork(s);
  return child;
}

function resolveMatchmaker(s, event, optionId) {
  const f = ensureFamilyLife(s);
  const data = event.familyData || {};
  const target = s.people?.[data.targetId];
  const candidate = data.candidate || f.pendingCandidate;
  if (optionId === 'reject') {
    const span = V15_RULES.MATCHMAKER_REJECT_MAX_DAYS - V15_RULES.MATCHMAKER_REJECT_MIN_DAYS + 1;
    f.matchmakerCooldownUntil = s.elapsedDays + V15_RULES.MATCHMAKER_REJECT_MIN_DAYS + Math.floor(random(s) * span);
    f.pendingCandidate = null;
    s.pendingEvent = null;
    s.running = false;
    s.pauseReason = '已经谢绝这门婚事，可继续原行动';
    log(s, 'choice', '谢绝婚事', `家中婉言谢绝了${candidate?.name || '这门亲事'}，以后仍可能再有人说媒。`);
    return { ok: true, message: '已谢绝这门婚事。' };
  }
  if (optionId !== 'accept') return { ok: false, message: '婚事选项无效。' };
  if (!target?.alive || target.married || !candidate) return { ok: false, message: '这门婚事已经无法继续。' };
  const cost = Number(candidate.bridePrice) || 0;
  if (Number(s.resources.money) < cost) return { ok: false, message: `聘礼不足，需要${cost}钱。` };
  s.resources.money = round(s.resources.money - cost);
  const ledger = Rules.ledger(s);
  ledger.otherMoney = round(ledger.otherMoney - cost);
  f.wedding = { targetId: target.id, candidate, remainingDays: V15_RULES.WEDDING_PREP_DAYS, totalDays: V15_RULES.WEDDING_PREP_DAYS, paid: cost };
  f.pendingCandidate = null;
  s.pendingEvent = null;
  s.running = false;
  s.pauseReason = '婚事已应下，十五日后成婚；可继续当前日常行动';
  log(s, 'choice', '应下婚事', `支付${cost}钱，${target.name}与${candidate.name}开始筹备婚事，预计十五日后成婚。`);
  Rules.sync(s);
  return { ok: true, message: `已支付${cost}钱，婚事开始筹备。` };
}

function resolvePregnancy(s, event, optionId) {
  const f = ensureFamilyLife(s);
  const p = f.pregnancy;
  if (!p || !['rest', 'normal', 'doctor'].includes(optionId)) return { ok: false, message: '孕期照护选项无效。' };
  if (optionId === 'doctor') {
    if (Number(s.resources.money) < V15_RULES.DOCTOR_COST) return { ok: false, message: `请医者需要${V15_RULES.DOCTOR_COST}钱。` };
    s.resources.money = round(s.resources.money - V15_RULES.DOCTOR_COST);
    const ledger = Rules.ledger(s);
    ledger.otherMoney = round(ledger.otherMoney - V15_RULES.DOCTOR_COST);
  }
  p.care = optionId;
  s.pendingEvent = null;
  s.running = false;
  s.pauseReason = '孕期安排已确定，可继续时间';
  const mother = s.people?.[p.motherId];
  const label = optionId === 'rest' ? '静养' : optionId === 'doctor' ? '请医照看' : '照常生活';
  log(s, 'choice', '孕期安排', `${mother?.name || '孕妇'}选择${label}。当前预计生产风险约${Math.round(getPregnancyRisk(s) * 100)}%。`);
  Rules.sync(s);
  return { ok: true, message: `孕期已安排为${label}。` };
}

function resolveBirth(s, event, optionId) {
  if (optionId !== 'welcome') return { ok: false, message: '临盆事件选项无效。' };
  const f = ensureFamilyLife(s);
  const p = f.pregnancy;
  const data = event.familyData || {};
  const mother = s.people?.[data.motherId];
  if (!p || !mother) return { ok: false, message: '这次临盆记录已经失效。' };

  s.pendingEvent = null;
  f.birthEventQueued = false;
  let child = null;
  if (data.outcome !== 'stillbirth') child = createChild(s, data);

  if (mother.alive) {
    if (data.outcome === 'healthy') mother.health = clamp(mother.health - 3, 0, 100);
    if (data.outcome === 'weak') mother.health = clamp(mother.health - 5, 0, 100);
    if (data.outcome === 'difficult') mother.health = clamp(mother.health - 18, 0, 100);
    if (data.outcome === 'stillbirth') mother.health = clamp(mother.health - 12, 0, 100);
    mother.birthCooldownDays = V15_RULES.POSTPARTUM_COOLDOWN_DAYS;
  }

  f.pregnancy = null;
  if (data.outcome === 'maternalDeath' && mother.alive) {
    mother.birthCooldownDays = 0;
    Base.__test?.killPerson?.(s, mother.id, '难产');
  }

  if (data.outcome === 'healthy') s.family.cohesion = clamp(s.family.cohesion + 2, 0, 100);
  if (data.outcome === 'stillbirth' || data.outcome === 'maternalDeath') s.family.cohesion = clamp(s.family.cohesion - 4, 0, 100);
  const summary = child ? `${child.name}加入家谱，健康${Math.round(child.health)}。` : '孩子未能存活。';
  log(s, 'story', '临盆结果', summary);
  if (s.phase === 'playing') {
    s.running = false;
    s.pauseReason = '临盆事件已处理，可继续原行动';
  }
  Rules.sync(s);
  return { ok: true, message: summary };
}

export function resolveFamilyLifeEvent(s, eventId, optionId) {
  const event = s?.pendingEvent;
  if (!event || event.id !== eventId || !FAMILY_EVENT_SOURCES.has(event.source)) return { ok: false, message: '没有这件婚育事件。' };
  if (event.options?.find(o => o.id === optionId)?.disabled) return { ok: false, message: '当前条件不足，无法选择这一项。' };
  if (event.source === 'family-marriage') return resolveMatchmaker(s, event, optionId);
  if (event.source === 'family-pregnancy') return resolvePregnancy(s, event, optionId);
  return resolveBirth(s, event, optionId);
}

function processFamilyDay(s) {
  const f = ensureFamilyLife(s);
  if (f.wedding) {
    f.wedding.remainingDays = Math.max(0, Number(f.wedding.remainingDays) - 1);
    if (f.wedding.remainingDays <= 0) completeWedding(s);
  }
  if (f.pregnancy) {
    const mother = s.people?.[f.pregnancy.motherId];
    if (!mother?.alive) {
      f.pregnancy = null;
      f.birthEventQueued = false;
      log(s, 'story', '孕事中止', '孕妇已经离世，本次孕事未能继续。');
    } else {
      f.pregnancy.remainingDays = Math.max(0, Number(f.pregnancy.remainingDays) - 1);
      if (f.pregnancy.remainingDays <= 0) queueBirthEvent(s);
    }
  }
}

export function flushDueFamilyEvents(s) {
  const f = ensureFamilyLife(s);
  if (!s.pendingEvent && s.phase === 'playing' && !s.endpoint && f.pregnancy?.remainingDays <= 0) return queueBirthEvent(s);
  return null;
}

export function maybeFamilyLifeEvent(s) {
  const f = ensureFamilyLife(s);
  if (!s || s.pendingEvent || s.phase !== 'playing' || s.endpoint || f.wedding || f.pregnancy?.remainingDays <= 0) return null;
  const key = monthKey(s);
  const target = current(s);
  if (!target?.alive) return null;

  if (!target.married) {
    if (f.marriageCheckKey === key) return null;
    f.marriageCheckKey = key;
    if (marriageEligible(s, target) && random(s) < V15_RULES.MATCHMAKER_BASE_CHANCE) return queueMatchmaker(s);
    return null;
  }

  if (f.pregnancyCheckKey === key) return null;
  f.pregnancyCheckKey = key;
  const parents = pregnancyParents(s, target);
  if (parents && random(s) < pregnancyChance(s, parents.mother)) return queuePregnancy(s);
  return null;
}

function pregnancyWorkOverride(s) {
  const p = ensureFamilyLife(s)?.pregnancy;
  if (!p || p.care !== 'rest') return () => {};
  const mother = s.people?.[p.motherId];
  if (!mother?.alive) return () => {};

  if (mother.id === s.playerId) {
    const original = s.currentActivity;
    if (!original) return () => {};
    s.currentActivity = { id: 'rest', kind: 'routine', elapsed: 0, duration: null, destination: null, charged: false, __v15PregnancyRest: true };
    return () => {
      if (s.phase === 'playing' && mother.alive && s.currentActivity?.__v15PregnancyRest) s.currentActivity = original;
    };
  }

  const work = Rules.ensureFamilyWork(s).work;
  const had = Object.prototype.hasOwnProperty.call(work.assignments, mother.id);
  const original = work.assignments[mother.id];
  work.assignments[mother.id] = 'rest';
  return () => {
    if (had) work.assignments[mother.id] = original;
    else delete work.assignments[mother.id];
  };
}

function prepare(s) { ensureFamilyLife(s); return expose(s); }

export function createGame(options) { return prepare(Base.createGame(options)); }
export function deserializeState(raw) { return prepare(Base.deserializeState(raw)); }

export function getActions(s) {
  return Base.getActions(s).filter(action => !['marry', 'child'].includes(action.id));
}

export function selectActivity(s, id, options = {}) {
  if (['marry', 'child'].includes(id)) return { ok: false, message: '婚事与生育已改为随机人生事件，不能主动选择。' };
  return Base.selectActivity(s, id, options);
}

export function getFamilyWorkAssignments(s) {
  const jobs = Base.getFamilyWorkAssignments(s);
  const p = ensureFamilyLife(s)?.pregnancy;
  if (!p || p.care !== 'rest') return jobs;
  return jobs.map(job => {
    if (job.personId !== p.motherId) return job;
    const person = s.people?.[job.personId];
    const fed = Number(s.resources?.grain || 0) >= Base.getDailyFoodCost(s);
    return {
      ...job,
      assignment: 'rest',
      label: '孕期静养',
      reason: 'pregnancy',
      farmCapacity: 0,
      dailyIncome: 0,
      healthDelta: fed && person?.health > 0 ? Base.V14_RULES.REST_RECOVERY : 0
    };
  });
}

export function advanceDay(s) {
  prepare(s);
  const beforeElapsed = Number(s.elapsedDays) || 0;
  const restoreWork = pregnancyWorkOverride(s);
  let result;
  try { result = Base.advanceDay(s); }
  finally { restoreWork(); }
  if (!result?.ok) return result;

  if ((Number(s.elapsedDays) || 0) > beforeElapsed) processFamilyDay(s);
  if (!s.pendingEvent && s.phase === 'playing' && !s.endpoint) {
    flushDueFamilyEvents(s);
    if (!s.pendingEvent && !result.paused) maybeFamilyLifeEvent(s);
  }
  if (s.pendingEvent && FAMILY_EVENT_SOURCES.has(s.pendingEvent.source)) {
    s.running = false;
    result = { ...result, paused: true, reason: s.pauseReason };
  }
  Rules.sync(s);
  expose(s);
  return result;
}

export function resolveEvent(s, eventId, optionId) {
  prepare(s);
  const familyEvent = FAMILY_EVENT_SOURCES.has(s.pendingEvent?.source);
  const result = familyEvent ? resolveFamilyLifeEvent(s, eventId, optionId) : Base.resolveEvent(s, eventId, optionId);
  if (result.ok && !s.pendingEvent && s.phase === 'playing') flushDueFamilyEvents(s);
  Rules.sync(s);
  expose(s);
  return result;
}

export const __v15Test = {
  queueMatchmaker(s, overrides = {}) { return queueMatchmaker(s, overrides); },
  queuePregnancy(s) { return queuePregnancy(s); },
  setWeddingDays(s, days) { ensureFamilyLife(s).wedding.remainingDays = Math.max(0, Number(days) || 0); return s; },
  setPregnancyDays(s, days) { ensureFamilyLife(s).pregnancy.remainingDays = Math.max(0, Number(days) || 0); return s; },
  forceBirthOutcome(s, outcome) { ensureFamilyLife(s).__testBirthOutcome = outcome; return s; },
  makeMarriedCouple(s, { spouseName = '王氏', spouseAge = 20 } = {}) {
    const target = current(s);
    if (!target) return null;
    const candidate = generateCandidate(s, target);
    candidate.name = spouseName;
    candidate.age = spouseAge;
    candidate.sex = target.sex === '女' ? '男' : '女';
    return createSpouse(s, target, candidate);
  }
};
