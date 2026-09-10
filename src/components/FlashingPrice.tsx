import { useEffect, useRef } from "react";

import { formatUsd } from "@/lib/format";

type Flash = "flash-up" | "flash-down" | null;

/**
 * Price text that flashes only the characters that actually changed since the
 * previous value — green for up, red for down — instead of the whole number.
 * Characters align from the right (trailing digits move first), and a changed
 * char remounts (its key carries the new glyph) so the CSS animation replays.
 * The previous value is synced in an effect, not during render, so double
 * renders agree on the flash set.
 */
export function FlashingPrice({ price, className }: { price: number; className?: string }) {
  const text = formatUsd(price);
  const prevRef = useRef({ text, price });
  const prev = prevRef.current;
  const up = price >= prev.price;

  const chars = [...text];
  const prevFromEnd = [...prev.text].reverse();
  const flashFor = (i: number): Flash => {
    const prevChar = prevFromEnd[chars.length - 1 - i];
    return prevChar === undefined || prevChar !== chars[i]
      ? up
        ? "flash-up"
        : "flash-down"
      : null;
  };

  useEffect(() => {
    prevRef.current = { text, price };
  }, [text, price]);

  return (
    <span className={className}>
      {chars.map((char, i) => {
        const flash = flashFor(i);
        return (
          <span key={`${i}:${char}`} className={flash ?? undefined}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
