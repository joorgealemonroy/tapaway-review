import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UtensilsCrossed } from "lucide-react";
import type { MenuContent } from "@/lib/menuBlock";

interface Props {
  menu: MenuContent;
  isDarkBg?: boolean;
  textColor?: string | null;
  /** Preview mode disables opening the dialog (used inside the phone mockup). */
  interactive?: boolean;
}

export const MenuDisplay = ({ menu, isDarkBg, textColor, interactive = true }: Props) => {
  const [open, setOpen] = useState(false);
  const visibleSections = menu.sections
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.hidden) }))
    .filter((section) => section.items.length > 0);

  if (visibleSections.length === 0) return null;

  const tileClass = isDarkBg
    ? "bg-white/10 border-white/20 hover:bg-white/15"
    : "bg-card border-border hover:bg-muted/60";
  const labelStyle = textColor ? { color: textColor } : undefined;
  const labelClass = textColor ? "" : isDarkBg ? "text-white" : "text-foreground";

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{menu.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pb-2">
            {visibleSections.map((section, sectionIndex) => (
              <div key={`${section.name}-${sectionIndex}`} className="space-y-3">
                {section.name && (
                  <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
                    {section.name}
                  </h3>
                )}
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <div key={`${item.name}-${itemIndex}`} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {item.price && (
                        <span className="shrink-0 text-sm font-semibold tabular-nums">{item.price}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
