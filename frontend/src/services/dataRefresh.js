/**
 * Cross-screen data refresh.
 *
 * WHY THIS EXISTS
 * App.js renders all four screens at once and hides the inactive ones with
 * `display: none`. They therefore mount once and never unmount, so their
 * `useEffect(..., [])` fetch runs exactly one time for the whole session. Add a
 * gemstone and the inventory table keeps showing its stale module-level cache
 * until the browser is manually reloaded.
 *
 * This module fixes that with a tiny pub/sub: any mutation announces which
 * data it invalidated, and every screen holding that data refetches itself.
 */

export const DATA = {
  GEMSTONES: 'gemstones',
  SALES:     'sales',
  DASHBOARD: 'dashboard',
};

const listeners = new Set();

/**
 * Subscribe to invalidation events.
 * @param {(keys: string[]) => void} fn
 * @returns {() => void} unsubscribe
 */
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/**
 * Announce that some data changed. Pass the DATA keys affected.
 *
 * Selling touches stock, sales history AND the dashboard totals, so callers
 * should list every key they affect rather than just the obvious one.
 */
export const notifyDataChanged = (keys) => {
  const list = Array.isArray(keys) ? keys : [keys];
  listeners.forEach((fn) => {
    try {
      fn(list);
    } catch (err) {
      // One bad subscriber must not stop the others from refreshing.
      console.error('dataRefresh listener failed:', err);
    }
  });
};

/** Convenience: everything is stale. */
export const notifyAllChanged = () =>
  notifyDataChanged([DATA.GEMSTONES, DATA.SALES, DATA.DASHBOARD]);
