import * as Base from './engine-v12.js?v=1.2.1';
import {
  V13_RULES,
  ensureAgriculture,
  getSeasonLabel,
  getFarmSummary,
  hireFarmWorkers,
  dismissFarmWorkers,
  settleMonthlyFarmWages,
  getGrainSellPrice,
  sellGrain,
  recordCultivationDay,
  rollSeasonWeather,
  resolveAgricultureEvent,
  isMinorMessageEvent,
  convertPendingMinorEventToMessage
} from './v13-rules.js?v=1.3.0';

export * from './engine-v12.js?v=1.2.1';
export {
  V13_RULES,
  ensureAgriculture,
  getFarmSummary,
  hireFarmWorkers,
  dismissFarmWorkers,
  settleMonthlyFarmWages,
  getGrainSellPrice,
  sellGrain,
  recordCultivationDay,
  rollSeasonWeather,
  isMinorMessageEvent
} from './v13-rules.js?v=1.3.0';

function exposeState(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function prepareState(state) {
  ensureAgriculture(state);
  return exposeState(state);
}

export function createGame(options) {
  return prepareState(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepareState(Base.deserializeState(raw));
}

export function getActions(state) {
  const season = getSeasonLabel(state?.month || 1);
  return Base.getActions(state).map(action => {
    if (action.id !== 'cultivate') return action;
    const desc = season === '春耕'
      ? '春季整地播种。田地越多，需要的家庭劳力或雇工越多；此时不会立即产粮。'
      : season === '夏管'
        ? '夏季除草、灌溉和照料庄稼。夏管完成度会直接影响秋收。'
        : season === '秋收'
          ? `秋季收粮。连续耕作约${V13_RULES.HARVEST_WORK_DAYS}日完成本年秋收，收成受农时、劳力与天灾影响。`
          : '冬季没有新粮收成，耕作只代表修整田地和农具；可改做其他谋生。';
    return { ...action, desc };
  });
}

export function resolveEvent(state, eventId, optionId) {
  if (state?.pendingEvent?.source === 'agriculture-major') {
    const result = resolveAgricultureEvent(state, eventId, optionId);
    exposeState(state);
    return result;
  }
  const result = Base.resolveEvent(state, eventId, optionId);
  exposeState(state);
  return result;
}

export function advanceDay(state) {
  if (!state) return { ok: false, message: '没有可推进的游戏状态。' };
  prepareState(state);
  const wasRunning = Boolean(state.running);

  // 已经出现的轻量生活事件直接记入消息，不再卡住时间。
  if (isMinorMessageEvent(state.pendingEvent)) {
    convertPendingMinorEventToMessage(state);
    state.running = wasRunning;
  }

  if (state.pendingEvent || state.phase !== 'playing' || state.endpoint) {
    exposeState(state);
    return Base.advanceDay(state);
  }

  const activity = state.currentActivity;
  const cultivating = activity?.id === 'cultivate';
  if (cultivating) activity.id = 'cultivate-v13';

  let result;
  try {
    result = Base.advanceDay(state);
  } finally {
    if (cultivating && activity) activity.id = 'cultivate';
  }

  exposeState(state);
  if (!result?.ok) return result;
  if (state.phase !== 'playing' || state.endpoint) return result;

  // Base 生成的轻量随机/章节事件转为消息，继续当前行动。
  let convertedMinor = false;
  if (isMinorMessageEvent(state.pendingEvent)) {
    convertedMinor = convertPendingMinorEventToMessage(state);
    state.running = wasRunning;
  }

  // 重大历史等事件仍然优先暂停，不能被农业消息覆盖。
  if (state.pendingEvent) {
    exposeState(state);
    return { ...result, paused: true, reason: state.pauseReason || result.reason };
  }

  settleMonthlyFarmWages(state);

  // 每季第一次推进会生成一次天气。小灾只记消息，重大天灾才暂停。
  rollSeasonWeather(state);
  if (state.pendingEvent?.source === 'agriculture-major') {
    exposeState(state);
    return { ok: true, paused: true, reason: state.pauseReason };
  }

  if (cultivating) {
    const farmResult = recordCultivationDay(state);
    const current = state.people?.[state.playerId];
    if (current?.skills) current.skills.trade = Number(current.skills.trade || 0) + 0.002;
    result = { ...result, agriculture: farmResult };
  }

  exposeState(state);
  if (convertedMinor) return { ...result, paused: false, reason: null };
  return result;
}
