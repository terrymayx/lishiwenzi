/*
 * 乱世家书 · Luna xHigh shared simulation engine
 * Pure ES module: no DOM, no timers, no random work during reads/rendering.
 */

export const VERSION = 2;
export const START_YEAR = 290;
export const END_YEAR = 350;
export const TOTAL_QUARTERS = 240;
export const QUARTER_NAMES = ['春', '夏', '秋', '冬'];

export const ORIGINS = {
  peasant: { id: 'peasant', label: '寒门', desc: '有两方薄田，识字不多，但牵连较少。', money: 45, grain: 120, land: 2, reputation: 5, region: '洛阳近郊', skills: { knowledge: 1, martial: 2, trade: 1, social: 1, strategy: 1 } },
  merchant: { id: 'merchant', label: '商旅', desc: '父辈跑过几条商路，手上有本钱，也有未清的账。', money: 140, grain: 120, land: 0, reputation: 5, region: '洛阳', skills: { knowledge: 2, martial: 1, trade: 5, social: 3, strategy: 2 } },
  gentry: { id: 'gentry', label: '士族', desc: '族谱尚在、田产渐薄，门第仍能换来一次举荐。', money: 70, grain: 120, land: 1, reputation: 25, region: '洛阳', skills: { knowledge: 5, martial: 1, trade: 1, social: 4, strategy: 3 } },
  royal: { id: 'royal', label: '司马宗室', desc: '有皇室血脉，却离权力很远，政治风向会先找上门。', money: 90, grain: 120, land: 1, reputation: 35, region: '洛阳', skills: { knowledge: 3, martial: 3, trade: 1, social: 4, strategy: 5 } }
};

export const REGIONS = {
  '洛阳': { id: '洛阳', type: '京畿', safety: 35, flavor: '宫门、坊市和流言都在这里交汇。' },
  '洛阳近郊': { id: '洛阳近郊', type: '乡里', safety: 48, flavor: '薄田与驿道相邻，先听见风声，后看见兵马。' },
  '河内坞堡': { id: '河内坞堡', type: '坞堡', safety: 62, flavor: '豪强筑垒自守，能收留人，也会收取代价。' },
  '荆州': { id: '荆州', type: '南方', safety: 68, flavor: '江汉水路渐成新的生计，旧门第也要重新排位。' },
  '江淮渡口': { id: '江淮渡口', type: '渡口', safety: 55, flavor: '渡船、流民和军报在此擦肩而过。' },
  '建康': { id: '建康', type: '东晋都城', safety: 72, flavor: '北来士族带着旧姓，江南家族守着新地。' }
};

/* These are deliberately keyed to the first quarter of each named year. */
export const HISTORY = [
  { id: 'h291', year: 291, title: '八王之乱', text: '宗室权力争夺扩大，京畿差役与军粮调度开始扰动民间。', impact: { unrest: 12, grainPrice: 1 } },
  { id: 'h304', year: 304, title: '刘渊建汉，李雄称成都王', text: '北方战事蔓延，流民增多，坞堡与军镇成为许多人的临时依靠。', impact: { unrest: 22, grainPrice: 2 } },
  { id: 'h311', year: 311, title: '洛阳陷落', text: '京师秩序崩溃，许多家庭必须在留守、投堡与南迁之间作出决定。', impact: { unrest: 32, grainPrice: 3, migration: true } },
  { id: 'h316', year: 316, title: '西晋亡', text: '长安失守，西晋结束。旧官爵、旧地契和旧承诺都要面对新的主人。', impact: { unrest: 28, grainPrice: 2, migration: true } },
  { id: 'h317', year: 317, title: '晋王司马睿建朝', text: '司马睿在江南建立新的朝廷，北来家族获得机会，也遭遇本地门阀的审视。', impact: { unrest: -8, grainPrice: -1, migration: true } },
  { id: 'h318', year: 318, title: '司马睿称帝', text: '新的年号和新的名分传到江北。家书开始同时写给故园与江南。', impact: { unrest: -4, grainPrice: 0 } },
  { id: 'h329', year: 329, title: '后赵灭前赵', text: '北方政权再度更替，旧部族、汉地豪族和流民重新分配土地与身份。', impact: { unrest: 10, grainPrice: 1 } }
];

export const CHAPTERS = [
  { id: 1, years: [290, 295], title: '家门初立', desc: '先让一家人有粮、有屋、有明天。' },
  { id: 2, years: [296, 303], title: '风起京洛', desc: '权力争斗开始沿着驿道进入你的生活。' },
  { id: 3, years: [304, 310], title: '去留', desc: '坞堡、军镇与商路都在争取人口。' },
  { id: 4, years: [311, 316], title: '离散', desc: '带上谁、留下什么，决定家族下一代从哪里开始。' },
  { id: 5, years: [317, 329], title: '立足', desc: '新的朝廷带来新的门槛，也带来新的机会。' },
  { id: 6, years: [330, 350], title: '两地', desc: '让南北两支重新通信，或接受家族已经变成两种模样。' }
];

