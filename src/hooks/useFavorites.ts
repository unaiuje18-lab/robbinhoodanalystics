import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "favorite-tickers";

/**
 * Starred tickers, persisted in localStorage. Starts empty on the server and
 * hydrates after mount (avoids SSR/CSR mismatch); the star flash on first
 * load is imperceptible.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch {
      // corrupted storage — start empty
    }
  }, []);

  const toggle = useCallback((ticker: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // private mode etc. — favorites just won't persist
      }
      return next;
    });
  }, []);

  return { favorites, toggle };
}
