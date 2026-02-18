import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { TapAwayCardPreview } from "@/components/personal/TapAwayCardPreview";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CreditCard,
  Palette,
  Check,
  Smartphone,
  Users,
  Zap,
  Infinity as InfinityIcon,
} from "lucide-react";
import nfcTapIcon from "@/assets/nfc-tap-icon.png";

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
  { icon: Zap, text: "Instant sharing with a single tap" },
  { icon: Smartphone, text: "Works with any phone — no app needed" },
  { icon: Users, text: "Professional first impression" },
  { icon: InfinityIcon, text: "Never run out of cards again" },
];

export const PreviewStep = ({ formData, updateFormData, onNext, onBack }: Props) => {
  const cardChoice = formData.cardChoice || "custom";
  const basicCardColor = formData.basicCardColor || BASIC_COLORS[0].hex;

  const setCardChoice = (choice: "custom" | "basic" | "none") => {
    updateFormData({ cardChoice: choice });
    if (choice === "basic" && !formData.basicCardColor) {
      updateFormData({ basicCardColor: BASIC_COLORS[0].hex });
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero visual */}
      <div className="relative flex flex-col items-center pt-2 pb-4">
        <div className="relative">
          {/* Pulsing rings */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            style={{ margin: "-12px" }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            style={{ margin: "-12px" }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
          />
          <img src={nfcTapIcon} alt="NFC Tap" className="h-16 w-16 relative z-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground mt-4">Complete your TapAway</h2>
        <p className="text-sm text-muted-foreground text-center mt-1 max-w-[260px]">
          Get a physical NFC card — tap any phone to share your profile instantly.
        </p>
      </div>

      {/* Benefits — always visible */}
      <div className="grid grid-cols-2 gap-2">
        {CARD_BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/5">
              <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-xs text-foreground leading-snug">{b.text}</span>
            </div>
          );
        })}
      </div>

      {/* Social proof */}
      <p className="text-center text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">87%</span> of users get a card
      </p>

      {/* Card choices */}
      <div className="space-y-3">
        {/* Custom Card */}
        <button
          onClick={() => setCardChoice("custom")}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            cardChoice === "custom"
              ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
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
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Popular</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your photo, name & QR code
                </p>
              </div>
              {cardChoice === "custom" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div className="absolute -inset-2 bg-primary/5 rounded-2xl blur-xl" />
                  <div className="relative">
                    <TapAwayCardPreview
                      fullName={formData.fullName}
                      username={formData.username}
                      profilePhotoUrl={formData.profilePhotoUrl}
                      cardHeadline={formData.cardHeadline}
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </button>

        {/* Basic Card */}
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
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
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
                </motion.div>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* CTA */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="h-14">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button onClick={onNext} className="flex-1 h-14 text-base font-semibold">
          Continue to checkout
        </Button>
      </div>

      {/* Skip link */}
      <button
        onClick={() => {
          updateFormData({ cardChoice: "none" });
          onNext();
        }}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Skip for now — you can order anytime from your dashboard
      </button>
    </div>
  );
};
