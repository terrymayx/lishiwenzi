/*
 * 乱世家书 · V3 continuous-day simulation engine
 * Pure ES module: no DOM and no timers. The UI decides how fast to call advanceDay().
 */

export const VERSION = 3;
export const START_YEAR = 290;
export const END_YEAR = 350;
export const QUARTER_NAMES = ['春', '夏', '秋', '冬']; // compatibility only
export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const DAYS_PER_YEAR = 365;
export const TOTAL_DAYS = (END_YEAR - START_YEAR) * DAYS_PER_YEAR;
export const FOOD_PER_PERSON_PER_DAY = 0.35;
export const CHILD_FOOD_0_5_PER_DAY = 0.14;
export const CHILD_FOOD_6_11_PER_DAY = 0.21;
export const CHILD_FOOD_12_15_PER_DAY = 0.28;
export const FARM_YIELD_PER_LAND_PER_DAY = 0.4;
export const LAND_BASE_PRICE = 18;
export const LAND_PRICE_STEP = 4;
export const HUNGER_MAX = 100;
export const CHAPTER_EVENT_DELAY_DAYS = 30;

export const ORIGINS = {
  peasant: { id: 'peasant', label: '寒门', desc: '有两方薄田，识字不多，但牵连较少。', money: 45, grain: 120, land: 2, reputation: 5, region: '洛阳近郊', skills: { knowledge: 1, martial: 2, trade: 1, social: 1, strategy: 1 } },
  merchant: { id: 'merchant', label: '商旅', desc: '父辈跑过几条商路，手上有本钱，也有未清的账。', money: 140, grain: 120, land: 0, reputation: 5, region: '洛阳', skills: { knowledge: 2, martial: 1, trade: 5, social: 3, strategy: 2 } },
  gentry: { id: 'gentry', label: '士族', desc: '族谱尚在、田产渐薄，门第仍能换来一次举荐。', money: 70, grain: 120, land: 1, reputation: 25, region: '洛阳', skills: { knowledge: 5, martial: 1, trade: 1, social: 4, strategy: 3 } },
  royal: { id: 'royal', label: '司马宗室', desc: '有皇室血脉，却离权力很远，政治风向会先找上门。', money: 90, grain: 120, land: 1, reputation: 35, region: '洛阳', skills: { knowledge: 3, martial: 3, trade: 1, social: 4, strategy: 5 } }
};

export const REGIONS = {
  '洛阳': { id: '洛阳', type: '京畿', safety: 35, trade: 85, office: 90, flavor: '宫门、坊市和流言都在这里交汇。' },
  '洛阳近郊': { id: '洛阳近郊', type: '乡里', safety: 48, trade: 45, office: 30, flavor: '薄田与驿道相邻，先听见风声，后看见兵马。' },
  '河内坞堡': { id: '河内坞堡', type: '坞堡', safety: 62, trade: 35, office: 28, flavor: '豪强筑垒自守，能收留人，也会收取代价。' },
  '荆州': { id: '荆州', type: '南方', safety: 68, trade: 70, office: 55, flavor: '江汉水路渐成新的生计，旧门第也要重新排位。' },
  '江淮渡口': { id: '江淮渡口', type: '渡口', safety: 55, trade: 88, office: 35, flavor: '渡船、流民和军报在此擦肩而过。' },
  '建康': { id: '建康', type: '东晋都城', safety: 72, trade: 72, office: 92, flavor: '北来士族带着旧姓，江南家族守着新地。' }
};

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

