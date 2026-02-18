import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { TapAwayCardPreview } from "@/components/personal/TapAwayCardPreview";
import { 
  ArrowLeft,
  CreditCard,
  Palette,
  Info,
  Check,
  Smartphone,
  Users,
  Zap,
  Infinity
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const BASIC_COLORS = [
  { name: "Yellow", hex: "#FFD93D" },
  { name: "Green", hex: "#6BCB77" },
  { name: "Pink", hex: "#FF6B9D" },
  { name: "Red", hex: "#FF6B6B" },
  { name: "Grey", hex: "#9CA3AF" },
];

const CARD_BENEFITS = [
  { icon: Zap, text: "Instant contact sharing with a single tap" },
  { icon: Smartphone, text: "Works with any smartphone — no app needed" },
  { icon: Users, text: "Professional first impression every time" },
  { icon: Infinity, text: "Never run out of business cards again" },
];

export const PreviewStep = ({ formData, updateFormData, onNext, onBack }: Props) => {
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);

  const cardChoice = formData.cardChoice || "none";
  const basicCardColor = formData.basicCardColor || BASIC_COLORS[0].hex;

  const setCardChoice = (choice: "custom" | "basic" | "none") => {
    updateFormData({ cardChoice: choice });
    if (choice === "basic" && !formData.basicCardColor) {
      updateFormData({ basicCardColor: BASIC_COLORS[0].hex });
    }
  };

  return (
    <div className="space-y-6">
      {/* Card Options */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Get a physical NFC card that links to your profile. Tap any phone to share instantly.
        </p>

        {/* Custom Card Option */}
        <button
          onClick={() => setCardChoice("custom")}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            cardChoice === "custom"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              cardChoice === "custom" ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {cardChoice === "custom" && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Custom Card</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your photo, name & QR code
                </p>
              </div>
              {cardChoice === "custom" && (
                <div className="transform scale-90 origin-top-left">
                  <TapAwayCardPreview
                    fullName={formData.fullName}
                    username={formData.username}
                    profilePhotoUrl={formData.profilePhotoUrl}
                    cardHeadline={formData.cardHeadline}
                  />
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Basic Card Option */}
        <button
          onClick={() => setCardChoice("basic")}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            cardChoice === "basic"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              cardChoice === "basic" ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {cardChoice === "basic" && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Basic Card</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Solid color with "tapaway.co" centered
                </p>
              </div>
              {cardChoice === "basic" && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    {BASIC_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFormData({ basicCardColor: color.hex });
                        }}
                        className={`h-10 w-10 rounded-full border-2 transition-all ${
                          basicCardColor === color.hex
                            ? "border-primary scale-110 ring-2 ring-primary/30"
                            : "border-border hover:scale-105"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <div
                    className="w-full aspect-[85.6/53.98] rounded-xl flex items-center justify-center shadow-lg border border-black/10"
                    style={{ backgroundColor: basicCardColor }}
                  >
                    <span className="text-white font-bold text-lg drop-shadow-md">
                      tapaway.co
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* No Card Option */}
        <button
          onClick={() => setCardChoice("none")}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            cardChoice === "none"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              cardChoice === "none" ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {cardChoice === "none" && <Check className="h-4 w-4 text-primary-foreground" />}
            </div>
            <div>
              <span className="font-semibold text-foreground">Not now</span>
              <p className="text-sm text-muted-foreground mt-0.5">
                You can order one anytime from your dashboard
              </p>
            </div>
          </div>
        </button>

        {/* Why get a card? */}
        <button
          onClick={() => setMoreInfoOpen(true)}
          className="flex items-center gap-1.5 mx-auto text-sm text-primary hover:underline"
        >
          <Info className="h-4 w-4" />
          Why get a physical card?
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="h-14"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 h-14 text-base font-semibold"
        >
          Continue to checkout
        </Button>
      </div>

      {/* More Info Dialog */}
      <Dialog open={moreInfoOpen} onOpenChange={setMoreInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Why get a physical card?</DialogTitle>
            <DialogDescription>
              A TapAway card makes sharing your info effortless.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {CARD_BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-foreground pt-1.5">{benefit.text}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => setMoreInfoOpen(false)} className="w-full">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
