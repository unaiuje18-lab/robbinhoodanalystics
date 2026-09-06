/** Small round gradient coin dot used in lists and chips. */
export function Dot({ hue, className }: { hue: number; className?: string }) {
  return (
    <span
      className={`h-6 w-6 shrink-0 rounded-full ${className ?? ""}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.75 0.18 ${hue}), oklch(0.5 0.2 ${hue + 40}))`,
      }}
    />
  );
}

/** Square gradient coin tile with the ticker stamped over it. */
export function CoinAvatar({
  ticker,
  hue,
  hue2,
  className,
}: {
  ticker: string;
  hue: number;
  hue2: number;
  className?: string;
}) {
  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      <span
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, oklch(0.72 0.19 ${hue}), oklch(0.55 0.2 ${hue2}))`,
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-black tracking-tight text-primary-foreground/90">
        {ticker.slice(0, 3)}
      </span>
    </span>
  );
}
