import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Plus, ArrowLeft, Rocket } from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { PersonalLink } from "@/hooks/usePersonalOnboarding";
import { LinkModal } from "@/components/personal/LinkModal";

interface VibeMetadata {
  name: string;
  glowColor: string;
  accentColor: string;
}

interface PersonalizeStepProps {
  formData: SignupData;
  updateLink: (id: string, updates: Partial<PersonalLink>) => void;
  removeLink: (id: string) => void;
  addLink: (link: Omit<PersonalLink, "id">) => void;
  onNext: () => void;
  onBack: () => void;
  vibeMetadata: VibeMetadata | null;
}

const DEFAULT_PLACEHOLDERS = ["@yourname", "you@email.com", "+1 (555) 000-0000", "yoursite.com", ""];

function isRealValue(value: string): boolean {
  return value.trim() !== "" && !DEFAULT_PLACEHOLDERS.includes(value.trim());
}

export const PersonalizeStep = ({
  formData,
  updateLink,
  removeLink,
  addLink,
  onNext,
  onBack,
  vibeMetadata,
}: PersonalizeStepProps) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const accent = vibeMetadata?.accentColor || "hsl(var(--primary))";
  const glow = vibeMetadata?.glowColor || "transparent";

  const handleValueChange = (link: PersonalLink, newValue: string) => {
    const platform = getPlatformConfig(link.type);
    const url = platform ? platform.generateUrl(newValue) : newValue;
    updateLink(link.id, { value: newValue, url });
  };

  const handleAddLink = (linkData: { type: string; label: string; url: string; value?: string }) => {
    const platform = getPlatformConfig(linkData.type);
    addLink({
      type: linkData.type,
      label: platform?.label || linkData.label,
      value: linkData.value || "",
      url: linkData.url || "",
      sortOrder: formData.links.length,
    });
    setShowLinkModal(false);
  };

  return (
    <div className="relative">
      {/* Vibe glow background */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${glow}26, transparent 70%)`,
        }}
      />

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Link inputs */}
      <div className="space-y-3">
        {formData.links.map((link, index) => {
          const platform = getPlatformConfig(link.type);
          const Icon = platform?.icon;
          const hasReal = isRealValue(link.value);

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 bg-card rounded-xl border border-border p-3"
            >
              {/* Platform icon */}
              <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: platform?.bgColor || "hsl(var(--muted))" }}>
                {Icon && <Icon className="h-4 w-4" style={{ color: platform?.color }} />}
              </div>

              {/* Input */}
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium text-muted-foreground mb-0.5 block">
                  {platform?.label || link.label}
                </label>
                <Input
                  value={link.value}
                  onChange={(e) => handleValueChange(link, e.target.value)}
                  placeholder={link.placeholder || platform?.placeholder || ""}
                  className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  style={{ caretColor: accent }}
                />
              </div>

              {/* Status / Skip */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {hasReal && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-green-500/15">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </div>
                )}
                <button
                  onClick={() => removeLink(link.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
                  aria-label={`Skip ${platform?.label || link.label}`}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add another link */}
      <button
        onClick={() => setShowLinkModal(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors w-full justify-center py-2"
      >
        <Plus className="h-4 w-4" />
        Add another link
      </button>

      {/* Launch CTA */}
      <Button
        onClick={onNext}
        className="w-full h-14 text-lg font-bold mt-8 rounded-2xl shadow-lg transition-all hover:scale-[1.02]"
        style={{
          backgroundColor: accent,
          color: "#fff",
          boxShadow: `0 8px 30px -8px ${accent}80`,
        }}
      >
        <Rocket className="h-5 w-5 mr-2" />
        Continue
      </Button>

      {formData.links.length === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          You can always add links later from your dashboard.
        </p>
      )}

      {/* Link Modal */}
      <LinkModal
        open={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSave={handleAddLink}
        existingTypes={formData.links.map((l) => l.type)}
      />
    </div>
  );
};
