import { useEffect, useState, type ReactNode } from "react";
import { LiveMarketContext } from "@/hooks/useLiveMarket";
import { seedMarket, stepMarket, type MarketState } from "@/lib/market";

const TICK_MS = 2000;

/**
 * Holds the live market and advances it every TICK_MS.
 * Initial state is seeded deterministically, so SSR and the client's first
 * paint agree; ticking starts only after mount (client-only).
 */
export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<MarketState>(seedMarket);

  useEffect(() => {
    const id = setInterval(() => setMarket((prev) => stepMarket(prev)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  return <LiveMarketContext.Provider value={market}>{children}</LiveMarketContext.Provider>;
}