const STORY_EVENTS = [
  { id: 'chapter-1', chapter: 1, title: '一纸旧债', text: '父亲留下的旧债到期。家中要决定先保住什么。', options: [
    { id: 'grain', label: '先保粮', consequence: '粮食 +18，声望 -1', effect: { grain: 18, reputation: -1 } },
    { id: 'debt', label: '还清旧债', consequence: '钱 -20，声望 +5', effect: { money: -20, reputation: 5 } },
    { id: 'work', label: '以差事换展期', consequence: '声望 +2，学识 +0.2', effect: { reputation: 2, knowledge: 0.2 } }
  ] },
  { id: 'chapter-2', chapter: 2, title: '京洛风声', text: '各路使者借粮借人，家门必须选择依附的方式。', options: [
    { id: 'quiet', label: '守住坊门', consequence: '凝聚 +6，钱 -8', effect: { cohesion: 6, money: -8 } },
    { id: 'ally', label: '结交文吏', consequence: '声望 +6，学识 +0.2', effect: { reputation: 6, knowledge: 0.2 } },
    { id: 'fort', label: '投奔坞堡', consequence: '迁徙准备 +18，钱 -5', effect: { preparation: 18, money: -5 } }
  ] },
  { id: 'chapter-3', chapter: 3, title: '去留之间', text: '刘渊与李雄的消息沿着道路传来，流民正在寻找可以落脚的地方。', options: [
    { id: 'stay', label: '守田', consequence: '田产 +1，战乱压力 +8', effect: { land: 1, unrest: 8 } },
    { id: 'fort', label: '联络坞堡', consequence: '迁徙准备 +25，凝聚 +3', effect: { preparation: 25, cohesion: 3 } },
    { id: 'south', label: '写信问渡', consequence: '迁徙准备 +12，声望 +2', effect: { preparation: 12, reputation: 2 } }
  ] },
  { id: 'chapter-4', chapter: 4, title: '故园离散', text: '洛阳陷落后，家书要写给留下的人，也要写给已经上路的人。', options: [
    { id: 'together', label: '带家人同行', consequence: '迁徙准备 +20，粮 -12', effect: { preparation: 20, grain: -12 } },
    { id: 'divide', label: '分两处安置', consequence: '两地记 +1，凝聚 -4', effect: { split: true, cohesion: -4 } },
    { id: 'stay', label: '暂守祖屋', consequence: '田产 +1，战乱压力 +12', effect: { land: 1, unrest: 12 } }
  ] },
  { id: 'chapter-5', chapter: 5, title: '异乡立足', text: '江南新朝廷给了家门一次重新登记的机会。', options: [
    { id: 'register', label: '登记旧姓', consequence: '声望 +8，钱 -12', effect: { reputation: 8, money: -12 } },
    { id: 'local', label: '融入乡里', consequence: '凝聚 +8，声望 +2', effect: { cohesion: 8, reputation: 2 } },
    { id: 'return', label: '留信北望', consequence: '两地记 +1，学识 +0.3', effect: { split: true, knowledge: 0.3 } }
  ] },
  { id: 'chapter-6', chapter: 6, title: '一门两地', text: '家族已经有了两处落脚点。最后一封家书要决定寄往哪里。', options: [
    { id: 'south', label: '守住南地', consequence: '凝聚 +8，安全准备 +10', effect: { cohesion: 8, preparation: 10 } },
    { id: 'north', label: '接回北支', consequence: '两地记 +1，粮 -16', effect: { split: true, grain: -16 } },
    { id: 'letters', label: '维持往来', consequence: '声望 +5，学识 +0.4', effect: { reputation: 5, knowledge: 0.4 } }
  ] }
];

const ACTION_DEFS = {
  trade: { id: 'trade', slot: 'main', label: '谋生', icon: '🧳', desc: '沿驿路做一笔小买卖，换取钱粮。' },
  study: { id: 'study', slot: 'main', label: '读书', icon: '📜', desc: '抄书求学，积累进入地方事务的机会。' },
  enlist: { id: 'enlist', slot: 'main', label: '从军', icon: '⚔', desc: '领一季军饷，以武艺换取保护。' },
  rest: { id: 'rest', slot: 'main', label: '休养', icon: '🍵', desc: '消耗粮食，让当前人物恢复健康。' },
  prepare: { id: 'prepare', slot: 'main', label: '筹备迁徙', icon: '🧭', desc: '储钱备粮并打听去处，准备可降低迁徙损失。' },
  migrate: { id: 'migrate', slot: 'main', label: '迁徙', icon: '⛵', desc: '选择一个落脚地，带家人迁往更安全的地方。' },
  cultivate: { id: 'cultivate', slot: 'family', label: '耕作', icon: '🌾', desc: '照料田产，换取粮食。' },
  manage: { id: 'manage', slot: 'family', label: '料理家务', icon: '🏠', desc: '清点钱粮、修整屋舍，稳住家门。' },
  marry: { id: 'marry', slot: 'family', label: '安排婚事', icon: '囍', desc: '建立一条新的关系线。' },
  child: { id: 'child', slot: 'family', label: '备孕三季', icon: '👶', desc: '与配偶商议添丁，三季后孩子出生。' }
};

const clone = value => JSON.parse(JSON.stringify(value));
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = value => Number.isFinite(Number(value));
const normalizeSeed = seed => (Number(seed) >>> 0) || 1;
const nextRng = current => (Math.imul(current >>> 0, 1664525) + 1013904223) >>> 0;

export function createRng(seed = Date.now()) {
  let value = normalizeSeed(seed);
  const fn = () => { value = nextRng(value); return value / 4294967296; };
  fn.getState = () => value;
  fn.setState = next => { value = normalizeSeed(next); };
  return fn;
}

