import { useState } from "react";

/**
 * Small round coin marker used in lists and chips. Shows the coin's logo when
 * it has one (hiding itself if the URL breaks), otherwise the gradient dot.
 */
export function Dot({
  hue,
  image,
  className,
}: {
  hue: number;
  image?: string | null;
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = image !== null && image !== undefined && !logoFailed;
  return (
    <span
      className={`relative h-6 w-6 shrink-0 overflow-hidden rounded-full ${className ?? ""}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.75 0.18 ${hue}), oklch(0.5 0.2 ${hue + 40}))`,
      }}
    >
      {showLogo ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}

/**
 * Square gradient coin tile. With a logo, the image covers the tile; without
 * one (or if the logo URL 404s) the ticker initials show on the gradient.
 */
export function CoinAvatar({
  ticker,
  hue,
  hue2,
  image,
  className,
}: {
  ticker: string;
  hue: number;
  hue2: number;
  image?: string | null;
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = image !== null && image !== undefined && !logoFailed;
  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      <span
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, oklch(0.72 0.19 ${hue}), oklch(0.55 0.2 ${hue2}))`,
        }}
      />
      {showLogo ? (
        <img
          src={image}
          alt={`${ticker} logo`}
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-3xl font-black tracking-tight text-primary-foreground/90">
          {ticker.slice(0, 3)}
        </span>
      )}
    </span>
  );
}
