import * as Base from './engine-v165.js?v=1.6.5';

export * from './engine-v165.js?v=1.6.5';

export const V166_INITIAL_GRAIN_BONUS = 50;
export const V166_HARVEST_RULES = Object.freeze({
  summerYieldPerMu: 45,
  autumnYieldPerMu: 45,
  annualYieldPerMu: 90,
  seasons: Object.freeze(['summer', 'autumn'])
});

export const ORIGINS = Object.freeze(Object.fromEntries(
  Object.entries(Base.ORIGINS).map(([id, profile]) => [
    id,
    Object.freeze({ ...profile, grain: Number(profile.grain || 0) + V166_INITIAL_GRAIN_BONUS })
  ])
));

const round2 = value => Math.round((Number(value) || 0) * 100) / 100;
const EPSILON = 1e-8;

function expose(state) {
  if (typeof window !== 'undefined' && state) window.__luanshiState = state;
  return state;
}

function addLog(state, kind, title, text) {
  state.eventLog ??= [];
  state.eventLog.push({ year: state.year, month: state.month, day: state.day, kind, title, text });
}

function weatherModifier(state, year, seasons) {
  const weather = state?.agriculture?.weather || {};
  return seasons.reduce((value, season) => {
    const modifier = weather[`${year}-${season}`]?.yieldModifier;
    return value * (modifier == null ? 1 : Number(modifier));
  }, 1);
}

function currentFarmWork(state) {
  return Base.ensureFamilyWork?.(state)?.work || state?.agriculture?.work || null;
}

function newDualHarvestState(state, { migration = false } = {}) {
  const work = currentFarmWork(state);
  const month = Number(state?.month || 1);
  const tended = Math.max(0, Number(work?.tended || 0));
  return {
    version: 166,
    cropYear: Number(state?.year || Base.START_YEAR || 290),
    summerHarvestedAcres: migration && month >= 6 ? tended : 0,
    summerGrain: 0,
    autumnGrain: 0,
    summerCompleteLogged: migration && month >= 9,
    autumnCompleteLogged: migration && month >= 12
  };
}

export function ensureDualHarvest(state, options = {}) {
  if (!state) return null;
  const year = Number(state.year || Base.START_YEAR || 290);
  if (!state.dualHarvest || state.dualHarvest.version !== 166) {
    state.dualHarvest = newDualHarvestState(state, { migration: Boolean(options.migration) });
  } else if (Number(state.dualHarvest.cropYear) !== year) {
    state.dualHarvest = newDualHarvestState(state);
  }
  return state.dualHarvest;
}

function syncGrain(state) {
  state.resources.grain = round2(Math.max(0, Number(state.resources?.grain || 0)));
  if (state.household) state.household.grain = state.resources.grain;
  Base.sync?.(state);
}

function addHarvestGrain(state, amount, season) {
  const grain = round2(Math.max(0, amount));
  if (!grain) return 0;
  state.resources.grain = round2(Number(state.resources?.grain || 0) + grain);
  if (state.household) state.household.grain = state.resources.grain;
  if (state.agriculture) {
    state.agriculture.harvestedGrain = round2(Number(state.agriculture.harvestedGrain || 0) + grain);
  }
  const currentLedger = Base.ledger?.(state);
  if (currentLedger) currentLedger.harvest = round2(Number(currentLedger.harvest || 0) + grain);
  const dual = ensureDualHarvest(state);
  if (season === 'summer') dual.summerGrain = round2(Number(dual.summerGrain || 0) + grain);
  if (season === 'autumn') dual.autumnGrain = round2(Number(dual.autumnGrain || 0) + grain);
  syncGrain(state);
  return grain;
}

function settleSummerHarvest(state, harvestYear) {
  const dual = ensureDualHarvest(state);
  const work = currentFarmWork(state);
  if (!dual || !work) return 0;

  const land = Math.max(0, Number(state.household?.land || 0));
  const tended = Math.max(0, Math.min(land, Number(work.tended || 0)));
  const alreadyHarvested = Math.max(0, Number(dual.summerHarvestedAcres || 0));
  const newAcres = Math.max(0, tended - alreadyHarvested);
  if (newAcres <= EPSILON) return 0;

  const modifier = weatherModifier(state, harvestYear, ['spring', 'summer']);
  const grain = addHarvestGrain(
    state,
    newAcres * V166_HARVEST_RULES.summerYieldPerMu * modifier,
    'summer'
  );
  dual.summerHarvestedAcres = round2(tended);

  const planted = Math.max(0, Math.min(land, Number(work.sown || 0)));
  if (!dual.summerCompleteLogged && planted > 0 && tended >= planted - EPSILON) {
    dual.summerCompleteLogged = true;
    addLog(
      state,
      'economy',
      '夏收完成',
      `本年夏收累计入仓${round2(dual.summerGrain)}粮。每亩夏收基础产量${V166_HARVEST_RULES.summerYieldPerMu}粮，秋季还会再收一季。`
    );
  }
  return grain;
}