const CHAPTER_EVENTS = [
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

const RANDOM_EVENTS = [
  { id: 'r-illness', title: '家人染病', text: '连日奔波后，家中有人发起了热。', options: [
    { id: 'rest', label: '停工照料', consequence: '粮 -3，当前人物健康 +6', effect: { grain: -3, health: 6 } },
    { id: 'doctor', label: '请医者', consequence: '钱 -8，当前人物健康 +10', effect: { money: -8, health: 10 } },
    { id: 'endure', label: '先熬过去', consequence: '健康 -5', effect: { health: -5 } }
  ] },
  { id: 'r-tax', title: '临时征敛', text: '地方催来一笔临时钱粮，若不应付，往后的关系会更难。', options: [
    { id: 'money', label: '出钱', consequence: '钱 -10，声望 +2', effect: { money: -10, reputation: 2 } },
    { id: 'grain', label: '交粮', consequence: '粮 -8，声望 +1', effect: { grain: -8, reputation: 1 } },
    { id: 'avoid', label: '设法拖延', consequence: '声望 -3，战乱压力 +2', effect: { reputation: -3, unrest: 2 } }
  ] },
  { id: 'r-traveler', title: '故人来信', text: '一封从远地转来的信带来了消息，也带来了选择。', options: [
    { id: 'help', label: '接济来人', consequence: '粮 -4，声望 +4', effect: { grain: -4, reputation: 4 } },
    { id: 'ask', label: '打听道路', consequence: '迁徙准备 +8', effect: { preparation: 8 } },
    { id: 'keep', label: '只收下消息', consequence: '学识 +0.15', effect: { knowledge: 0.15 } }
  ] },
  { id: 'r-harvest', title: '田间有收成', text: '这一阵天气还算照应，家中薄田比预想多收了一些。', options: [
    { id: 'store', label: '入仓', consequence: '粮 +10', effect: { grain: 10 } },
    { id: 'sell', label: '卖出一部分', consequence: '钱 +8，粮 +4', effect: { money: 8, grain: 4 } },
    { id: 'share', label: '分给亲邻', consequence: '粮 +3，声望 +5', effect: { grain: 3, reputation: 5 } }
  ] }
];

const ACTION_DEFS = {
  trade: { id: 'trade', label: '谋生行商', icon: '🧳', kind: 'routine', desc: '持续跑商，逐日积累钱财；乱世中有小概率受损。' },
  study: { id: 'study', label: '读书求学', icon: '📜', kind: 'routine', desc: '持续抄书求学，缓慢提升学识与声望。' },
  enlist: { id: 'enlist', label: '投身军旅', icon: '⚔', kind: 'routine', desc: '持续领取军饷并提升武艺，但每天都承担更高风险。' },
  rest: { id: 'rest', label: '休养', icon: '🍵', kind: 'routine', desc: '暂停奔波，额外消耗口粮，持续恢复健康。' },
  prepare: { id: 'prepare', label: '筹备迁徙', icon: '🧭', kind: 'routine', desc: '持续筹集路费、干粮与凭证，提高迁徙准备。' },
  cultivate: { id: 'cultivate', label: '耕作', icon: '🌾', kind: 'routine', desc: '把主要精力放在田产，每日获得少量粮食。' },
  manage: { id: 'manage', label: '料理家门', icon: '🏠', kind: 'routine', desc: '持续整理家业与关系，提高家族凝聚。' },
  migrate: { id: 'migrate', label: '举家迁徙', icon: '⛵', kind: 'project', duration: 30, desc: '选定目的地后上路，约三十日完成；途中照常吃饭并可能遇险。' },
  marry: { id: 'marry', label: '筹办婚事', icon: '囍', kind: 'project', duration: 15, desc: '为当前可婚人物筹办婚事，完成后建立姻亲关系。' },
  child: { id: 'child', label: '商议添丁', icon: '👶', kind: 'project', duration: 1, desc: '用一天确定添丁计划；怀孕后约二百七十日生产。' }
};

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeSeed = seed => (Number(seed) >>> 0) || 1;
const nextRng = current => (Math.imul(current >>> 0, 1664525) + 1013904223) >>> 0;
function random(state) { state.rngState = nextRng(state.rngState); return state.rngState / 4294967296; }
function makeId(prefix, state) { return `${prefix}-${state.nextId++}`; }
function round1(value) { return Math.round(value * 10) / 10; }
function round2(value) { return Math.round(Number(value || 0) * 100) / 100; }
function addLog(state, kind, title, text) { state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text }); }
function alivePeople(state) { return Object.values(state.people).filter(person => person.alive); }
export { alivePeople };

function person(state, name, age, role, extra = {}) {
  return {
    id: makeId('person', state), name, age, role, sex: extra.sex || '男', origin: state.origin,
    alive: true, health: extra.health ?? 78, hunger: clamp(extra.hunger ?? 0, 0, HUNGER_MAX), married: false, spouseId: null,
    childrenIds: [], parentId: extra.parentId ?? null, parentIds: extra.parentIds ? [...extra.parentIds] : (extra.parentId ? [extra.parentId] : []),
    familyId: extra.familyId ?? state.family.id, bloodlineFromRoot: extra.bloodlineFromRoot ?? false,
    skills: { knowledge: 1, martial: 1, trade: 1, social: 1, strategy: 1, ...(extra.skills || {}) },
    profession: extra.profession || 'farmer', traits: [...(extra.traits || ['谨慎'])], location: extra.location || state.region,
    generation: extra.generation ?? 0, notes: [], lifespan: extra.lifespan ?? (78 + Math.floor(random(state) * 12)),
    pregnancy: null, birthCooldownDays: 0, warningLogged: false
  };
}

function syncResources(state) {
  const current = getCurrent(state);
  state.resources.money = round1(Math.max(0, state.resources.money));
  state.resources.grain = round2(Math.max(0, state.resources.grain));
  state.resources.reputation = round1(Math.max(0, state.resources.reputation));
  state.resources.health = round1(clamp(current?.health ?? 0, 0, 100));
  const householdPeople = alivePeople(state).filter(p => p.familyId === state.family.id);
  state.resources.hunger = round1(householdPeople.length ? householdPeople.reduce((sum, p) => sum + clamp(Number(p.hunger) || 0, 0, HUNGER_MAX), 0) / householdPeople.length : 0);
  state.resources.land = state.household.land;
  state.household.money = state.resources.money;
  state.household.grain = state.resources.grain;
  state.dailyFood = getDailyFoodCost(state);
}

