import { Search } from "lucide-react";

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
        <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
          <span className="flex items-center gap-1.5">
            Game Mode
            <span className="rounded-full bg-brand-pink px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              NEW
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Hackathon
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
              CLOSED
            </span>
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm font-medium sm:block">How it works</span>
          <button className="rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Launch
          </button>
          <button className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Connect wallet
          </button>
        </div>
      </div>
    </header>
  );
}