function adjustAutumnHarvest(state, beforeLedgerHarvest, harvestYear) {
  const currentLedger = Base.ledger?.(state);
  if (!currentLedger) return 0;
  const afterBaseHarvest = Number(currentLedger.harvest || 0);
  const baseDelta = Math.max(0, afterBaseHarvest - Number(beforeLedgerHarvest || 0));
  if (baseDelta <= EPSILON) return 0;

  const ratio = V166_HARVEST_RULES.autumnYieldPerMu / V166_HARVEST_RULES.annualYieldPerMu;
  const desired = round2(baseDelta * ratio);
  const excess = round2(baseDelta - desired);

  currentLedger.harvest = round2(Number(beforeLedgerHarvest || 0) + desired);
  state.resources.grain = round2(Math.max(0, Number(state.resources?.grain || 0) - excess));
  if (state.agriculture) {
    state.agriculture.harvestedGrain = round2(Math.max(0, Number(state.agriculture.harvestedGrain || 0) - excess));
  }
  const dual = ensureDualHarvest(state);
  dual.autumnGrain = round2(Number(dual.autumnGrain || 0) + desired);
  syncGrain(state);

  if (!dual.autumnCompleteLogged && Number(state.agriculture?.harvestedYear) === harvestYear) {
    dual.autumnCompleteLogged = true;
    addLog(
      state,
      'economy',
      '秋收完成',
      `本年秋收累计入仓${round2(dual.autumnGrain)}粮。全年两季基础产量合计仍为每亩${V166_HARVEST_RULES.annualYieldPerMu}粮。`
    );
  }
  return desired;
}

function prepareNewGame(state) {
  const bonus = V166_INITIAL_GRAIN_BONUS;
  state.resources.grain = round2(Number(state.resources?.grain || 0) + bonus);
  if (state.household) state.household.grain = state.resources.grain;
  ensureDualHarvest(state);
  syncGrain(state);
  return expose(state);
}

function prepareLoadedGame(state) {
  ensureDualHarvest(state, { migration: true });
  return expose(state);
}

export function createGame(options) {
  return prepareNewGame(Base.createGame(options));
}

export function deserializeState(raw) {
  return prepareLoadedGame(Base.deserializeState(raw));
}

export function getFarmSummary(state) {
  const summary = Base.getFarmSummary(state);
  const dual = ensureDualHarvest(state);
  return {
    ...summary,
    harvestSeasons: [...V166_HARVEST_RULES.seasons],
    summerYieldPerMu: V166_HARVEST_RULES.summerYieldPerMu,
    autumnYieldPerMu: V166_HARVEST_RULES.autumnYieldPerMu,
    annualYieldPerMu: V166_HARVEST_RULES.annualYieldPerMu,
    summerHarvestedAcres: Number(dual?.summerHarvestedAcres || 0),
    summerHarvestedGrain: Number(dual?.summerGrain || 0),
    autumnHarvestedGrain: Number(dual?.autumnGrain || 0)
  };
}

export function advanceDay(state) {
  ensureDualHarvest(state, { migration: !state.dualHarvest });
  const beforeElapsed = Number(state?.elapsedDays || 0);
  const harvestYear = Number(state?.year || Base.START_YEAR || 290);
  const harvestSeason = Base.getSeason?.(state?.month);
  const beforeLedgerHarvest = Number(Base.ledger?.(state)?.harvest || 0);

  const result = Base.advanceDay(state);
  if (!result?.ok) return result;

  const advanced = Number(state?.elapsedDays || 0) > beforeElapsed;
  if (advanced) {
    if (harvestSeason === 'summer') settleSummerHarvest(state, harvestYear);
    if (harvestSeason === 'autumn') adjustAutumnHarvest(state, beforeLedgerHarvest, harvestYear);
    ensureDualHarvest(state);
  }
  expose(state);
  return result;
}
