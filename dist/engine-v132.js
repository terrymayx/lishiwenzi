import * as Base from './engine-v13.js?v=1.3.1';
import { recordHiredWorkerDay } from './v132-rules.js?v=1.3.2';

export * from './engine-v13.js?v=1.3.1';
export { recordHiredWorkerDay } from './v132-rules.js?v=1.3.2';

function exposeState(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

export function getActions(state) {
  const actions = Base.getActions(state).map(action => {
    if (action.id !== 'cultivate') return action;
    return {
      ...action,
      desc: '靠自己和家人亲自种田，按当前农时完成春耕、夏管和秋收；雇来的农工会独立自动耕作，即使你去行商、读书或从军也会继续干活。'
    };
  });
  return actions.sort((a, b) => (a.id === 'cultivate' ? -1 : b.id === 'cultivate' ? 1 : 0));
}

export function advanceDay(state) {
  const cultivating = state?.currentActivity?.id === 'cultivate';
  const result = Base.advanceDay(state);
  exposeState(state);
  if (!result?.ok || state?.endpoint || state?.phase !== 'playing') return result;
  if (state.pendingEvent) return result;

  // 选择“耕作”时，V1.3 的农业逻辑已代表家人亲自下田，并包含现有雇工协作。
  // 选择其他行动时，额外让雇工独立推进当季农事，从而解放当前执笔人的行动槽。
  if (cultivating) return result;

  const automaticFarm = recordHiredWorkerDay(state);
  exposeState(state);
  if (state.pendingEvent?.source === 'agriculture-major') {
    return { ...result, paused: true, reason: state.pauseReason, automaticFarm };
  }
  return { ...result, automaticFarm };
}
