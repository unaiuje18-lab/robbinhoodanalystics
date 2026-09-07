import { useEffect, useRef } from "react";

/**
 * TradingView Advanced Chart embed — real candlesticks for symbols with a
 * TradingView listing (stocks, major memes). Free widget: loads their
 * embed script into a container after mount; TradingView's own branding
 * ships inside the widget per their embed terms.
 */
export function TradingViewChart({ tvSymbol }: { tvSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    container.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      interval: "30",
      theme: "light",
      style: "1",
      locale: "en",
      autosize: true,
      // "Clean candles" look: no toolbars, no legend, no date-range bar —
      // just the price chart blended into the card.
      hide_side_toolbar: true,
      hide_top_toolbar: true,
      hide_legend: true,
      withdateranges: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      backgroundColor: "rgba(255, 255, 255, 1)",
      gridColor: "rgba(0, 0, 0, 0.06)",
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.replaceChildren();
    };
  }, [tvSymbol]);

  return (
    <div className="h-[420px] overflow-hidden rounded-xl bg-card">
      <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
    </div>
  );
}
