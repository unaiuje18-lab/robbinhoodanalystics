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
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.replaceChildren();
    };
  }, [tvSymbol]);

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border border-border bg-card">
      <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
    </div>
  );
}