function attachRng(state) {
  Object.defineProperty(state, 'rng', {
    configurable: true,
    enumerable: false,
    value: () => { state.rngState = nextRng(state.rngState); return state.rngState / 4294967296; }
  });
  return state;
}
function random(state) { state.rngState = nextRng(state.rngState); return state.rngState / 4294967296; }
function makeId(prefix, state) { return `${prefix}-${state.nextId++}`; }
function syncResources(state) {
  state.resources.money = Math.round(state.resources.money);
  state.resources.grain = Math.round(state.resources.grain);
  state.resources.reputation = Math.round(state.resources.reputation);
  state.resources.health = Math.round(clamp(getCurrent(state)?.health ?? 0, 0, 100));
  state.resources.land = state.household.land;
  state.household.money = state.resources.money;
  state.household.grain = state.resources.grain;
}
function addLog(state, kind, title, text) {
  state.eventLog.push({ year: state.year, quarter: state.quarter, kind, title, text });
}
function person(state, name, age, role, extra = {}) {
  const bloodline = extra.bloodlineFromRoot ?? false;
  return {
    id: makeId('person', state), name, age, role, sex: extra.sex || '男', origin: state.origin,
    alive: true, health: extra.health ?? 78, married: false, spouseId: null,
    childrenIds: [], parentId: extra.parentId ?? null, parentIds: extra.parentIds ? [...extra.parentIds] : (extra.parentId ? [extra.parentId] : []),
    familyId: extra.familyId ?? state.family.id, bloodlineFromRoot: bloodline,
    skills: { knowledge: 1, martial: 1, trade: 1, social: 1, strategy: 1, ...(extra.skills || {}) },
    profession: extra.profession || 'farmer', traits: [...(extra.traits || ['谨慎'])], location: extra.location || state.region,
    generation: extra.generation ?? 0, notes: [], lifespan: extra.lifespan ?? (82 + Math.floor(random(state) * 8)),
    pregnancy: null, birthCooldown: 0, warningLogged: false
  };
}

export function createGame({ surname = '沈', origin = 'peasant', seed = 20260908 } = {}) {
  if (typeof surname !== 'string' || !surname.trim() || surname.length > 8) throw new Error('姓氏无效');
  const profile = ORIGINS[origin] || ORIGINS.peasant;
  const state = {
    version: VERSION, seed: Number(seed) || 1, rngState: normalizeSeed(seed), nextId: 1,
    tick: 0, year: START_YEAR, quarter: 1, phase: 'playing', endpoint: false,
    surname: surname.trim(), origin: profile.id, region: profile.region, unrest: 8, grainPrice: 1,
    resources: { money: profile.money, grain: profile.grain, land: profile.land, reputation: profile.reputation, health: 78 },
    family: { id: 'family-1', surname: surname.trim(), title: `${surname.trim()}氏家门`, cohesion: 65, reputation: profile.reputation, legacy: ['祖籍洛阳'], households: [] },
    household: { id: 'household-1', label: '本家', money: profile.money, grain: profile.grain, land: profile.land, preparation: 0, location: profile.region },
    rootId: null, playerId: null, activeId: null, selectedPersonId: null,
    pendingSuccession: false, pendingGuardian: null, pendingEvent: null,
    people: {}, relations: {}, assets: [], history: [], eventLog: [], storyFlags: {}, chapterSeen: {},
    actionSlots: { main: null, family: null }, lastAction: '准备开始', lastQuarterEvents: []
  };
  state.family.households.push({ id: 'household-1', label: '本家', memberIds: [], assets: [], location: profile.region });
  const protagonist = person(state, `${surname.trim()}氏`, 18, 'current', {
    sex: '男', bloodlineFromRoot: true, health: 78, location: profile.region, lifespan: 84 + Math.floor(random(state) * 5),
    profession: origin === 'merchant' ? 'trader' : origin === 'gentry' || origin === 'royal' ? 'clerk' : 'farmer',
    traits: origin === 'royal' ? ['谨慎', '宗室血脉'] : origin === 'gentry' ? ['守礼', '旧族'] : ['谨慎'],
    skills: profile.skills
  });
  state.people[protagonist.id] = protagonist; state.rootId = protagonist.id; state.playerId = protagonist.id; state.activeId = protagonist.id; state.selectedPersonId = protagonist.id;
  const mother = person(state, '母亲', 43, 'mother', { sex: '女', bloodlineFromRoot: false, health: 62, location: profile.region, profession: 'farmer', lifespan: 82 + Math.floor(random(state) * 6) });
  state.people[mother.id] = mother;
  state.family.households[0].memberIds.push(protagonist.id, mother.id);
  const asset = { id: 'asset-1', type: '田产', name: '祖屋旁的薄田', value: 24, location: profile.region, ownerId: protagonist.id };
  state.assets.push(asset); state.family.households[0].assets.push(asset.id);
  state.eventLog.push({ year: 290, quarter: 1, kind: 'story', title: '一纸家书', text: `你在${profile.region}醒来。父辈留下的不是金银，而是一屋亲人和一笔还未清的旧账。` });
  state.eventLog.push({ year: 290, quarter: 1, kind: 'story', title: '开局身份', text: `${profile.label}：${profile.desc}` });
  syncResources(state); return attachRng(state);
}

export function getCurrent(state) { return state.playerId ? state.people[state.playerId] || null : null; }
export function alivePeople(state) { return Object.values(state.people).filter(person => person.alive); }
export function getChapter(state) {
  return CHAPTERS.find(chapter => state.year >= chapter.years[0] && state.year <= chapter.years[1]) || CHAPTERS[CHAPTERS.length - 1];
}
export function getDateLabel(state) { return `${state.year}${QUARTER_NAMES[state.quarter - 1]}`; }

