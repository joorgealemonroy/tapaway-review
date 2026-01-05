import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { TapAwayCardPreview } from "@/components/personal/TapAwayCardPreview";
import { getPlatformConfig } from "@/lib/platformLinks";
import { 
  ArrowLeft,
  CheckCircle2,
  Truck,
  ExternalLink
} from "lucide-react";

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
        <div 
          className="h-20"
          style={{
            background: formData.headerColor 
              ? formData.headerColor 
              : formData.headerImageUrl 
              ? `url(${formData.headerImageUrl}) center/cover`
              : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))"
          }}
        />
        
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
                const config = getPlatformConfig(link.type);
                const Icon = config?.icon;
                
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${config?.gradient || config?.bgColor || "bg-muted/50"}`}
                  >
                    {Icon && <Icon className={`h-5 w-5 ${config?.color || "text-foreground"}`} />}
                    <span className={`text-sm font-medium flex-1 ${config?.color || "text-foreground"}`}>
                      {link.label}
                    </span>
                    <ExternalLink className={`h-4 w-4 ${config?.color || "text-foreground"} opacity-60`} />
                  </a>
                );
              })}
            </div>
          )}

          {/* Blocks preview */}
          {formData.blocks.length > 0 && (
            <div className="mt-4 space-y-3">
              {formData.blocks.map((block) => {
                switch (block.type) {
                  case "youtube":
                    return (
                      <div key={block.id} className="aspect-video rounded-xl overflow-hidden bg-black">
                        <iframe
                          src={`https://www.youtube.com/embed/${block.content.videoId}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  case "image":
                    return (
                      <img 
                        key={block.id}
                        src={block.content.url} 
                        alt="Block" 
                        className="w-full rounded-xl"
                      />
                    );
                  case "text":
                    return (
                      <div key={block.id} className="space-y-1">
                        <h3 className="font-semibold text-foreground">{block.content.title}</h3>
                        {block.content.body && (
                          <p className="text-sm text-muted-foreground">{block.content.body}</p>
                        )}
                      </div>
                    );
                  case "button":
                    return (
                      <a
                        key={block.id}
                        href={block.content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-4 px-6 bg-primary text-primary-foreground rounded-xl text-center font-semibold hover:bg-primary/90 transition-colors"
                      >
                        {block.content.label}
                      </a>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}
        </div>
      </div>

      {/* Card Preview */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Your TapAway card</Label>
        <TapAwayCardPreview
          fullName={formData.fullName}
          username={formData.username}
          profilePhotoUrl={formData.profilePhotoUrl}
        />
      </div>

      {/* Extra Card Option */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
        <div>
          <p className="font-medium text-foreground">Add an extra card</p>
          <p className="text-sm text-muted-foreground">+$10 one-time</p>
        </div>
        <Switch
          checked={formData.addExtraCard}
          onCheckedChange={(checked) => updateFormData({ addExtraCard: checked, extraCardCount: checked ? 1 : 0 })}
        />
      </div>

      {/* Extra card quantity */}
      {formData.addExtraCard && (
        <div className="flex items-center justify-between px-4">
          <span className="text-sm text-muted-foreground">Extra cards</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateFormData({ extraCardCount: Math.max(1, formData.extraCardCount - 1) })}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              -
            </button>
            <span className="font-medium w-6 text-center">{formData.extraCardCount}</span>
            <button
              onClick={() => updateFormData({ extraCardCount: Math.min(10, formData.extraCardCount + 1) })}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

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
