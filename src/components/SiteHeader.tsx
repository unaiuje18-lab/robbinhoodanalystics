import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (q: string) => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-pink text-lg font-black text-primary-foreground">
          F
        </span>
        <div className="relative hidden flex-1 md:block max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Search coins, creators"
            placeholder="Search coins, creators"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-brand-pink"
          />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