export function createGame({ surname = '沈', origin = 'peasant', seed = 20260908 } = {}) {
  if (typeof surname !== 'string' || !surname.trim() || surname.length > 8) throw new Error('姓氏无效');
  const profile = ORIGINS[origin] || ORIGINS.peasant;
  const state = {
    version: VERSION, seed: Number(seed) || 1, rngState: normalizeSeed(seed), nextId: 1,
    elapsedDays: 0, year: START_YEAR, month: 1, day: 1, phase: 'playing', endpoint: false, running: false,
    surname: surname.trim(), origin: profile.id, region: profile.region, unrest: 8, grainPrice: 1, dailyFood: 0,
    resources: { money: profile.money, grain: profile.grain, land: profile.land, reputation: profile.reputation, health: 78, hunger: 0 },
    family: { id: 'family-1', surname: surname.trim(), title: `${surname.trim()}氏家门`, cohesion: 65, reputation: profile.reputation, legacy: ['祖籍洛阳'], households: [] },
    household: { id: 'household-1', label: '本家', money: profile.money, grain: profile.grain, land: profile.land, preparation: 0, location: profile.region },
    rootId: null, playerId: null, activeId: null, selectedPersonId: null,
    currentActivity: null, pendingSuccession: false, pendingGuardian: null, pendingEvent: null, pauseReason: '等待选择行动',
    people: {}, relations: {}, assets: [], history: [], eventLog: [], storyFlags: {}, chapterSeen: {}, randomEventCount: 0,
    ending: null
  };
  state.family.households.push({ id: 'household-1', label: '本家', memberIds: [], assets: [], location: profile.region });
  const protagonist = person(state, `${surname.trim()}氏`, 18, 'current', {
    sex: '男', bloodlineFromRoot: true, health: 78, location: profile.region, lifespan: 82 + Math.floor(random(state) * 8),
    profession: origin === 'merchant' ? 'trader' : origin === 'gentry' || origin === 'royal' ? 'clerk' : 'farmer',
    traits: origin === 'royal' ? ['谨慎', '宗室血脉'] : origin === 'gentry' ? ['守礼', '旧族'] : ['谨慎'],
    skills: profile.skills
  });
  state.people[protagonist.id] = protagonist; state.rootId = protagonist.id; state.playerId = protagonist.id; state.activeId = protagonist.id; state.selectedPersonId = protagonist.id;
  const mother = person(state, '母亲', 43, 'mother', { sex: '女', bloodlineFromRoot: false, health: 62, location: profile.region, profession: 'farmer', lifespan: 80 + Math.floor(random(state) * 8) });
  state.people[mother.id] = mother;
  state.family.households[0].memberIds.push(protagonist.id, mother.id);
  const asset = { id: 'asset-1', type: '田产', name: '祖屋旁的薄田', value: 24, location: profile.region, ownerId: protagonist.id };
  state.assets.push(asset); state.family.households[0].assets.push(asset.id);
  addLog(state, 'story', '一纸家书', `你在${profile.region}醒来。日子不再按“回合”停住：只要你开始行动，时间就会一天天向前。`);
  addLog(state, 'story', '开局身份', `${profile.label}：${profile.desc}`);
  syncResources(state);
  return state;
}

export function getCurrent(state) { return state.playerId ? state.people[state.playerId] || null : null; }
export function getChapter(state) { return CHAPTERS.find(c => state.year >= c.years[0] && state.year <= c.years[1]) || CHAPTERS[CHAPTERS.length - 1]; }
export function getDateLabel(state) { return `${state.year}年${state.month}月${state.day}日`; }
export function getPersonFoodCost(person) {
  if (!person?.alive) return 0;
  const age = Number(person.age) || 0;
  if (age < 6) return CHILD_FOOD_0_5_PER_DAY;
  if (age < 12) return CHILD_FOOD_6_11_PER_DAY;
  if (age < 16) return CHILD_FOOD_12_15_PER_DAY;
  return FOOD_PER_PERSON_PER_DAY;
}
export function getDailyFoodCost(state) {
  return round2(alivePeople(state).filter(p => p.familyId === state.family.id).reduce((total, p) => total + getPersonFoodCost(p), 0));
}

export function getLandPrice(state, acres = 1) {
  const amount = Number(acres);
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) return Infinity;
  let total = 0;
  for (let i = 0; i < amount; i += 1) total += LAND_BASE_PRICE + (state.household.land + i) * LAND_PRICE_STEP;
  return round1(total);
}

export function buyLand(state, acres = 1) {
  if (state.phase !== 'playing' || state.endpoint || state.pendingEvent) return { ok: false, message: '当前不能购买田地。' };
  const amount = Number(acres);
  const cost = getLandPrice(state, amount);
  if (!Number.isFinite(cost)) return { ok: false, message: '购买亩数必须是1至20亩。' };
  if (state.resources.money < cost) return { ok: false, message: `钱粮不足，购买${amount}亩田地需要${cost}钱。` };
  state.resources.money = round1(state.resources.money - cost);
  state.household.land += amount;
  const asset = { id: makeId('asset', state), type: '田产', name: `新购田地（${amount}亩）`, area: amount, value: cost, location: state.region, ownerId: state.playerId };
  state.assets.push(asset);
  state.family.households[0].assets.push(asset.id);
  addLog(state, 'choice', '购置田地', `花费${cost}钱购置${amount}亩田地，现有田产${state.household.land}亩。`);
  syncResources(state);
  return { ok: true, cost, acres: amount, land: state.household.land, message: `已购置${amount}亩田地，花费${cost}钱。` };
}

