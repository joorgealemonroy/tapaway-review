import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Search, UtensilsCrossed, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { filterMealCatalog, parseMealCatalog, safeMealCatalogUrl, type MealCatalogItem } from "@/lib/mealCatalog";

interface Props {
  content: unknown;
  accentColor?: string | null;
  interactive?: boolean;
  trigger?: { label?: string; imageUrl?: string | null; isGrid?: boolean };
  onOpen?: () => void;
  onOrder?: () => void;
}

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function MealPhoto({ item }: { item: MealCatalogItem }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.imageUrl]);
  return <div className="aspect-[4/3] overflow-hidden bg-[#edf3eb]">
    {item.imageUrl && !failed
      ? <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      : <div className="flex h-full w-full items-center justify-center text-[#46674c]"><UtensilsCrossed className="h-9 w-9" aria-hidden="true" /><span className="sr-only">Photo unavailable</span></div>}
  </div>;
}

function MealCard({ item }: { item: MealCatalogItem }) {
  const hasDetails = !!item.serving || item.carbs !== null || item.fat !== null || item.allergens.length > 0 || item.description.length > 130;
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e9e0] bg-white shadow-sm">
    <MealPhoto item={item} />
    <div className="p-3.5">
      <h3 className="text-[15px] font-semibold leading-5 text-[#16271c]">{item.name}</h3>
      {item.price && <p className="mt-1.5 text-sm font-semibold tabular-nums text-[#005b32]">{item.price}</p>}
      {item.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5c685f]">{item.description}</p>}
      {(item.calories !== null || item.protein !== null) && <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4a5d50]">
        {item.calories !== null && <span><strong className="font-semibold tabular-nums">{number.format(item.calories)}</strong> cal</span>}
        {item.protein !== null && <span><strong className="font-semibold tabular-nums">{number.format(item.protein)}g</strong> protein</span>}
      </div>}
      {hasDetails && <details className="group mt-2 border-t border-[#edf0ea]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-[#47634e] [&::-webkit-details-marker]:hidden" aria-label={`Meal details for ${item.name}`}>
          Meal details <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-2 pb-1 text-xs leading-5 text-[#5c685f]">
          {item.serving && <p>{item.serving}</p>}
          {item.description.length > 130 && <p>{item.description}</p>}
          {(item.carbs !== null || item.fat !== null) && <div className="flex flex-wrap gap-x-3 gap-y-1">
            {item.carbs !== null && <span>{number.format(item.carbs)}g carbs</span>}
            {item.fat !== null && <span>{number.format(item.fat)}g fat</span>}
          </div>}
          {item.allergens.length > 0 && <p><span className="font-medium text-[#354a3b]">Listed allergens:</span> {item.allergens.map(value => value.toLocaleLowerCase()).join(", ")}.</p>}
        </div>
      </details>}
    </div>
  </article>;
}

