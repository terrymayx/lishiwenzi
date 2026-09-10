const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round1 = value => Math.round(Number(value || 0) * 10) / 10;

function canTrade(state) {
  return Boolean(state && state.phase === 'playing' && !state.endpoint && !state.pendingEvent && !state.running);
}

function syncHouseholdResources(state) {
  if (!state?.resources || !state?.household) return;
  state.resources.money = round1(Math.max(0, Number(state.resources.money || 0)));
  state.resources.grain = round1(Math.max(0, Number(state.resources.grain || 0)));
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
  return {
    amount: quantity,
    unitPrice,
    total: round1(quantity * unitPrice)
  };
}

export function buyGrain(state, amount) {
  if (!canTrade(state)) return { ok: false, message: '请先暂停时间并处理完当前事件，再购买粮食。' };
  const quantity = Math.floor(Number(amount));
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, message: '购买数量必须大于0。' };

  const quote = getBuyQuote(state, quantity);
  const money = Math.max(0, Number(state.resources?.money || 0));
  if (money < quote.total) return { ok: false, message: `购买${quantity}粮需要${quote.total}钱，当前只有${round1(money)}钱。` };

  state.resources.money = round1(money - quote.total);
  state.resources.grain = round1(Number(state.resources?.grain || 0) + quantity);
  syncHouseholdResources(state);

  state.market ??= {};
  state.market.lastTrade = {
    type: 'buy',
    amount: quantity,
    unitPrice: quote.unitPrice,
    total: quote.total,
    year: state.year,
    month: state.month,
    day: state.day
  };

  addLog(state, 'economy', '购入粮食', `买入${quantity}粮，按每粮${quote.unitPrice}钱，共花${quote.total}钱。`);
  return {
    ok: true,
    amount: quantity,
    unitPrice: quote.unitPrice,
    cost: quote.total,
    message: `买入${quantity}粮，花费${quote.total}钱。`
  };
}
