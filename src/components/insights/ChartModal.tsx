import { Maximize2, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Shared icon-button look for the card headers. */
export const ICON_BUTTON =
  "grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground";

/** Small header button that opens a panel's expanded chart view. */
export function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Expand chart" onClick={onClick} className={ICON_BUTTON}>
      <Maximize2 className="h-4 w-4" />
    </button>
  );
}

/**
 * Fullscreen chart view: the same panel, rendered large over a dimmed page.
 * Closes on backdrop click, the X button or Escape; locks body scroll while
 * open. Hand-rolled like the rest of the app (no dialog dependency in use).
 */
export function ChartModal({
  title,
  controls,
  onClose,
  children,
}: {
  title: string;
  controls?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-hover"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">
            {controls}
            <button
              type="button"
              aria-label="Close expanded chart"
              onClick={onClose}
              className={ICON_BUTTON}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
