import { useEffect, useRef } from 'react';

/**
 * Custom hook to intercept global WebSocket events and trigger a sync callback.
 * Employs a hybrid throttle/debounce strategy (default 2000ms delay) to prevent
 * cascading API requests if multiple events arrive in a short burst.
 */
export function useSmartRefresh(callback: () => void, delay = 2000) {
  const savedCallback = useRef(callback);
  const lastExecutedRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);

  // Synchronize the callback ref to prevent stale closures
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleRefresh = () => {
      const now = Date.now();
      const elapsed = now - lastExecutedRef.current;

      // Cancel any pending debounced executions from previous events
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (elapsed >= delay) {
        // Outside the throttle window: execute sync callback immediately
        console.log('[Smart Refresh Hook] Immediate API sync triggered (throttled window clear).');
        savedCallback.current();
        lastExecutedRef.current = now;
      } else {
        // Inside the throttle window: debounce execution to the end of the window
        const remaining = delay - elapsed;
        console.log(`[Smart Refresh Hook] Request clustered inside throttle window. Debouncing sync in ${remaining}ms.`);
        
        timeoutRef.current = setTimeout(() => {
          console.log('[Smart Refresh Hook] Executing debounced API sync.');
          savedCallback.current();
          lastExecutedRef.current = Date.now();
        }, remaining);
      }
    };

    window.addEventListener('obsidian_flow_refresh', handleRefresh);

    return () => {
      window.removeEventListener('obsidian_flow_refresh', handleRefresh);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [delay]);
}
