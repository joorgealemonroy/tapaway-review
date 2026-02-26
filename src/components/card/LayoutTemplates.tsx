import { useState } from "react";
import { LAYOUT_TEMPLATES, LayoutTemplate } from "@/lib/layoutTemplates";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onSelect: (templateId: string) => void;
}

export const LayoutTemplates = ({ onSelect }: Props) => {
  const [selected, setSelected] = useState<string | null>(
    sessionStorage.getItem("tapaway_selected_layout")
  );

  const handleSelect = (template: LayoutTemplate) => {
    const newVal = selected === template.id ? null : template.id;
    setSelected(newVal);
    if (newVal) {
      sessionStorage.setItem("tapaway_selected_layout", newVal);
    } else {
      sessionStorage.removeItem("tapaway_selected_layout");
    }
    onSelect(newVal || "");
  };

  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Pick a Layout <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full align-middle">Free</span></h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start with a template — customize it later
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LAYOUT_TEMPLATES.map((t) => {
          const isSelected = selected === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => handleSelect(t)}
              whileTap={{ scale: 0.97 }}
              className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="text-2xl mb-2">{t.emoji}</div>
              <p className="font-semibold text-sm text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {t.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {t.defaultLinks.slice(0, 3).map((l) => (
                  <span
                    key={l.type}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {l.label}
                  </span>
                ))}
                {t.defaultBlocks.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    +{t.defaultBlocks.length} block{t.defaultBlocks.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
