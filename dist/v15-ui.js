const $ = selector => document.querySelector(selector);

function careLabel(care) {
  return care === 'rest' ? '静养' : care === 'doctor' ? '请医照看' : care === 'normal' ? '照常生活' : '等待决定';
}

function updateEventButtons(state) {
  if (!state?.pendingEvent) return;
  const buttons = [...document.querySelectorAll('#event .event-option')];
  state.pendingEvent.options?.forEach((option, index) => {
    const button = buttons[index];
    if (!button) return;
    button.disabled = Boolean(option.disabled);
    if (option.disabled) button.title = '当前钱粮或人物条件不足，不能选择这一项。';
  });
}

function updatePersonStatus(state) {
  const panel = $('#person-detail');
  if (!panel) return;
  panel.querySelector('#family-life-status')?.remove();
  const selected = state.people?.[state.selectedPersonId] || state.people?.[state.playerId];
  if (!selected) return;
  const life = state.familyLife;
  if (!life) return;

  let text = '';
  if (life.wedding?.targetId === selected.id) {
    text = `婚事筹备中：与${life.wedding.candidate?.name || '婚配对象'}的婚事还需约 ${life.wedding.remainingDays} 日。`;
  } else if (life.pregnancy?.motherId === selected.id) {
    text = `孕期：约 ${life.pregnancy.remainingDays} 日后临盆 · 照护：${careLabel(life.pregnancy.care)}。`;
  } else if (life.pregnancy) {
    const spouse = selected.spouseId ? state.people?.[selected.spouseId] : null;
    if (spouse?.id === life.pregnancy.motherId) {
      text = `配偶${spouse.name}有孕：约 ${life.pregnancy.remainingDays} 日后临盆 · 照护：${careLabel(life.pregnancy.care)}。`;
    }
  }
  if (!text) return;
  const line = document.createElement('p');
  line.id = 'family-life-status';
  line.className = 'family-life-status';
  line.textContent = text;
  panel.append(line);
}

function updateFamilyLifeUi() {
  const state = window.__luanshiState;
  if (!state || $('#game')?.hidden) return;
  updateEventButtons(state);
  updatePersonStatus(state);
}

window.addEventListener('luanshi:rendered', updateFamilyLifeUi);
window.addEventListener('DOMContentLoaded', updateFamilyLifeUi);