function actionRisk(state, id) {
  if (id === 'trade' && state.unrest > 35) return '商路不稳，可能受伤或损失货物。';
  if (id === 'enlist') return '军镇正在征调，战事可能带来生命危险。';
  if (id === 'migrate' && state.unrest > 20) return '长途迁徙会消耗钱粮，也可能与家人失散。';
  return null;
}
function actionTarget(state, actionId) {
  const current = getCurrent(state);
  if (!['marry', 'child'].includes(actionId)) return current;
  const selected = state.selectedPersonId ? state.people[state.selectedPersonId] : null;
  if (selected?.alive && selected.familyId === state.family.id && selected.age >= 18 && bloodDescendant(state, selected.id)) return selected;
  return current;
}
function actionDisabled(state, action) {
  const current = getCurrent(state);
  if (!current || !current.alive || state.phase !== 'playing' || state.endpoint) return true;
  if (state.actionSlots[action.slot]) return true;
  if (current.age < 16 && action.slot === 'main' && !['study', 'rest'].includes(action.id)) return true;
  const target = actionTarget(state, action.id);
  if (action.id === 'migrate') return state.resources.money < 15 || state.resources.grain < 10;
  if (action.id === 'marry') return !target || target.married || target.age < 18;
  if (action.id === 'child') return !canBeginPregnancy(state, target);
  return false;
}
export function getActions(state) {
  return Object.values(ACTION_DEFS).map(action => ({ ...action, slot: action.slot, cost: action.id === 'migrate' ? '钱 15 · 粮 10' : '本季度', risk: actionRisk(state, action.id), disabled: actionDisabled(state, action) }));
}

function canBeginPregnancy(state, current) {
  if (!current || !current.alive || !current.married || current.age < 18) return false;
  const spouse = current.spouseId ? state.people[current.spouseId] : null;
  if (!spouse || !spouse.alive || spouse.age < 18) return false;
  if (current.pregnancy || spouse.pregnancy) return false;
  const mother = current.sex === '女' ? current : spouse;
  return mother.age >= 18 && mother.age <= 45 && mother.birthCooldown <= 0;
}
function bloodDescendant(state, personId) {
  return Boolean(state.people[personId]?.bloodlineFromRoot);
}

export function listSuccessors(state) {
  return alivePeople(state)
    .filter(person => person.id !== state.playerId && person.id !== state.rootId && bloodDescendant(state, person.id))
    .sort((a, b) => (a.age - b.age) || a.generation - b.generation || a.id.localeCompare(b.id));
}
export function listGuardians(state, successorId = state.pendingGuardian?.successorId) {
  const guardians = alivePeople(state).filter(person => person.id !== successorId && person.age >= 18 && person.familyId === state.family.id);
  return guardians.length ? guardians : [{ id: 'community-guardian', name: '乡里长者', age: 45, alive: true, role: 'guardian', location: state.region, familyId: state.family.id }];
}

function killPerson(state, personId, reason) {
  const target = state.people[personId];
  if (!target || !target.alive) return null;
  target.alive = false;
  target.notes.push(`卒于${state.year}年：${reason}`);
  addLog(state, 'story', `${target.name}离世`, `原因：${reason}。家书暂时停在这一页。`);
  if (personId === state.playerId) {
    state.playerId = null;
    state.actionSlots = { main: null, family: null };
    const successors = listSuccessors(state);
    if (successors.length) {
      state.pendingSuccession = true;
      state.phase = state.endpoint ? 'ended' : 'succession';
    } else {
      state.pendingSuccession = false;
      state.pendingGuardian = null;
      state.phase = 'ended';
      state.ending = { noDescendants: true, familyContinues: false };
      addLog(state, 'ending', '家书停笔', '这一代没有留下可以接续的始祖血缘后代，家书在此收束。');
    }
  }
  return target;
}

function settlePregnancies(state) {
  for (const mother of Object.values(state.people)) {
    if (!mother.alive || !mother.pregnancy) {
      if (mother.alive && mother.birthCooldown > 0) mother.birthCooldown = Math.max(0, mother.birthCooldown - 1);
      continue;
    }
    mother.pregnancy.remaining -= 1;
    mother.birthCooldown = Math.max(mother.birthCooldown - 1, 0);
    if (mother.pregnancy.remaining > 0) continue;
    const father = state.people[mother.pregnancy.fatherId];
    const bloodParent = bloodDescendant(state, mother.id) ? mother : father;
    const child = person(state, `${state.surname}${random(state) < 0.5 ? '儿' : '女'}·${state.nextId}`, 0, 'child', {
      parentId: bloodParent?.id || mother.id, parentIds: [mother.id, father?.id].filter(Boolean), bloodlineFromRoot: Boolean(bloodParent?.bloodlineFromRoot),
      familyId: state.family.id, generation: Math.max(mother.generation, father?.generation || 0) + 1, location: mother.location,
      health: 70 + Math.floor(random(state) * 20), profession: 'farmer'
    });
    state.people[child.id] = child;
    mother.childrenIds.push(child.id); if (father) father.childrenIds.push(child.id);
    state.family.households[0].memberIds.push(child.id);
    mother.pregnancy = null; mother.birthCooldown = 3;
    addLog(state, 'story', '添丁', `${mother.name}的家中添了一个孩子：${child.name}。这条血脉将成为未来的接续人。`);
  }
}