function bloodDescendant(state, id) { return Boolean(state.people[id]?.bloodlineFromRoot); }
function actionTarget(state, id) {
  if (!['marry', 'child'].includes(id)) return getCurrent(state);
  const selected = state.selectedPersonId ? state.people[state.selectedPersonId] : null;
  if (selected?.alive && selected.familyId === state.family.id && selected.age >= 16 && bloodDescendant(state, selected.id)) return selected;
  return getCurrent(state);
}
function canBeginPregnancy(state, current) {
  if (!current || !current.alive || !current.married || current.age < 18) return false;
  const spouse = current.spouseId ? state.people[current.spouseId] : null;
  if (!spouse || !spouse.alive || spouse.age < 18) return false;
  const mother = current.sex === '女' ? current : spouse;
  return mother.age >= 18 && mother.age <= 45 && !mother.pregnancy && mother.birthCooldownDays <= 0;
}
function actionDisabled(state, action) {
  const current = getCurrent(state);
  if (!current || !current.alive || state.phase !== 'playing' || state.endpoint || state.pendingEvent) return true;
  if (current.age < 16 && !['study', 'rest'].includes(action.id)) return true;
  const target = actionTarget(state, action.id);
  if (action.id === 'migrate') return state.resources.money < 15 || state.resources.grain < 10;
  if (action.id === 'marry') return !target || target.married || target.age < 18 || state.resources.money < 12;
  if (action.id === 'child') return !canBeginPregnancy(state, target);
  if (action.id === 'rest') return state.resources.grain < 2;
  return false;
}
function actionRisk(state, id) {
  if (id === 'trade' && state.unrest > 35) return '商路不稳，持续行商可能损失货物或受伤。';
  if (id === 'enlist') return '军旅会持续承担染疾与伤亡风险。';
  if (id === 'migrate' && state.unrest > 20) return '迁徙途中仍会每日消耗口粮，并可能遇到乱兵。';
  return null;
}
export function getActions(state) {
  return Object.values(ACTION_DEFS).map(action => ({ ...action, risk: actionRisk(state, action.id), disabled: actionDisabled(state, action), selected: state.currentActivity?.id === action.id }));
}

export function selectActivity(state, actionId, options = {}) {
  if (state.phase !== 'playing' || state.endpoint || state.pendingEvent) return { ok: false, message: '当前不能选择行动。' };
  const action = ACTION_DEFS[actionId];
  if (!action || actionDisabled(state, action)) return { ok: false, message: '这个行动当前不可用。' };
  if (actionId === 'migrate' && (!options.destination || !REGIONS[options.destination] || options.destination === state.region)) return { ok: false, message: '请选择与当前不同的迁徙地点。' };
  state.currentActivity = { id: actionId, kind: action.kind, elapsed: 0, duration: action.duration || null, destination: options.destination || null, charged: false };
  state.running = false;
  state.pauseReason = `已选择：${action.label}`;
  addLog(state, 'action', '安排下一段日子', `${action.label}。点击“开始时间”后，日历会持续向前。`);
  return { ok: true, message: `已选择“${action.label}”，点击开始后时间将连续流逝。` };
}

export function setRunning(state, running) {
  if (running && (state.phase !== 'playing' || state.endpoint || state.pendingEvent || !state.currentActivity)) return { ok: false, message: '请先处理事件并选择行动。' };
  state.running = Boolean(running);
  state.pauseReason = state.running ? null : (state.pauseReason || '玩家暂停');
  return { ok: true, message: state.running ? '时间开始流逝。' : '时间已暂停。' };
}

function chargeProjectStart(state, activity) {
  if (activity.charged) return true;
  if (activity.id === 'migrate') {
    if (state.resources.money < 15 || state.resources.grain < 10) return false;
    state.resources.money -= 15; state.resources.grain -= 10;
  } else if (activity.id === 'marry') {
    if (state.resources.money < 12) return false;
    state.resources.money -= 12;
  }
  activity.charged = true;
  return true;
}

function applyDailyActivity(state) {
  const activity = state.currentActivity;
  const current = getCurrent(state);
  if (!activity || !current?.alive) return { completed: false };
  activity.elapsed += 1;
  // Optional V1.4.1 daily-work override: resting is settled once, after food purchase.
  if (state.__skipDailyActivity) return { completed: false };
  if (activity.kind === 'project' && !chargeProjectStart(state, activity)) return { crisis: '资源不足，无法继续当前计划。' };

  if (activity.id === 'trade') {
    const regionBonus = (REGIONS[state.region]?.trade || 50) / 100;
    if (!state.__v14DailyWork) state.resources.money += (0.16 + random(state) * 0.16) * regionBonus;
    current.skills.trade += 0.004;
  } else if (activity.id === 'study') {
    current.skills.knowledge += 0.012; state.resources.reputation += 0.008;
  } else if (activity.id === 'enlist') {
    if (activity.elapsed % 7 === 0) { state.resources.money += 4; state.resources.grain += 1; }
    current.skills.martial += 0.006; current.health = clamp(current.health - 0.025, 0, 100);
  } else if (activity.id === 'rest') {
    state.resources.grain = Math.max(0, state.resources.grain - 0.2); current.health = clamp(current.health + 0.16, 0, 100);
  } else if (activity.id === 'prepare') {
    if (activity.elapsed % 5 === 0 && state.resources.money >= 1) { state.resources.money -= 1; state.household.preparation = clamp(state.household.preparation + 2.5, 0, 100); }
  } else if (activity.id === 'cultivate') {
    if (!state.__v14DailyWork) state.resources.grain += Math.max(0.05, state.household.land * FARM_YIELD_PER_LAND_PER_DAY); current.skills.trade += 0.002;
  } else if (activity.id === 'manage') {
    state.family.cohesion = clamp(state.family.cohesion + 0.04, 0, 100);
    if (activity.elapsed % 15 === 0) state.resources.reputation += 0.3;
  }

  if (activity.kind === 'project' && activity.elapsed >= activity.duration) {
    return completeProject(state, activity, current);
  }
  return { completed: false };
}

