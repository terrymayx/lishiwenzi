const HUNGER_MAX = 100;
const LAND_BASE_PRICE = 20;
const LAND_PRICE_STEP = 5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round1 = value => Math.round(value * 10) / 10;

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({
    year: state.year,
    month: state.month,
    day: state.day,
    kind,
    title,
    text
  });
}

function killFamilyMemberByStarvation(state, person, dateLabel) {
  if (!person?.alive) return false;
  person.alive = false;
  person.hunger = HUNGER_MAX;
  person.notes ??= [];
  person.notes.push(`卒于${dateLabel}：饥饿`);
  addLog(state, 'story', `${person.name}饿死`, '长期缺粮使饥饿达到100%，最终因饥饿死亡。');
  return true;
}

function refreshAverageHunger(state) {
  const householdId = state.family?.id;
  if (!state.resources || !householdId) return;
  const alive = Object.values(state.people || {}).filter(person => person.alive && person.familyId === householdId);
  state.resources.hunger = round1(alive.length
    ? alive.reduce((sum, person) => sum + clamp(Number(person.hunger) || 0, 0, HUNGER_MAX), 0) / alive.length
    : 0);
}

export function applyStarvationRules(state, { playerIdBefore = state.playerId, dateLabel = `${state.year}年${state.month}月${state.day}日` } = {}) {
  if (!state?.people) return { gameOver: false, deaths: [] };

  // V1.6.8 separates stamina from physical health. Reaching 100 hunger no longer
  // kills instantly here; the base daily engine keeps damaging physical health,
  // and the V1.6.8 mortality system handles death from deteriorating health.
  if (Number(state.vitals?.version || 0) >= 168) {
    refreshAverageHunger(state);
    return { gameOver: false, deaths: [] };
  }

  const deaths = [];
  const householdId = state.family?.id;
  const starving = Object.values(state.people).filter(person =>
    person && person.alive && person.familyId === householdId && clamp(Number(person.hunger) || 0, 0, HUNGER_MAX) >= HUNGER_MAX
  );

  const protagonist = state.people[playerIdBefore];
  if (protagonist && clamp(Number(protagonist.hunger) || 0, 0, HUNGER_MAX) >= HUNGER_MAX) {
    killFamilyMemberByStarvation(state, protagonist, dateLabel);
    deaths.push(protagonist.id);
    state.playerId = protagonist.id;
    state.activeId = protagonist.id;
    state.running = false;
    state.currentActivity = null;
    state.pendingSuccession = false;
    state.pendingGuardian = null;
    state.pendingEvent = null;
    state.phase = 'ended';
    state.endpoint = false;
    state.pauseReason = '饥饿达到100%，当前执笔人饿死，游戏结束';
    state.ending = {
      type: 'starvation',
      cause: '饥饿',
      date: dateLabel,
      personId: protagonist.id,
      personName: protagonist.name,
      land: Number(state.household?.land || 0),
      grain: round1(Number(state.resources?.grain || 0)),
      population: Object.values(state.people).filter(person => person.alive && person.familyId === householdId).length
    };
    addLog(state, 'ending', '饥荒终局', `${protagonist.name}的饥饿达到100%，家书在此中断。`);
    if (state.resources) state.resources.hunger = HUNGER_MAX;
    return { gameOver: true, deaths };
  }

  for (const person of starving) {
    if (person.id === playerIdBefore) continue;
    if (killFamilyMemberByStarvation(state, person, dateLabel)) deaths.push(person.id);
  }

  refreshAverageHunger(state);
  return { gameOver: false, deaths };
}

export function getLandPrice(state, acres = 1) {
  const amount = Number(acres);
  if (!Number.isInteger(amount) || amount < 1 || amount > 20) return Infinity;
  const currentLand = Number(state?.household?.land || 0);
  let total = 0;
  for (let i = 0; i < amount; i += 1) total += LAND_BASE_PRICE + (currentLand + i) * LAND_PRICE_STEP;
  return round1(total);
}

export function buyLand(state, acres = 1) {
  if (!state || state.phase !== 'playing' || state.endpoint || state.pendingEvent || state.running) {
    return { ok: false, message: '时间暂停且没有待处理事件时才能购买田地。' };
  }
  const amount = Number(acres);
  const cost = getLandPrice(state, amount);
  if (!Number.isFinite(cost)) return { ok: false, message: '购买亩数必须是1至20亩。' };
  if (Number(state.resources?.money || 0) < cost) return { ok: false, message: `购买${amount}亩田地需要${cost}钱。` };

  state.resources.money = round1(Number(state.resources.money) - cost);
  state.household.land = Number(state.household.land || 0) + amount;
  state.household.money = state.resources.money;
  state.resources.land = state.household.land;
  state.assets ??= [];
  state.nextId = Number(state.nextId || 1);
  const asset = {
    id: `asset-${state.nextId++}`,
    type: '田产',
    name: `新购田地（${amount}亩）`,
    area: amount,
    value: cost,
    location: state.region,
    ownerId: state.playerId
  };
  state.assets.push(asset);
  const household = state.family?.households?.[0];
  if (household) {
    household.assets ??= [];
    household.assets.push(asset.id);
  }
  addLog(state, 'choice', '购置田地', `花费${cost}钱购置${amount}亩田地，现有田产${state.household.land}亩。`);
  return { ok: true, cost, acres: amount, land: state.household.land, message: `已购置${amount}亩田地，花费${cost}钱。` };
}

export const V12_RULES = {
  HUNGER_MAX,
  LAND_BASE_PRICE,
  LAND_PRICE_STEP
};