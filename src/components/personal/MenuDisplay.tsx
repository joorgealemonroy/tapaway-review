import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed, Search, X, ChevronDown } from "lucide-react";
import { sectionEmoji, type MenuContent } from "@/lib/menuBlock";


interface Props {
  menu: MenuContent;
  isDarkBg?: boolean;
  textColor?: string | null;
  /** Preview mode disables opening the dialog (used inside the phone mockup). */
  interactive?: boolean;
}

export const MenuDisplay = ({ menu, isDarkBg, textColor, interactive = true }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<number>>(() => new Set());


  const visibleSections = useMemo(
    () =>
      menu.sections
        .map((section) => ({ ...section, items: section.items.filter((item) => !item.hidden) }))
        .filter((section) => section.items.length > 0),
    [menu.sections]
  );

  const q = query.trim().toLowerCase();
  const filteredSections = useMemo(() => {
    if (!q) return visibleSections;
    return visibleSections
      .map((section) => {
        const sectionMatches = section.name.toLowerCase().includes(q);
        const items = sectionMatches
          ? section.items
          : section.items.filter(
              (item) =>
                item.name.toLowerCase().includes(q) ||
                (item.description || "").toLowerCase().includes(q)
            );
        return { ...section, items };
      })
      .filter((section) => section.items.length > 0);
  }, [visibleSections, q]);


  if (visibleSections.length === 0) return null;

  const tileClass = isDarkBg
    ? "bg-white/10 border-white/20 hover:bg-white/15"
    : "bg-card border-border hover:bg-muted/60";
  const labelStyle = textColor ? { color: textColor } : undefined;
  const labelClass = textColor ? "" : isDarkBg ? "text-white" : "text-foreground";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setOpenSections(new Set());
    }
  };

  const isOpenSection = (index: number) => !!q || openSections.has(index);

  const toggleSection = (index: number) => {
    if (q) return;
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };


  const totalItems = filteredSections.reduce((sum, s) => sum + s.items.length, 0);


  return (
    <>
      <button
        type="button"
        onClick={() => interactive && setOpen(true)}
        className={`w-full flex items-center justify-center gap-2 rounded-2xl border px-6 py-4 font-semibold transition-colors active:scale-[0.98] ${tileClass} ${labelClass}`}
        style={labelStyle}
      >
        <UtensilsCrossed className="h-5 w-5" />
        <span>{menu.buttonLabel}</span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="p-0 gap-0 overflow-hidden max-w-none w-screen h-[100dvh] rounded-none border-0 translate-x-0 translate-y-0 left-0 top-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:max-w-lg sm:h-[88dvh] sm:rounded-2xl sm:border [&>button]:hidden flex flex-col"
        >
          {/* Sticky header */}
          <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur px-4 pt-4 pb-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold leading-tight truncate">
                  {menu.title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filteredSections.length} section{filteredSections.length === 1 ? "" : "s"} ·{" "}
                  {totalItems} item{totalItems === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                aria-label="Close menu"
                className="shrink-0 h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground active:scale-95 transition-transform"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu…"
                inputMode="search"
                className="h-11 pl-9 pr-9 rounded-xl text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-muted flex items-center justify-center before:absolute before:-inset-2 before:content-['']"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-16">
            {filteredSections.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No items match “{query.trim()}”.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSections.map((section, sectionIndex) => {
                  const expanded = isOpenSection(sectionIndex);
                  return (
                    <div
                      key={`${section.name}-${sectionIndex}`}
                      className="scroll-mt-2 rounded-2xl border border-border bg-card/60 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(sectionIndex)}
                        aria-expanded={expanded}
                        className="w-full flex items-center gap-3 px-4 py-3.5 min-h-[52px] text-left active:scale-[0.995] transition-transform"
                      >
                        <span className="text-xl leading-none" aria-hidden>
                          {sectionEmoji(section.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold tracking-wide truncate">
                            {section.name || "Menu"}
                          </span>
                          <span className="block text-[11px] text-muted-foreground tabular-nums">
                            {section.items.length} item{section.items.length === 1 ? "" : "s"}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <div
                        className="grid transition-all duration-300 ease-out"
                        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className="divide-y divide-border border-t border-border">
                            {section.items.map((item, itemIndex) => (
                              <div
                                key={`${item.name}-${itemIndex}`}
                                className="flex items-start justify-between gap-4 px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium leading-snug">{item.name}</p>
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                {item.price && (
                                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                                    {item.price}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