function completeProject(state, activity, current) {
  if (activity.id === 'migrate') {
    const destination = activity.destination;
    const safety = REGIONS[destination].safety;
    const loss = Math.max(0, Math.ceil((state.unrest - safety) / 8) - Math.floor(state.household.preparation / 20));
    state.resources.grain = Math.max(0, state.resources.grain - loss);
    state.region = destination; state.household.location = destination; state.household.preparation = Math.max(0, state.household.preparation - 20);
    for (const p of Object.values(state.people)) if (p.alive && p.familyId === state.family.id) p.location = destination;
    state.family.legacy.push(`迁居${destination}`);
    addLog(state, 'story', '迁徙完成', `经过${activity.duration}日，一家人抵达${destination}。`);
  } else if (activity.id === 'marry') {
    const target = actionTarget(state, 'marry');
    if (!target || target.married) return { completed: true, message: '婚事未能继续。' };
    const spouse = person(state, `${state.surname}·姻亲`, Math.max(18, Math.floor(target.age) - 2), 'spouse', { sex: target.sex === '女' ? '男' : '女', bloodlineFromRoot: false, health: 74, location: target.location, profession: 'artisan', generation: target.generation, traits: ['坚韧'] });
    state.people[spouse.id] = spouse; target.married = true; target.spouseId = spouse.id; spouse.married = true; spouse.spouseId = target.id;
    state.family.households[0].memberIds.push(spouse.id);
    const relation = { type: '婚姻', trust: 55, from: target.id, to: spouse.id };
    state.relations[`${target.id}:${spouse.id}`] = relation; state.relations[`${spouse.id}:${target.id}`] = { ...relation, from: spouse.id, to: target.id };
    addLog(state, 'story', '婚事办妥', `${target.name}完成婚事，家门新增一位姻亲。`);
  } else if (activity.id === 'child') {
    const target = actionTarget(state, 'child');
    if (canBeginPregnancy(state, target)) {
      const spouse = state.people[target.spouseId]; const mother = target.sex === '女' ? target : spouse;
      mother.pregnancy = { remainingDays: 271, fatherId: target.id === mother.id ? spouse.id : target.id, startedElapsedDay: state.elapsedDays };
      mother.birthCooldownDays = 360;
      addLog(state, 'story', '添丁计划', '家中开始等待新生命，约二百七十日后生产。');
    }
  }
  state.currentActivity = null;
  return { completed: true, message: '当前计划已经完成，请重新选择行动。' };
}

function consumeFood(state) {
  const cost = getDailyFoodCost(state);
  const members = alivePeople(state).filter(p => p.familyId === state.family.id);
  const available = Math.max(0, Number(state.resources.grain) || 0);
  const mealRatio = cost > 0 ? clamp(available / cost, 0, 1) : 1;
  state.resources.grain = round2(Math.max(0, available - cost));
  for (const p of members) {
    if (mealRatio >= 1) {
      p.hunger = round1(clamp((Number(p.hunger) || 0) - 12, 0, HUNGER_MAX));
      continue;
    }
    p.hunger = round1(clamp((Number(p.hunger) || 0) + 15 * (1 - mealRatio), 0, HUNGER_MAX));
    if (p.hunger >= 60) p.health = clamp(p.health - 0.1, 0, 100);
    if (p.hunger >= 80) p.health = clamp(p.health - 0.15, 0, 100);
    if (p.hunger >= HUNGER_MAX) p.health = clamp(p.health - (p.health <= 5 ? 5 : 0.25), 0, 100);
  }
  if (mealRatio >= 1) return null;
  state.family.cohesion = clamp(state.family.cohesion - 1, 0, 100);
  return '家中已经断粮。';
}

function advanceDate(state) {
  state.elapsedDays += 1;
  state.day += 1;
  if (state.day > MONTH_DAYS[state.month - 1]) { state.day = 1; state.month += 1; }
  if (state.month > 12) { state.month = 1; state.year += 1; }
}

function settlePeopleDaily(state) {
  for (const p of Object.values(state.people)) {
    if (!p.alive) continue;
    p.age = Number((p.age + 1 / DAYS_PER_YEAR).toFixed(4));
    if (p.birthCooldownDays > 0) p.birthCooldownDays -= 1;
    if (p.pregnancy) {
      p.pregnancy.remainingDays -= 1;
      if (p.pregnancy.remainingDays <= 0) giveBirth(state, p);
    }
    if (p.age > 50) p.health = clamp(p.health - (p.age > 65 ? 0.006 : 0.002), 0, 100);
    if (!p.warningLogged && (p.health < 35 || p.age >= p.lifespan - 5)) {
      p.warningLogged = true; addLog(state, 'warning', `${p.name}需要照看`, `${p.name}的健康或年岁已经接近危险线。`);
    }
    if (p.health <= 0) killPerson(state, p.id, p.hunger >= HUNGER_MAX ? '饥饿' : '久病或饥馑');
    else if (p.age >= p.lifespan) killPerson(state, p.id, '年老体衰');
  }
}

