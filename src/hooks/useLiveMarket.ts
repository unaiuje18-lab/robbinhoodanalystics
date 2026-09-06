import { useCallback, useEffect, useRef, useState, createContext, useContext } from "react";
import { SNAPSHOT_REFRESH_TICKS, isRefreshDue, type MarketState } from "@/lib/market";

export const LiveMarketContext = createContext<MarketState | null>(null);

/** The one live market state, shared by every component on every route. */
export function useMarket(): MarketState {
  const market = useContext(LiveMarketContext);
  if (!market) throw new Error("useMarket must be used within <LiveMarketProvider>");
  return market;
}

/**
 * A slowly-refreshing view of the market for anything that POSITIONS items
 * (grid ranking, top lists). Live prices keep flowing from useMarket(); the
 * snapshot only re-ranks every SNAPSHOT_REFRESH_TICKS so cards hold their
 * place instead of shuffling on every tick. `refresh()` re-ranks immediately
 * (e.g. when the user changes a filter).
 */
export function useMarketSnapshot(everyN: number = SNAPSHOT_REFRESH_TICKS) {
  const live = useMarket();
  const liveRef = useRef(live);
  liveRef.current = live;
  const [snapshot, setSnapshot] = useState<MarketState>(live);

  useEffect(() => {
    if (isRefreshDue(snapshot, live, everyN)) setSnapshot(live);
  }, [live, snapshot, everyN]);

  const refresh = useCallback(() => setSnapshot(liveRef.current), []);
  return { market: snapshot, refresh };
}
