import * as Base from './engine.js?base=1.4.1';
import {
  applyStarvationRules,
  getLandPrice as getV12LandPrice,
  buyLand as buyV12Land
} from './v12-rules.js?v=1.2.1';

export * from './engine.js?base=1.4.1';

function exposeState(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

export function createGame(options) {
  return exposeState(Base.createGame(options));
}

export function deserializeState(raw) {
  return exposeState(Base.deserializeState(raw));
}

export function getLandPrice(state, acres = 1) {
  exposeState(state);
  return getV12LandPrice(state, acres);
}

export function buyLand(state, acres = 1) {
  const result = buyV12Land(state, acres);
  exposeState(state);
  return result;
}

export function advanceDay(state) {
  exposeState(state);
  const playerIdBefore = state?.playerId || null;
  const dateLabel = state ? Base.getDateLabel(state) : '';
  const result = Base.advanceDay(state);
  if (!result?.ok) return result;

  const starvation = applyStarvationRules(state, { playerIdBefore, dateLabel });
  exposeState(state);

  if (starvation.gameOver) {
    return {
      ok: true,
      paused: true,
      starvation: true,
      endpoint: false,
      reason: state.pauseReason
    };
  }

  return result;
}