/** The hub stays compact; this viewer holds the menu and sends checkout to AV. */
export function MealCatalog({ content, accentColor, interactive = true, trigger, onOpen, onOrder }: Props) {
  const catalog = useMemo(() => parseMealCatalog(content), [content]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const color = accentColor && /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#005b32";
  const label = trigger?.label?.trim() || catalog.buttonLabel;
  const imageUrl = safeMealCatalogUrl(trigger?.imageUrl, true);
  const filtered = useMemo(() => filterMealCatalog(catalog.sections, query, category), [catalog.sections, query, category]);
  const total = catalog.sections.reduce((count, section) => count + section.items.length, 0);
  const count = filtered.reduce((count, section) => count + section.items.length, 0);
  const updated = catalog.updatedAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(catalog.updatedAt + "T00:00:00Z")) : null;
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [query, category]);
  const changeOpen = (next: boolean) => {
    if (next && !interactive) return;
    setOpen(next);
    if (next) { setQuery(""); setCategory("all"); onOpen?.(); }
  };
  const triggerButton = imageUrl ? <button type="button" aria-label={label} aria-disabled={!interactive || undefined}
    className={`group relative block w-full overflow-hidden rounded-2xl shadow-lg transition-transform active:scale-[0.98] ${trigger?.isGrid ? "aspect-square" : "aspect-[4/3]"}`}>
    <img src={imageUrl} alt="" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
    <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    <span className={`absolute flex items-center justify-center rounded-full text-white shadow-lg ${trigger?.isGrid ? "left-2 top-2 h-8 w-8" : "left-3 top-3 h-10 w-10"}`} style={{ backgroundColor: color }}><UtensilsCrossed className={trigger?.isGrid ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" /></span>
    <span className={`absolute truncate font-bold uppercase tracking-wide text-white drop-shadow-lg ${trigger?.isGrid ? "bottom-2 left-2 right-2 text-sm" : "bottom-3 left-3 right-3 text-lg"}`}>{label}</span>
  </button> : <button type="button" aria-disabled={!interactive || undefined} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-4 font-semibold text-foreground transition-colors hover:bg-muted/60 active:scale-[0.98]"><UtensilsCrossed className="h-5 w-5 shrink-0" style={{ color }} aria-hidden="true" /><span>{label}</span></button>;

  if (!interactive) return triggerButton;
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>{triggerButton}</DialogTrigger>
    <DialogContent
      onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}
      className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#fbfcfa] p-0 sm:left-[50%] sm:top-[50%] sm:h-[90dvh] sm:max-h-[920px] sm:w-[calc(100%_-_2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl [&>button:last-child]:hidden"
    >
      <header className="shrink-0 border-b border-[#e3e9e0] bg-white px-4 pb-3 sm:px-6" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1">
            <DialogTitle ref={titleRef} tabIndex={-1} className="text-xl font-semibold leading-7 text-[#16271c] outline-none sm:text-2xl">{catalog.title}</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-[#657267]">Explore {total} menu item{total === 1 ? "" : "s"}, then order with AV.</DialogDescription>
          </div>
          <DialogClose asChild><button type="button" aria-label="Close menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0f4ed] text-[#324d3a] transition-colors hover:bg-[#e4ecdf]"><X className="h-5 w-5" /></button></DialogClose>
        </div>
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">Search the menu</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a887c]" aria-hidden="true" />
          <Input id={searchId} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a meal…" type="search" inputMode="search" autoComplete="off" className="h-11 rounded-xl border-[#dfe7dc] bg-[#f7f9f5] pl-10 pr-11 text-base text-[#16271c]" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-[#657267]"><X className="h-4 w-4" /></button>}
        </div>
        <div role="group" aria-label="Filter menu by category" className="-mx-4 mt-3 flex max-w-[calc(100%_+_2rem)] gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:max-w-[calc(100%_+_3rem)] sm:px-6">
          {[{ id: "all", name: "All", count: total }, ...catalog.sections.map(section => ({ id: section.id, name: section.name, count: section.items.length }))].map(option => <button key={option.id} type="button" aria-pressed={category === option.id} onClick={() => setCategory(option.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-xs font-medium transition-colors" style={category === option.id ? { borderColor: color, backgroundColor: color, color: "white" } : { borderColor: "#e0e7dd", backgroundColor: "white", color: "#4f6255" }}>
            {option.name}<span className="ml-1.5 opacity-75">{option.count}</span>
          </button>)}
        </div>
      </header>
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6">
        <p className="mb-4 text-xs text-[#738073]" role="status" aria-live="polite">{count} item{count === 1 ? "" : "s"}{query.trim() ? ` matching “${query.trim()}”` : " to explore"}</p>
        {filtered.length ? <div className="space-y-7">{filtered.map(section => <section key={section.id} aria-label={section.name}>
          <h2 className="mb-3 text-base font-semibold text-[#223d2b]">{section.name}</h2>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">{section.items.map(item => <MealCard key={item.id} item={item} />)}</div>
        </section>)}</div> : <div className="py-12 text-center"><UtensilsCrossed className="mx-auto mb-3 h-8 w-8 text-[#9aaa96]" aria-hidden="true" /><p className="text-sm font-medium text-[#354a3b]">{total ? "No meals match those filters." : "The menu is being updated."}</p>{total > 0 && <button type="button" onClick={() => { setQuery(""); setCategory("all"); }} className="mt-2 min-h-11 px-4 text-sm font-semibold underline underline-offset-4" style={{ color }}>Show all meals</button>}</div>}
        {(updated || catalog.sourceUrl) && <p className="mt-6 text-center text-[11px] leading-5 text-[#7b877b]">{updated && `Menu updated ${updated}`}{updated && catalog.sourceUrl && " · "}{catalog.sourceUrl && <a href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">AV’s published menu</a>}</p>}
      </div>
      <footer className="shrink-0 border-t border-[#e3e9e0] bg-white px-4 pt-3 sm:px-6" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <p className="mb-2.5 text-center text-[11px] leading-4 text-[#68766a]">Menu can vary by delivery date. Confirm options on AV’s website.</p>
        {catalog.orderUrl ? <a href={catalog.orderUrl} onClick={onOrder} target="_blank" rel="noopener noreferrer" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: color }}>Order on AV’s website<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a> : <p className="rounded-xl bg-[#f0f4ed] p-3 text-center text-sm text-[#657267]">Ordering link is being updated.</p>}
      </footer>
    </DialogContent>
  </Dialog>;
}
