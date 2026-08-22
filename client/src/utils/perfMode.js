const STORAGE_KEY = 'wnw_perf_mode';

export function getPerfMode() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

export function setPerfMode(enabled) {
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch { /* private mode */ }
  applyPerfModeClass(enabled);
}

export function applyPerfModeClass(enabled = getPerfMode()) {
  document.documentElement.classList.toggle('perf-mode', enabled);
}