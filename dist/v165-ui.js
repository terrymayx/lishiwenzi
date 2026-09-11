function pruneManualFarmingControls() {
  document.querySelectorAll('[data-action="longfarm"], [data-action="cultivate"]').forEach(node => node.remove());
  document.querySelectorAll('#work-context-menu [data-job="longfarm"], #work-context-menu [data-job="agriculture"]').forEach(node => node.remove());
}

function init() {
  pruneManualFarmingControls();
  const observer = new MutationObserver(pruneManualFarmingControls);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('luanshi:rendered', pruneManualFarmingControls);
  window.addEventListener('luanshi:statechange', pruneManualFarmingControls);
}

window.addEventListener('DOMContentLoaded', init);
