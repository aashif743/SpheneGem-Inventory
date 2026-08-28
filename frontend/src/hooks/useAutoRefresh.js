import { useCallback, useEffect, useRef } from 'react';
import { subscribe } from '../services/dataRefresh';

/**
 * Keeps a screen's data fresh without the user ever pressing reload.
 *
 * A screen refreshes when:
 *   1. it becomes the active view (App.js keeps all screens mounted, so this
 *      is the replacement for the mount-time fetch that only ever ran once),
 *   2. the browser tab regains focus or becomes visible again,
 *   3. another part of the app reports that data it cares about has changed.
 *
 * If an invalidation arrives while the screen is hidden it is remembered and
 * applied the moment the screen is shown, so background screens don't fire off
 * requests nobody is waiting for.
 *
 * @param {object}   opts
 * @param {boolean}  opts.active          Is this screen currently visible?
 * @param {string[]} opts.watch           DATA keys that should trigger a refresh.
 * @param {Function} opts.onRefresh       Called to refetch. Receives the reason.
 * @param {boolean}  opts.refreshOnFocus  Refresh when the tab regains focus.
 * @param {number}   opts.minIntervalMs   Collapses bursts into one refresh.
 */
export default function useAutoRefresh({
  active = true,
  watch = [],
  onRefresh,
  refreshOnFocus = true,
  minIntervalMs = 1500,
}) {
  // Keep the latest callback without making every effect depend on its identity
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const lastRunRef = useRef(0);
  const dirtyRef   = useRef(false);

  const watchKey = watch.join(',');

  const run = useCallback((reason, { force = false } = {}) => {
    const now = Date.now();
    if (!force && now - lastRunRef.current < minIntervalMs) return;
    lastRunRef.current = now;
    dirtyRef.current = false;
    onRefreshRef.current?.(reason);
  }, [minIntervalMs]);

  // 1. Became the active view — refresh if we were told data changed while
  //    hidden, or if this is the first time the screen is shown.
  useEffect(() => {
    if (!active) return;
    if (dirtyRef.current || lastRunRef.current === 0) {
      run('activated', { force: true });
    } else {
      run('activated');
    }
  }, [active, run]);

  // 2. Tab regained focus / became visible
  useEffect(() => {
    if (!refreshOnFocus) return undefined;

    const onFocus = () => {
      if (active) run('focus');
    };
    const onVisibility = () => {
      if (active && document.visibilityState === 'visible') run('visible');
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, refreshOnFocus, run]);

  // 3. Another screen changed data we care about
  useEffect(() => {
    const keys = watchKey ? watchKey.split(',') : [];
    if (keys.length === 0) return undefined;

    return subscribe((changed) => {
      if (!changed.some((k) => keys.includes(k))) return;
      if (active) {
        run('data-changed', { force: true });
      } else {
        // Refresh the moment this screen is shown instead of fetching now.
        dirtyRef.current = true;
      }
    });
  }, [watchKey, active, run]);
}