function giveBirth(state, mother) {
  const father = state.people[mother.pregnancy.fatherId];
  const bloodParent = bloodDescendant(state, mother.id) ? mother : father;
  const child = person(state, `${state.surname}${random(state) < 0.5 ? '儿' : '女'}·${state.nextId}`, 0, 'child', {
    parentId: bloodParent?.id || mother.id, parentIds: [mother.id, father?.id].filter(Boolean), bloodlineFromRoot: Boolean(bloodParent?.bloodlineFromRoot),
    familyId: state.family.id, generation: Math.max(mother.generation, father?.generation || 0) + 1, location: mother.location,
    health: 70 + Math.floor(random(state) * 20), profession: 'farmer'
  });
  state.people[child.id] = child; mother.childrenIds.push(child.id); if (father) father.childrenIds.push(child.id);
  state.family.households[0].memberIds.push(child.id); mother.pregnancy = null;
  addLog(state, 'story', '添丁', `${mother.name}的家中添了一个孩子：${child.name}。`);
}

function killPerson(state, personId, reason) {
  const target = state.people[personId]; if (!target || !target.alive) return null;
  target.alive = false; target.notes.push(`卒于${getDateLabel(state)}：${reason}`); addLog(state, 'story', `${target.name}离世`, `原因：${reason}。`);
  if (personId === state.playerId) {
    state.playerId = null; state.running = false; state.currentActivity = null;
    const successors = listSuccessors(state);
    if (successors.length) { state.pendingSuccession = true; state.phase = state.endpoint ? 'ended' : 'succession'; state.pauseReason = '主角离世，等待血缘后代接续'; }
    else { state.pendingSuccession = false; state.phase = 'ended'; state.ending = { noDescendants: true, familyContinues: false }; state.pauseReason = '家族血脉中断'; }
  }
  return target;
}

function dailyRisk(state) {
  if (state.__v14DailyWork && state.currentActivity?.id === 'trade') return;
  const current = getCurrent(state); const id = state.currentActivity?.id;
  if (!current || !id) return null;
  let p = 0;
  if (id === 'trade') p = state.unrest > 40 ? 0.0009 : 0.00025;
  if (id === 'enlist') p = state.unrest > 40 ? 0.0017 : 0.00065;
  if (id === 'migrate') p = Math.max(0.00025, 0.0011 - state.household.preparation / 120000);
  if (p && random(state) < p) {
    if (id === 'enlist' && random(state) < 0.25) return killPerson(state, current.id, '军中染疾');
    current.health = clamp(current.health - (id === 'migrate' ? 5 : 3), 0, 100);
    state.resources.money = Math.max(0, state.resources.money - (id === 'trade' ? 7 : 0));
    addLog(state, 'warning', '途中受挫', id === 'trade' ? '商路受阻，损失了一批货物。' : '这段日子并不平静，身体受了损伤。');
  }
  return null;
}

function queueEvent(state, event, source = 'story') {
  state.pendingEvent = { ...clone(event), source };
  state.running = false;
  state.pauseReason = source === 'history' ? '重大历史事件发生' : source === 'random' ? '随机事件发生' : '剧情事件发生';
  addLog(state, source === 'history' ? 'history' : 'story', event.title, event.text);
}

function maybeHistoricalEvent(state) {
  if (state.month !== 1 || state.day !== 1) return false;
  const h = HISTORY.find(item => item.year === state.year && !state.history.includes(item.id));
  if (!h) return false;
  state.history.push(h.id); state.unrest = clamp(state.unrest + (h.impact.unrest || 0), 0, 100); state.grainPrice = clamp(state.grainPrice + (h.impact.grainPrice || 0), 1, 9);
  if (h.impact.migration) state.storyFlags.migrationCrisis = true;
  queueEvent(state, {
    id: `history-${h.id}`, title: `【重大历史】${h.title}`, text: `${h.text}\n历史结果不会被取消，但你可以决定家族如何应对。`,
    options: [
      { id: 'cautious', label: '谨慎应对', consequence: '迁徙准备 +6，凝聚 +2', effect: { preparation: 6, cohesion: 2 } },
      { id: 'chance', label: '顺势求机', consequence: '声望 +4，战乱压力 +2', effect: { reputation: 4, unrest: 2 } },
      { id: 'supplies', label: '先保钱粮', consequence: '粮 -2，迁徙准备 +4', effect: { grain: -2, preparation: 4 } }
    ]
  }, 'history');
  return true;
}

function chapterElapsedDays(state, chapter) {
  return state.elapsedDays - (chapter.years[0] - START_YEAR) * DAYS_PER_YEAR;
}

function maybeChapterEvent(state) {
  const chapter = getChapter(state);
  if (state.chapterSeen[chapter.id]) return false;
  if (chapterElapsedDays(state, chapter) < CHAPTER_EVENT_DELAY_DAYS) return false;
  const event = CHAPTER_EVENTS.find(e => e.chapter === chapter.id); if (!event) return false;
  queueEvent(state, event, 'story'); return true;
}

function maybeRandomEvent(state) {
  if (state.pendingEvent || state.phase !== 'playing' || state.endpoint) return false;
  const chance = 0.004 + state.unrest / 50000;
  if (random(state) >= chance) return false;
  const event = RANDOM_EVENTS[Math.floor(random(state) * RANDOM_EVENTS.length)];
  state.randomEventCount += 1; queueEvent(state, { ...event, id: `${event.id}-${state.elapsedDays}-${state.randomEventCount}` }, 'random'); return true;
}

