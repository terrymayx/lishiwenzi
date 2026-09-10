export function normalizeFamilyRelations(state) {
  if (!state?.people || !state.rootId) return false;
  const root = state.people[state.rootId];
  if (!root) return false;
  const mother = Object.values(state.people).find(person => person?.role === 'mother' && person.familyId === state.family?.id);
  if (!mother) return false;

  let changed = false;
  const rootGeneration = Number(root.generation) || 0;
  const targetMotherGeneration = rootGeneration - 1;
  if (Number(mother.generation) !== targetMotherGeneration) {
    mother.generation = targetMotherGeneration;
    changed = true;
  }

  root.parentIds ??= [];
  if (!root.parentIds.includes(mother.id)) {
    root.parentIds.push(mother.id);
    changed = true;
  }
  if (!root.parentId) {
    root.parentId = mother.id;
    changed = true;
  }

  mother.childrenIds ??= [];
  if (!mother.childrenIds.includes(root.id)) {
    mother.childrenIds.push(root.id);
    changed = true;
  }

  return changed;
}
