import {
  V13_RULES,
  ensureAgriculture,
  getSeason,
  recordCultivationDay
} from './v13-rules.js?v=1.3.1';

function ensureWorkTelemetry(state) {
  const ag = ensureAgriculture(state);
  ag.work ??= {};
  ag.work.family ??= { springWorkDays: 0, summerWorkDays: 0, harvestWorkDays: 0 };
  ag.work.hired ??= { springWorkDays: 0, summerWorkDays: 0, harvestWorkDays: 0 };
  return ag;
}

function hiredCapacity(state) {
  const ag = ensureAgriculture(state);
  const land = Math.max(0, Number(state?.household?.land || 0));
  return Math.min(land, (ag?.hiredWorkers || 0) * V13_RULES.HIRED_WORKER_ACRES);
}

function hideFamilyLabor(state) {
  const familyId = state?.family?.id;
  const snapshots = [];
  for (const person of Object.values(state?.people || {})) {
    if (!person?.alive || person.familyId !== familyId) continue;
    snapshots.push([person, person.health]);
    person.health = 0;
  }
  return () => {
    for (const [person, health] of snapshots) person.health = health;
  };
}

export function recordHiredWorkerDay(state) {
  const ag = ensureWorkTelemetry(state);
  const season = getSeason(state?.month || 1);
  const workAcres = hiredCapacity(state);

  if (!ag?.hiredWorkers || workAcres <= 0) {
    return { source: 'hired', worked: false, season, workAcres: 0, grainHarvested: 0, message: '没有受雇农工可自动耕作。' };
  }
  if (season === 'winter') {
    return { source: 'hired', worked: false, season, workAcres, grainHarvested: 0, message: '冬藏期间雇工维护田庄，不推进春耕、夏管或秋收。' };
  }

  const restore = hideFamilyLabor(state);
  let result;
  try {
    result = recordCultivationDay(state);
  } finally {
    restore();
  }

  const channel = ag.work.hired;
  if (season === 'spring') channel.springWorkDays = Math.min(V13_RULES.SPRING_WORK_DAYS, channel.springWorkDays + 1);
  if (season === 'summer') channel.summerWorkDays = Math.min(V13_RULES.SUMMER_WORK_DAYS, channel.summerWorkDays + 1);
  if (season === 'autumn') channel.harvestWorkDays = Math.min(V13_RULES.HARVEST_WORK_DAYS, channel.harvestWorkDays + 1);

  return {
    ...result,
    source: 'hired',
    worked: true,
    workAcres,
    message: `雇工自动${season === 'spring' ? '春耕' : season === 'summer' ? '夏管' : '秋收'} · 负责${workAcres}亩${result?.grainHarvested ? ` · 入仓${result.grainHarvested}粮` : ''}`
  };
}

export function getHiredAutoFarmStatus(state) {
  const ag = ensureWorkTelemetry(state);
  const season = getSeason(state?.month || 1);
  const workAcres = hiredCapacity(state);
  const channel = ag.work.hired;
  const progress = season === 'spring' ? channel.springWorkDays
    : season === 'summer' ? channel.summerWorkDays
      : season === 'autumn' ? channel.harvestWorkDays : 0;
  const target = season === 'spring' ? V13_RULES.SPRING_WORK_DAYS
    : season === 'summer' ? V13_RULES.SUMMER_WORK_DAYS
      : season === 'autumn' ? V13_RULES.HARVEST_WORK_DAYS : 0;
  return {
    hiredWorkers: ag.hiredWorkers || 0,
    workAcres,
    season,
    progress,
    target,
    active: Boolean(ag.hiredWorkers && workAcres > 0 && season !== 'winter')
  };
}