function maybeResourceCrisis(state, crisisText) {
  // When the household cannot afford the sole recovery option, leave time
  // running so the player can still work for money while hunger worsens.
  if (!crisisText || state.pendingEvent || state.resources.money < 10) return false;
  queueEvent(state, {
    id: `crisis-${state.elapsedDays}`, title: '家中断粮', text: '每天都要吃饭。仓中已经没有足够口粮，时间因此暂停。', options: [
      { id: 'buy', label: '花钱买粮', consequence: '钱 -10，粮 +12', effect: { money: -10, grain: 12 } }
    ]
  }, 'random'); return true;
}

export function advanceDay(state) {
  if (state.phase !== 'playing' || state.endpoint || state.pendingEvent || !state.currentActivity) return { ok: false, paused: true, message: '当前时间不能继续。' };
  state.running = true;
  const activityResult = applyDailyActivity(state);
  const beforeFoodResult = typeof state.__beforeFood === 'function' ? state.__beforeFood() : null;
  const foodCrisis = consumeFood(state);
  dailyRisk(state);
  settlePeopleDaily(state);
  if (state.phase !== 'playing') { syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  advanceDate(state);
  if (state.elapsedDays >= TOTAL_DAYS || state.year >= END_YEAR) {
    state.year = END_YEAR; state.month = 1; state.day = 1; state.endpoint = true; state.phase = 'ended'; state.running = false; state.pauseReason = '350年春，第一版纪事收束';
    state.ending = { noDescendants: listSuccessors(state).length === 0, familyContinues: listSuccessors(state).length > 0 };
    addLog(state, 'ending', '第一版纪事收束', state.ending.familyContinues ? '350年春，家书仍由后代保存。' : '350年春，家书停在这一代。');
    syncResources(state); return { ok: true, paused: true, endpoint: true };
  }
  if (maybeHistoricalEvent(state)) { syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  if (maybeChapterEvent(state)) { syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  if (maybeResourceCrisis(state, foodCrisis)) { syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  if (activityResult?.crisis) { state.running = false; state.pauseReason = activityResult.crisis; syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  if (activityResult?.completed) { state.running = false; state.pauseReason = activityResult.message; syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  if (maybeRandomEvent(state)) { syncResources(state); return { ok: true, paused: true, reason: state.pauseReason }; }
  syncResources(state);
  return { ok: true, paused: false, date: getDateLabel(state), beforeFood: beforeFoodResult };
}

function canPay(state, effect) {
  return state.resources.money + (effect.money || 0) >= 0 && state.resources.grain + (effect.grain || 0) >= 0;
}
function applyEffect(state, effect = {}) {
  state.resources.money += effect.money || 0; state.resources.grain += effect.grain || 0; state.resources.reputation += effect.reputation || 0;
  state.family.cohesion = clamp(state.family.cohesion + (effect.cohesion || 0), 0, 100); state.household.preparation = clamp(state.household.preparation + (effect.preparation || 0), 0, 100);
  state.household.land += effect.land || 0; state.resources.land = state.household.land; state.unrest = clamp(state.unrest + (effect.unrest || 0), 0, 100);
  const current = getCurrent(state); if (current) { current.skills.knowledge += effect.knowledge || 0; current.health = clamp(current.health + (effect.health || 0), 0, 100); }
  if (effect.split) { state.storyFlags.splitHouseholds = true; state.family.legacy.push('南北两地通信'); }
}
export function resolveEvent(state, eventId, optionId) {
  if (!state.pendingEvent || state.pendingEvent.id !== eventId) return { ok: false, message: '没有这件待处理事件。' };
  const option = state.pendingEvent.options?.find(o => o.id === optionId); if (!option) return { ok: false, message: '选项无效。' };
  if (!canPay(state, option.effect || {})) return { ok: false, message: '钱粮不足，无法选择这一项。' };
  const sourceEvent = state.pendingEvent; applyEffect(state, option.effect || {});
  if (sourceEvent.source === 'story') { const chapter = CHAPTER_EVENTS.find(e => e.id === sourceEvent.id); if (chapter) state.chapterSeen[chapter.chapter] = true; }
  addLog(state, 'choice', sourceEvent.title, `你选择“${option.label}”：${option.consequence}`);
  state.pendingEvent = null; state.running = false; state.pauseReason = '事件已处理，可重新选择行动或继续原行动'; syncResources(state);
  return { ok: true, message: `${sourceEvent.title}：${option.consequence}` };
}

export function listSuccessors(state) {
  return alivePeople(state).filter(p => p.id !== state.playerId && p.id !== state.rootId && bloodDescendant(state, p.id)).sort((a, b) => (a.age - b.age) || a.generation - b.generation || a.id.localeCompare(b.id));
}
export function listGuardians(state, successorId = state.pendingGuardian?.successorId) {
  const guardians = alivePeople(state).filter(p => p.id !== successorId && p.age >= 18 && p.familyId === state.family.id);
  return guardians.length ? guardians : [{ id: 'community-guardian', name: '乡里长者', age: 45, alive: true, role: 'guardian', location: state.region, familyId: state.family.id }];
}
export function continueAs(state, personId) {
  if (!state.pendingSuccession || state.endpoint) return { ok: false, message: '当前没有可接续的家书。' };
  const c = state.people[personId]; if (!c || !c.alive || !bloodDescendant(state, personId) || personId === state.rootId) return { ok: false, message: '只有始祖血缘后代可以接续。' };
  state.selectedPersonId = personId;
  if (c.age < 16) { state.pendingGuardian = { successorId: personId }; state.phase = 'guardian'; state.pauseReason = '幼年接续，需要监护'; return { ok: true, needsGuardian: true, message: `${c.name}尚未成年，请先安排监护。` }; }
  state.playerId = personId; state.activeId = personId; state.pendingSuccession = false; state.phase = 'playing'; state.currentActivity = null; state.pauseReason = '新主角接续，请选择行动'; addLog(state, 'story', '家书续写', `${c.name}接过家书。`); syncResources(state); return { ok: true, message: `${c.name}成为新的主角。` };
}
export function performGuardianAction(state, guardianId, actionId = 'protect') {
  if (state.phase !== 'guardian' || !state.pendingGuardian) return { ok: false, message: '当前不需要监护安排。' };
  const child = state.people[state.pendingGuardian.successorId]; const guardian = state.people[guardianId]; const community = guardianId === 'community-guardian';
  if (!child?.alive || !bloodDescendant(state, child.id) || (!community && (!guardian?.alive || guardian.id === child.id || guardian.age < 18 || guardian.familyId !== state.family.id))) return { ok: false, message: '这位家人不能担任监护人。' };
  if (!['protect', 'teach'].includes(actionId)) return { ok: false, message: '监护行动无效。' };
  if (actionId === 'teach') child.skills.knowledge += community ? 0.25 : 0.4; else { child.health = clamp(child.health + (community ? 3 : 5), 0, 100); state.family.cohesion = clamp(state.family.cohesion + (community ? 2 : 4), 0, 100); }
  const guardianName = community ? '乡里长者' : guardian.name; state.playerId = child.id; state.activeId = child.id; state.pendingSuccession = false; state.pendingGuardian = null; state.phase = 'playing'; state.currentActivity = null; state.pauseReason = '监护完成，请选择行动'; addLog(state, 'story', '监护完成', `${guardianName}完成监护，${child.name}接过家书。`); syncResources(state); return { ok: true, message: `${child.name}已在${guardianName}监护下接续。` };
}

export function getFamilyTree(state) { return Object.values(state.people).filter(p => p.familyId === state.family.id).map(p => ({ ...p, age: Math.floor(p.age) })); }
export function getRelations(state) { return Object.values(state.relations); }
export function getTimeline(state) { return HISTORY.map(h => ({ ...h, occurred: state.history.includes(h.id) })); }
export function selectPerson(state, personId) { if (state.people[personId]) state.selectedPersonId = personId; return state.people[state.selectedPersonId] || null; }

export function serializeState(state) {
  const clean = clone(state); clean.running = false; return JSON.stringify(clean);
}

function migrateV2(data) {
  const quarter = Number(data.quarter || 1); const month = [1, 4, 7, 10][clamp(quarter - 1, 0, 3)];
  data.version = VERSION; data.month = month; data.day = 1; data.elapsedDays = Math.max(0, (Number(data.year || START_YEAR) - START_YEAR) * DAYS_PER_YEAR + (month - 1) * 30);
  data.running = false; data.currentActivity = null; data.pauseReason = '旧版季度存档已迁移，请重新选择连续行动'; data.dailyFood = 0; data.randomEventCount = data.randomEventCount || 0;
  delete data.tick; delete data.quarter; delete data.actionSlots;
  for (const p of Object.values(data.people || {})) { if ('birthCooldown' in p && !('birthCooldownDays' in p)) p.birthCooldownDays = Number(p.birthCooldown || 0) * 90; if (p.pregnancy?.remaining && !p.pregnancy.remainingDays) p.pregnancy.remainingDays = Number(p.pregnancy.remaining) * 90; delete p.birthCooldown; }
  for (const p of Object.values(data.people || {})) if (!Number.isFinite(Number(p.hunger))) p.hunger = 0;
  return data;
}
export function deserializeState(raw) {
  let data; try { data = typeof raw === 'string' ? JSON.parse(raw) : clone(raw); } catch { throw new Error('存档不是有效 JSON'); }
  if (!data || typeof data !== 'object' || !data.people || !data.family || !data.resources) throw new Error('存档结构无效');
  if (Number(data.version) === 2) data = migrateV2(data);
  if (Number(data.version) !== VERSION) throw new Error(`不支持的存档版本：${data.version}`);
  const chapter = getChapter(data);
  const earlyChapterEvent = data.pendingEvent?.source === 'story'
    && data.pendingEvent.id === `chapter-${chapter.id}`
    && chapterElapsedDays(data, chapter) < CHAPTER_EVENT_DELAY_DAYS;
  if (earlyChapterEvent) {
    data.pendingEvent = null;
    data.pauseReason = '章节剧情已延后，可继续原行动';
  }
  for (const p of Object.values(data.people)) if (!Number.isFinite(Number(p.hunger))) p.hunger = 0;
  data.running = false; syncResources(data); return data;
}

export const __test = {
  killPerson,
  setDate(state, year, month = 1, day = 1) { state.year = year; state.month = month; state.day = day; state.elapsedDays = Math.max(0, (year - START_YEAR) * DAYS_PER_YEAR + day - 1); return state; },
  queueRandomEvent(state, index = 0) { queueEvent(state, { ...RANDOM_EVENTS[index % RANDOM_EVENTS.length], id: `test-random-${state.elapsedDays}` }, 'random'); return state.pendingEvent; }
};