function advanceAges(state) {
  for (const person of Object.values(state.people)) {
    if (!person.alive) continue;
    person.age = Number((person.age + 0.25).toFixed(2));
    if (person.age > 50) person.health = clamp(person.health - (person.age > 65 ? 0.16 : 0.06), 0, 100);
    if (!person.warningLogged && (person.health < 35 || person.age >= person.lifespan - 5)) {
      person.warningLogged = true;
      addLog(state, 'warning', `${person.name}需要照看`, `${person.name}的健康或年岁已经接近危险线。休养可以缓解健康下降，家书也应提前安排接续。`);
    }
    if (person.health <= 0) killPerson(state, person.id, '久病不愈');
    else if (person.age >= person.lifespan) killPerson(state, person.id, '年老体衰');
  }
}
function resolveRisks(state, actionId) {
  const current = getCurrent(state); if (!current || !current.alive) return null;
  let probability = 0;
  if (actionId === 'trade') probability = state.unrest > 40 ? 0.035 : 0.008;
  if (actionId === 'enlist') probability = state.unrest > 40 ? 0.085 : 0.025;
  if (actionId === 'migrate') probability = Math.max(0.005, 0.04 - state.household.preparation / 500);
  if (probability && random(state) < probability) {
    if (actionId === 'enlist') return killPerson(state, current.id, '军中染疾');
    if (actionId === 'trade') {
      state.resources.money = Math.max(0, state.resources.money - 8);
      current.health = clamp(current.health - 3, 0, 100);
      return { nonfatal: '商路受阻，损失了货物并受了轻伤。' };
    }
    if (actionId === 'migrate') {
      state.resources.grain = Math.max(0, state.resources.grain - 8);
      current.health = clamp(current.health - 4, 0, 100);
      return { nonfatal: '途中遇到乱兵，损失了一些粮食，所幸全家平安。' };
    }
  }
  return null;
}

function applyFamilyNeeds(state) {
  const count = alivePeople(state).filter(person => person.familyId === state.family.id).length;
  const need = Math.max(1, Math.ceil(count / 3));
  state.resources.grain -= need;
  if (state.resources.grain < 0) {
    state.resources.grain = 0; state.family.cohesion = clamp(state.family.cohesion - 4, 0, 100);
    for (const person of alivePeople(state).filter(person => person.familyId === state.family.id)) person.health = clamp(person.health - 1.5, 0, 100);
  } else state.family.cohesion = clamp(state.family.cohesion + 0.3, 0, 100);
}

function maybeQueueChapter(state) {
  if (state.pendingEvent || state.endpoint || state.phase !== 'playing') return;
  const chapter = getChapter(state);
  const firstQuarter = state.quarter === 1;
  const firstTurn = state.tick === 1;
  if (!firstQuarter && !firstTurn) return;
  if (state.chapterSeen[chapter.id]) return;
  const event = STORY_EVENTS.find(item => item.chapter === chapter.id);
  if (!event) return;
  state.pendingEvent = clone(event);
  state.chapterSeen[chapter.id] = false;
  addLog(state, 'story', event.title, event.text);
}

function historicalForCurrentDate(state) {
  const event = HISTORY.find(item => item.year === state.year && state.quarter === 1 && !state.history.includes(item.id));
  if (!event) return null;
  state.history.push(event.id);
  state.unrest = clamp(state.unrest + (event.impact.unrest || 0), 0, 100);
  state.grainPrice = clamp(state.grainPrice + (event.impact.grainPrice || 0), 1, 9);
  if (event.impact.migration) state.storyFlags.migrationCrisis = true;
  addLog(state, 'history', event.title, event.text);
  return event;
}

function settleQuarter(state) {
  applyFamilyNeeds(state);
  advanceAges(state);
  settlePregnancies(state);
  state.tick += 1;
  state.year = START_YEAR + Math.floor(state.tick / 4);
  state.quarter = (state.tick % 4) + 1;
  state.actionSlots = { main: null, family: null };
  state.lastQuarterEvents = [];
  const historical = historicalForCurrentDate(state);
  if (historical) state.lastQuarterEvents.push({ kind: 'history', id: historical.id });
  maybeQueueChapter(state);
  const current = getCurrent(state);
  if (state.tick >= TOTAL_QUARTERS) {
    state.endpoint = true;
    state.phase = 'ended';
    if (!state.ending?.noDescendants) {
      state.ending = { noDescendants: listSuccessors(state).length === 0, familyContinues: listSuccessors(state).length > 0 };
      addLog(state, 'ending', '第一版纪事收束', state.ending.noDescendants ? '350年春，家书停在这一代；你仍可查看并导出全部纪事。' : '350年春，家书交给后代继续保存。');
    }
  } else if (!current && state.pendingSuccession) state.phase = 'succession';
  syncResources(state);
  return historical;
}

