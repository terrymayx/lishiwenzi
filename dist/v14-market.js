import { getDailyFoodCost } from './engine.js?base=1.4.1';
import {ledger} from './v14-rules.js?v=1.4.1';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round1 = value => Math.round(Number(value || 0) * 10) / 10;
const round2 = value => Math.round(Number(value || 0) * 100) / 100;

function canTrade(state) {
  return Boolean(state && state.phase === 'playing' && !state.endpoint && !state.pendingEvent && !state.running);
}

function syncHouseholdResources(state) {
  if (!state?.resources || !state?.household) return;
  state.resources.money = round1(Math.max(0, Number(state.resources.money || 0)));
  state.resources.grain = round2(Math.max(0, Number(state.resources.grain || 0)));
  state.household.money = state.resources.money;
  state.household.grain = state.resources.grain;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

export function getGrainBuyPrice(state) {
  const market = Math.max(0.5, Number(state?.grainPrice || 1));
  return round1(clamp(0.9 + (market - 1) * 0.3, 0.7, 4));
}

export function getBuyQuote(state, amount) {
  const quantity = Math.max(0, Math.floor(Number(amount) || 0));
  const unitPrice = getGrainBuyPrice(state);
  return { amount: quantity, unitPrice, total: round1(quantity * unitPrice) };
}

export function getStockDays(state) {
  const dailyFood = getDailyFoodCost(state);
  if (dailyFood <= 0) return Infinity;
  return round2(Math.max(0, Number(state.resources?.grain || 0)) / dailyFood);
}

export function getStockWarning(state, amount = 0, warningDays = 7) {
  const dailyFood = getDailyFoodCost(state);
  const remaining = Math.max(0, Number(state.resources?.grain || 0) - Math.max(0, Number(amount) || 0));
  const days = dailyFood > 0 ? round2(remaining / dailyFood) : Infinity;
  return days < warningDays ? `出售后仅剩${days}天口粮，请确认。` : null;
}

export function buyGrain(state, amount) {
  if (!canTrade(state)) return { ok: false, message: '请先暂停时间并处理完当前事件，再购买粮食。' };
  const quantity = Number(amount);
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, message: '购买数量必须大于0。' };
  const quote = getBuyQuote(state, quantity);
  const money = Math.max(0, Number(state.resources?.money || 0));
  if (money < quote.total) return { ok: false, message: `购买${quantity}粮需要${quote.total}钱，当前只有${round1(money)}钱。` };
  const account=ledger(state); account.buyCost=round2(account.buyCost+quote.total);account.bought+=quantity;
  state.resources.money = round2(money - quote.total);
  state.resources.grain = round2(Number(state.resources?.grain || 0) + quantity);
  syncHouseholdResources(state);
  state.market ??= {};
  state.market.lastTrade = { type: 'buy', amount: quantity, unitPrice: quote.unitPrice, total: quote.total, year: state.year, month: state.month, day: state.day };
  addLog(state, 'economy', '购入粮食', `买入${quantity}粮，按每粮${quote.unitPrice}钱，共花${quote.total}钱。`);
  return { ok: true, amount: quantity, unitPrice: quote.unitPrice, cost: quote.total, message: `买入${quantity}粮，花费${quote.total}钱。` };
}

export function fillThirtyDays(state) {
  if (!canTrade(state)) return { ok: false, message: '请先暂停时间并处理完当前事件，再补足口粮。' };
  const target = Math.ceil(getDailyFoodCost(state) * 30);
  const quantity = Math.max(0, target - Math.floor(Number(state.resources?.grain || 0)));
  if (quantity < 1) return { ok: true, amount: 0, message: '粮仓已有至少三十天口粮。' };
  const result = buyGrain(state, quantity);
  if (result.ok) result.message = `已补足约三十天口粮：买入${quantity}粮，花费${result.cost}钱。`;
  return result;
}

export function setAutoBuy(state, enabled, reserveMoney = 10) {
  if (!state) return { ok: false, message: '没有可设置的游戏状态。' };
  state.market ??= {};
  state.market.autoBuy = { enabled: Boolean(enabled), reserveMoney: Math.max(0, round1(reserveMoney)) };
  return { ok: true, autoBuy: { ...state.market.autoBuy }, message: enabled ? `已开启低于七天时自动补至三十天，并保留${state.market.autoBuy.reserveMoney}钱。` : '已关闭自动买粮。' };
}

export function maybeAutoBuy(state, { duringDay = false } = {}) {
  const config = state?.market?.autoBuy;
  if (!config?.enabled || (!duringDay && !canTrade(state)) || getStockDays(state) >= 7) return { ok: false, skipped: true, reason: 'threshold' };
  const target = Math.ceil(getDailyFoodCost(state) * 30);
  const quantity = Math.max(0, target - Math.floor(Number(state.resources?.grain || 0)));
  if (quantity < 1) return { ok: false, skipped: true, reason: 'stock' };
  const quote = getBuyQuote(state, quantity);
  const reserve = Math.max(0, Number(config.reserveMoney || 0));
  if (Number(state.resources?.money || 0) - quote.total < reserve) {
    return { ok: false, skipped: true, reason: 'reserve', required: quote.total, reserve };
  }
  const result = buyGrain(state, quantity);
  if (result.ok) result.auto = true;
  return result;
}
