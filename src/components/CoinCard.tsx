import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { CoinAvatar } from "@/components/CoinArt";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import type { LiveCoin } from "@/lib/market";

function Spark({ up }: { up: boolean }) {
  const d = up
    ? "M0 22 L12 18 L22 20 L34 10 L46 12 L60 2"
    : "M0 4 L14 6 L26 5 L38 14 L50 16 L60 22";
  return (
    <svg viewBox="0 0 60 24" className="h-6 w-16 overflow-visible">
      <path
        d={d}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={up ? "stroke-success" : "stroke-danger"}
      />
    </svg>
  );
}

export function CoinCard({ coin, tickIndex }: { coin: LiveCoin; tickIndex: number }) {
  const up = coin.change24hPct >= 0;
  return (
    <Link
      to="/coin/$ticker"
      params={{ ticker: coin.ticker }}
      className="group block rounded-2xl border border-border bg-card p-2 shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-hover"
    >
      <CoinAvatar
        ticker={coin.ticker}
        hue={coin.hue}
        hue2={coin.hue2}
        image={coin.image}
        className="aspect-square w-full rounded-xl"
      />
      <div className="px-1.5 pb-1 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold">{coin.name}</h3>
          <span
            className={up ? "text-xs font-medium text-success" : "text-xs font-medium text-danger"}
          >
            {formatPct(coin.change24hPct)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">${coin.ticker}</span>
          <Copy className="h-3 w-3 shrink-0" />
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span
            key={tickIndex}
            className={`-mx-1 rounded px-1 text-xl font-extrabold tracking-tight ${
              coin.lastDeltaPct > 0.02 ? "flash-up" : coin.lastDeltaPct < -0.02 ? "flash-down" : ""
            }`}
          >
            {formatUsd(coin.priceUsd)}
          </span>
          <Spark up={up} />
        </div>
        <div className="mt-0.5 text-right text-[11px] text-muted-foreground">
          Mcap {formatCompactUsd(coin.mcapUsd)}
        </div>
      </div>
    </Link>
  );
}