function applyAction(state, actionId, options) {
  const current = actionTarget(state, actionId);
  let message = '';
  if (actionId === 'trade') {
    const gain = 10 + Math.floor(random(state) * 22);
    state.resources.money += gain; state.resources.grain += 2; current.skills.trade += 0.15; message = `你带回了${gain}钱，家中本季有了周转。`;
  } else if (actionId === 'study') {
    current.skills.knowledge += 0.4; state.resources.reputation += 1; state.family.reputation += 1; message = '你抄完一卷书，县中小吏记住了你的名字。';
  } else if (actionId === 'enlist') {
    state.resources.money += 16; state.resources.grain += 5; current.skills.martial += 0.25; current.health = clamp(current.health - 3, 0, 100); message = '你领到一季军饷，手上的茧也更深了。';
  } else if (actionId === 'rest') {
    state.resources.grain -= 5; current.health = clamp(current.health + 10, 0, 100); message = '家人围炉休养，病气暂时退去。';
  } else if (actionId === 'prepare') {
    state.resources.money -= 5; state.household.preparation = clamp(state.household.preparation + 20, 0, 100); message = '你储下路费、干粮和凭证，迁徙准备增加。';
  } else if (actionId === 'migrate') {
    const destination = options.destination;
    state.resources.money -= 15; state.resources.grain -= 10;
    const safety = REGIONS[destination].safety;
    const loss = Math.max(0, Math.ceil((state.unrest - safety) / 8) - Math.floor(state.household.preparation / 20));
    state.resources.grain = Math.max(0, state.resources.grain - loss);
    state.region = destination; state.household.location = destination; state.household.preparation = Math.max(0, state.household.preparation - 20);
    for (const person of Object.values(state.people)) if (person.alive && person.familyId === state.family.id) person.location = destination;
    state.family.legacy.push(`迁居${destination}`); message = `你带着家人抵达${destination}，准备减少了沿途损失。`;
  } else if (actionId === 'cultivate') {
    const gain = Math.max(4, state.household.land * 8);
    state.resources.grain += gain; state.resources.money += Math.max(1, state.household.land); current.skills.trade += 0.08; message = `你整治薄田，收回${gain}石粮。`;
  } else if (actionId === 'manage') {
    state.family.cohesion = clamp(state.family.cohesion + 4, 0, 100); state.resources.money -= 2; state.resources.reputation += 1; message = '你清点账册、修补屋舍，家门重新有了秩序。';
  } else if (actionId === 'marry') {
    const spouse = person(state, `${state.surname}·姻亲`, Math.max(18, Math.floor(current.age) - 2), 'spouse', { sex: current.sex === '女' ? '男' : '女', bloodlineFromRoot: false, health: 74, location: current.location, profession: 'artisan', generation: current.generation, traits: ['坚韧'] });
    state.people[spouse.id] = spouse; current.married = true; current.spouseId = spouse.id; spouse.married = true; spouse.spouseId = current.id;
    state.family.households[0].memberIds.push(spouse.id); const relation = { type: '婚姻', trust: 55, from: current.id, to: spouse.id }; state.relations[`${current.id}:${spouse.id}`] = relation; state.relations[`${spouse.id}:${current.id}`] = { ...relation, from: spouse.id, to: current.id }; message = '婚事办妥。新的姻亲关系让家门多了一双手，也多了一层牵挂。';
  } else if (actionId === 'child') {
    const spouse = state.people[current.spouseId]; const mother = current.sex === '女' ? current : spouse;
    mother.pregnancy = { remaining: 3, fatherId: current.id === mother.id ? spouse.id : current.id, startedTick: state.tick }; mother.birthCooldown = 3; message = '家中开始备孕，三季之后才会迎来孩子。';
  }
  const died = resolveRisks(state, actionId);
  return { message, died };
}

function validateAction(state, actionId, options = {}) {
  if (state.phase !== 'playing' || state.endpoint) return '当前无法行动。';
  if (state.pendingEvent) return '请先处理本章家书事件。';
  const action = ACTION_DEFS[actionId];
  const current = getCurrent(state);
  if (!action || !current || !current.alive) return '此行动当前不可用。';
  if (state.actionSlots[action.slot]) return `${action.slot === 'main' ? '主行动' : '家务'}本季已经使用。`;
  if (current.age < 16 && action.slot === 'main' && !['study', 'rest'].includes(actionId)) return '未成年接续后只能读书或休养。';
  if (actionId === 'trade' && state.resources.money < 0) return '没有本钱。';
  if (actionId === 'enlist' && state.resources.grain < 0) return '没有粮食。';
  if (actionId === 'rest' && state.resources.grain < 5) return '粮食不足以休养。';
  if (actionId === 'prepare' && state.resources.money < 5) return '钱不足以筹备迁徙。';
  if (actionId === 'manage' && state.resources.money < 2) return '钱不足以料理家务。';
  if (actionId === 'migrate') {
    if (state.resources.money < 15 || state.resources.grain < 10) return '迁徙至少需要钱15、粮10。';
    if (!options.destination || !REGIONS[options.destination] || options.destination === state.region) return '请选择与当前不同的迁徙地点。';
  }
  const target = actionTarget(state, actionId);
  if (actionId === 'marry' && (!target || target.married || target.age < 18)) return '当前人物尚未满足婚配条件。';
  if (actionId === 'child' && !canBeginPregnancy(state, target)) return '需要双方18岁以上、处于育龄，且间隔已满三季。';
  return null;
}

export function performAction(state, actionId, options = {}) {
  const error = validateAction(state, actionId, options);
  if (error) return { state, ok: false, message: error };
  const risk = actionRisk(state, actionId);
  if (risk && !options.confirmRisk) return { state, ok: false, needsRiskConfirmation: true, message: risk };
  const action = ACTION_DEFS[actionId];
  const draft = clone(state); attachRng(draft);
  const current = getCurrent(draft);
  const result = applyAction(draft, actionId, options);
  if (current?.alive && draft.phase === 'playing') draft.actionSlots[action.slot] = action.id;
  draft.lastAction = action.label;
  const shouldAdvance = Boolean(draft.actionSlots.main && draft.actionSlots.family);
  let historical = null;
  if (shouldAdvance && current.alive) {
    addLog(draft, 'action', '家中一季', result.message);
    historical = settleQuarter(draft);
  } else if (result.message) draft.lastQuarterEvents = [{ kind: 'action', text: result.message }];
  syncResources(draft);
  const died = result.died;
  commit(state, draft);
  const message = died?.nonfatal ? `${result.message} ${died.nonfatal}` : (died ? `${result.message} ${died.name}${draft.ending?.noDescendants ? '已离世，家书在这一代收束。' : '已离世，请选择血缘后代接续。'}` : result.message);
  return { state, ok: true, message, advanced: shouldAdvance && current.alive, died: Boolean(died && !died.nonfatal), historical: historical?.id || null };
}

