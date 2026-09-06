import { createContext, useContext } from "react";
import type { MarketState } from "@/lib/market";

export const LiveMarketContext = createContext<MarketState | null>(null);

/** The one live market state, shared by every component on every route. */
export function useMarket(): MarketState {
  const market = useContext(LiveMarketContext);
  if (!market) throw new Error("useMarket must be used within <LiveMarketProvider>");
  return market;
}
