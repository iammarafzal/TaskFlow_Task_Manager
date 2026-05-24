import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Hook to execute client-side task state recalculations (auto-archiving)
 * every 60 seconds. Absolutely 0 API requests are triggered by this ticker.
 */
export function useLocalTick() {
  const tickLocalRecalculations = useAppStore((state) => state.tickLocalRecalculations);

  useEffect(() => {
    // Run an initial evaluation immediately on mounting
    tickLocalRecalculations();

    const ticker = setInterval(() => {
      tickLocalRecalculations();
    }, 60000); // 60-second interval cycle

    return () => clearInterval(ticker);
  }, [tickLocalRecalculations]);
}