function commit(target, source) {
  delete target.rng;
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source); attachRng(target);
}

export function resolveEvent(state, eventId, optionId) {
  if (!state.pendingEvent || state.pendingEvent.id !== eventId) return { state, ok: false, message: '没有这封待处理的家书。' };
  const event = STORY_EVENTS.find(item => item.id === eventId); const option = event?.options.find(item => item.id === optionId);
  if (!option) return { state, ok: false, message: '选项无效。' };
  const draft = clone(state); attachRng(draft);
  const effect = option.effect || {};
  for (const key of ['money', 'grain']) {
    if (Number(draft.resources[key]) + Number(effect[key] || 0) < 0) return { state, ok: false, message: `${key === 'money' ? '钱' : '粮'}不足，无法选择此项。` };
  }
  draft.resources.money += effect.money || 0; draft.resources.grain += effect.grain || 0; draft.resources.reputation += effect.reputation || 0;
  draft.family.cohesion = clamp(draft.family.cohesion + (effect.cohesion || 0), 0, 100); draft.household.preparation = clamp(draft.household.preparation + (effect.preparation || 0), 0, 100);
  draft.household.land += effect.land || 0; draft.resources.land = draft.household.land; draft.unrest = clamp(draft.unrest + (effect.unrest || 0), 0, 100);
  if (effect.split) { draft.storyFlags.splitHouseholds = true; draft.family.legacy.push('南北两地通信'); }
  const current = getCurrent(draft); if (current) current.skills.knowledge += effect.knowledge || 0;
  draft.family.reputation = clamp(draft.family.reputation + (effect.reputation || 0), 0, 100);
  draft.pendingEvent = null; draft.chapterSeen[event.chapter] = true; draft.storyFlags[event.id] = option.id;
  addLog(draft, 'choice', event.title, `你选择“${option.label}”：${option.consequence}`); syncResources(draft); commit(state, draft);
  return { state, ok: true, message: `${event.title}：${option.consequence}` };
}

export function continueAs(state, personId) {
  if (!state.pendingSuccession || state.endpoint) return { state, ok: false, message: '当前没有可接续的家书。' };
  const candidate = state.people[personId];
  if (!candidate || !candidate.alive || !bloodDescendant(state, personId) || personId === state.rootId) return { state, ok: false, message: '只有始祖血缘后代可以接续。' };
  const draft = clone(state); attachRng(draft); draft.selectedPersonId = personId;
  if (candidate.age < 16) { draft.pendingGuardian = { successorId: personId }; draft.phase = 'guardian'; addLog(draft, 'story', '幼年接续', `${candidate.name}尚未成年，需要一位家人先完成监护安排。`); commit(state, draft); return { state, ok: true, needsGuardian: true, message: `${candidate.name}尚未成年，请先安排监护。` }; }
  draft.playerId = personId; draft.activeId = personId; draft.pendingSuccession = false; draft.pendingGuardian = null; draft.actionSlots = { main: null, family: null }; draft.phase = 'playing'; syncResources(draft); addLog(draft, 'story', '家书续写', `你选择让${candidate.name}接过家书。`); commit(state, draft); return { state, ok: true, message: `${candidate.name}成为新的主角。` };
}

export function performGuardianAction(state, guardianId, actionId = 'protect') {
  if (state.phase !== 'guardian' || !state.pendingGuardian) return { state, ok: false, message: '当前不需要监护安排。' };
  const successor = state.people[state.pendingGuardian.successorId]; const guardian = state.people[guardianId];
  const community = guardianId === 'community-guardian';
  if (!successor?.alive || !bloodDescendant(state, successor.id) || (!community && (!guardian?.alive || guardian.id === successor.id || guardian.age < 18 || guardian.familyId !== state.family.id))) return { state, ok: false, message: '这位家人不能担任监护人。' };
  if (!['protect', 'teach'].includes(actionId)) return { state, ok: false, message: '监护行动无效。' };
  const draft = clone(state); attachRng(draft); const g = draft.people[guardianId]; const child = draft.people[successor.id];
  if (actionId === 'teach') { child.skills.knowledge += community ? 0.25 : 0.4; child.health = clamp(child.health + 2, 0, 100); } else { child.health = clamp(child.health + (community ? 3 : 5), 0, 100); draft.family.cohesion = clamp(draft.family.cohesion + (community ? 2 : 4), 0, 100); }
  const guardianName = community ? '乡里长者' : g.name;
  draft.playerId = child.id; draft.activeId = child.id; draft.pendingSuccession = false; draft.pendingGuardian = null; draft.actionSlots = { main: null, family: null }; draft.phase = 'playing'; addLog(draft, 'story', '监护完成', `${guardianName}完成了监护安排，${child.name}接过家书。`); syncResources(draft); commit(state, draft);
  return { state, ok: true, message: `${child.name}已在${guardianName}监护下接续。` };
}

/* Kept as a compatibility entry point, but there is no player-initiated killing/retirement. */
export function retireCurrent(state) { return { state, ok: false, message: '家书不提供主动退休；请让时间与行动自然交接。' }; }
export function selectPerson(state, personId) { if (state.people[personId]) state.selectedPersonId = personId; return state; }

