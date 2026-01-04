import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { 
  Instagram, 
  Youtube, 
  Globe, 
  Mail, 
  DollarSign, 
  Music,
  ArrowLeft,
  CheckCircle2,
  Wifi,
  QrCode,
  Truck
} from "lucide-react";

// TikTok icon
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const getLinkIcon = (type: string) => {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    instagram: Instagram,
    tiktok: TikTokIcon,
    youtube: Youtube,
    website: Globe,
    email: Mail,
    payments: DollarSign,
    music: Music,
  };
  return icons[type] || Globe;
};

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const PreviewStep = ({ formData, updateFormData, onNext, onBack }: Props) => {
  return (
    <div className="space-y-6">
      {/* Profile Preview */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header/Cover */}
        <div className="h-20 bg-gradient-to-br from-primary to-primary/70" />
        
        {/* Profile Content */}
        <div className="px-6 pb-6 -mt-10">
          {/* Avatar */}
          <div className="relative inline-block">
            {formData.profilePhotoUrl ? (
              <img
                src={formData.profilePhotoUrl}
                alt={formData.fullName}
                className="h-20 w-20 rounded-full border-4 border-card object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-4 border-card bg-muted flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">
                  {formData.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>

          {/* Name & Username */}
          <div className="mt-3">
            <h2 className="text-lg font-bold text-foreground">{formData.fullName}</h2>
            <p className="text-sm text-muted-foreground">@{formData.username}</p>
          </div>

          {/* Links */}
          {formData.links.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.links.map((link) => {
                const Icon = getLinkIcon(link.type);
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <Icon className="h-5 w-5 text-foreground" />
                    <span className="text-sm font-medium">{link.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Preview */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Your TapAway card</Label>
        <div className="flex gap-4">
          {/* Front of card */}
          <div className="flex-1 aspect-[1.586/1] bg-foreground rounded-2xl p-4 flex flex-col justify-between text-background relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <div className="flex items-center gap-1">
                <Wifi className="h-4 w-4 opacity-60" />
                <QrCode className="h-4 w-4 opacity-60" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {formData.profilePhotoUrl ? (
                <img
                  src={formData.profilePhotoUrl}
                  alt={formData.fullName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-background/20 flex items-center justify-center">
                  <span className="text-sm font-bold">{formData.fullName.charAt(0)}</span>
                </div>
              )}
              <div>
                <p className="font-bold text-sm flex items-center gap-1">
                  {formData.fullName}
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs opacity-70">Tap to Connect & Collaborate</p>
              <p className="text-xs opacity-50">tapaway.co/{formData.username}</p>
            </div>
          </div>

          {/* Back of card */}
          <div className="flex-1 aspect-[1.586/1] bg-background rounded-2xl border border-border flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Back</p>
          </div>
        </div>
      </div>

      {/* Extra Card Option */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
        <div>
          <p className="font-medium text-foreground">Add an extra card</p>
          <p className="text-sm text-muted-foreground">+$10 one-time</p>
        </div>
        <Switch
          checked={formData.addExtraCard}
          onCheckedChange={(checked) => updateFormData({ addExtraCard: checked })}
        />
      </div>

      {/* Shipping Note */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Truck className="h-4 w-4" />
        <span>Free shipping • Ships in 1–2 business days</span>
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
    </div>
  );
};