export function validateState(state) {
  if (!state || typeof state !== 'object') throw new Error('存档必须是对象');
  if (state.version !== VERSION) throw new Error('存档版本不兼容');
  if (!Number.isInteger(state.tick) || state.tick < 0 || state.tick > TOTAL_QUARTERS) throw new Error('季度进度无效');
  const expectedYear = START_YEAR + Math.floor(state.tick / 4); const expectedQuarter = (state.tick % 4) + 1;
  if (state.year !== expectedYear || state.quarter !== expectedQuarter) throw new Error('日期与季度进度不一致');
  if (!Number.isInteger(state.rngState) || state.rngState < 0 || state.rngState > 0xffffffff) throw new Error('随机状态无效');
  if (!['playing', 'succession', 'guardian', 'ended'].includes(state.phase)) throw new Error('阶段无效');
  if (!isRecord(state.actionSlots) || !('main' in state.actionSlots) || !('family' in state.actionSlots)) throw new Error('行动槽无效');
  if (!isRecord(state.family) || !Array.isArray(state.family.households) || !Array.isArray(state.family.legacy) || !finite(state.family.cohesion) || !finite(state.family.reputation)) throw new Error('家门字段无效');
  if (!isRecord(state.household) || !finite(state.household.money) || !finite(state.household.grain) || !finite(state.household.land) || !finite(state.household.preparation)) throw new Error('家务字段无效');
  if (!Array.isArray(state.history) || !Array.isArray(state.eventLog) || !Array.isArray(state.assets)) throw new Error('纪事字段无效');
  if (!isRecord(state.relations) || !isRecord(state.storyFlags) || !isRecord(state.chapterSeen)) throw new Error('家谱字段无效');
  if (state.history.some(id => typeof id !== 'string' || !HISTORY.some(event => event.id === id))) throw new Error('历史记录无效');
  if (new Set(state.history).size !== state.history.length) throw new Error('历史记录重复');
  for (const entry of state.eventLog) if (!isRecord(entry) || !Number.isInteger(entry.year) || !Number.isInteger(entry.quarter) || typeof entry.kind !== 'string' || typeof entry.title !== 'string' || typeof entry.text !== 'string') throw new Error('家书记录无效');
  for (const asset of state.assets) if (!isRecord(asset) || typeof asset.id !== 'string' || typeof asset.name !== 'string' || !finite(asset.value)) throw new Error('产业记录无效');
  for (const key of Object.keys(state.chapterSeen)) if (!/^\d+$/.test(key) || typeof state.chapterSeen[key] !== 'boolean') throw new Error('章节记录无效');
  if (state.pendingEvent !== null) {
    const event = state.pendingEvent;
    if (!isRecord(event) || typeof event.id !== 'string' || !Number.isInteger(event.chapter) || typeof event.title !== 'string' || typeof event.text !== 'string' || !Array.isArray(event.options) || !event.options.length) throw new Error('待处理家书无效');
    for (const option of event.options) if (!isRecord(option) || typeof option.id !== 'string' || typeof option.label !== 'string' || typeof option.consequence !== 'string' || !isRecord(option.effect)) throw new Error('待处理选项无效');
  }
  if (state.ending !== undefined && (!isRecord(state.ending) || typeof state.ending.noDescendants !== 'boolean' || typeof state.ending.familyContinues !== 'boolean')) throw new Error('收束字段无效');
  for (const key of ['money', 'grain', 'land', 'reputation', 'health']) if (!finite(state.resources?.[key]) || Number(state.resources[key]) < 0) throw new Error(`资源无效：${key}`);
  if (!state.people || typeof state.people !== 'object' || !state.people[state.rootId]) throw new Error('始祖缺失');
  for (const person of Object.values(state.people)) {
    if (!person.id || typeof person.name !== 'string' || !finite(person.age) || !finite(person.health) || !finite(person.lifespan) || typeof person.alive !== 'boolean' || !Array.isArray(person.parentIds) || !Array.isArray(person.childrenIds) || !Array.isArray(person.notes) || !person.skills || typeof person.skills !== 'object') throw new Error('人物字段无效');
    for (const skill of ['knowledge', 'martial', 'trade', 'social', 'strategy']) if (!finite(person.skills[skill])) throw new Error('人物技能无效');
    for (const parentId of person.parentIds) if (!state.people[parentId]) throw new Error('人物血缘引用无效');
    for (const childId of person.childrenIds) if (!state.people[childId]) throw new Error('人物子女引用无效');
    if (person.spouseId && (!state.people[person.spouseId] || state.people[person.spouseId].spouseId !== person.id)) throw new Error('婚姻关系未互联');
  }
  if (state.playerId && (!state.people[state.playerId] || !state.people[state.playerId].alive)) throw new Error('当前人物无效');
  return true;
}
export function serializeState(state) { validateState(state); const copy = clone(state); delete copy.rng; return JSON.stringify(copy); }
export function deserializeState(value) { let raw; try { raw = typeof value === 'string' ? JSON.parse(value) : clone(value); } catch { throw new Error('JSON 存档无法解析'); } validateState(raw); return attachRng(raw); }
export const saveState = serializeState;
export const loadState = deserializeState;

export function getTimeline(state) {
  return HISTORY.map(event => ({ ...event, occurred: state.history.includes(event.id), current: event.year === state.year && state.quarter === 1 }));
}
export function getFamilyTree(state) {
  return Object.values(state.people).map(person => ({ id: person.id, name: person.name, age: Math.floor(person.age), alive: person.alive, role: person.role, parentId: person.parentId, parentIds: [...(person.parentIds || [])], spouseId: person.spouseId, childrenIds: [...person.childrenIds], location: person.location, profession: person.profession, generation: person.generation, bloodlineFromRoot: person.bloodlineFromRoot }));
}
export function getRelations(state) { return Object.values(state.relations); }
export function getPendingEvent(state) { return state.pendingEvent ? clone(state.pendingEvent) : null; }

export const __test = { killPerson, historicalForCurrentDate, settleQuarter, settlePregnancies, performGuardianAction };

