import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlignCenter, AlignLeft } from "lucide-react";
import { invalidateProfileCache } from "@/hooks/useProfileCache";

interface Props {
  profileId: string;
  username: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  pfpPosition: string;
  onUpdate: (updates: Partial<{
    full_name: string;
    headline: string | null;
    bio: string | null;
    pfp_position: string;
  }>) => void;
}

export const DashboardHeroEditor = ({
  profileId,
  username,
  fullName,
  headline,
  bio,
  pfpPosition,
  onUpdate,
}: Props) => {
  const [name, setName] = useState(fullName);
  const [headlineValue, setHeadlineValue] = useState(headline || "");
  const [bioValue, setBioValue] = useState(bio || "");
  const [position, setPosition] = useState(pfpPosition || "center");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setName(fullName);
    setHeadlineValue(headline || "");
    setBioValue(bio || "");
    setPosition(pfpPosition || "center");
  }, [fullName, headline, bio, pfpPosition]);

  useEffect(() => {
    const changed = 
      name !== fullName ||
      headlineValue !== (headline || "") ||
      bioValue !== (bio || "") ||
      position !== (pfpPosition || "center");
    setHasChanges(changed);
  }, [name, headlineValue, bioValue, position, fullName, headline, bio, pfpPosition]);

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    try {
      const updates = {
        full_name: name.trim(),
        headline: headlineValue.trim() || null,
        bio: bioValue.trim() || null,
        pfp_position: position,
      };

      const { error } = await supabase
        .from("personal_profiles")
        .update(updates)
        .eq("id", profileId);

      if (error) throw error;

      onUpdate(updates);
      invalidateProfileCache(username);
      toast.success("Profile updated!");
      setHasChanges(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">Hero Identity</Label>
        {hasChanges && (
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Display Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-11"
        />
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Headline <span className="opacity-50">(optional)</span>
        </Label>
        <Input
          value={headlineValue}
          onChange={(e) => setHeadlineValue(e.target.value)}
          placeholder="e.g. Creator • LA • Tap to connect"
          className="h-11"
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">{headlineValue.length}/60</p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Bio <span className="opacity-50">(optional)</span>
        </Label>
        <Textarea
          value={bioValue}
          onChange={(e) => setBioValue(e.target.value)}
          placeholder="A short bio about yourself"
          className="min-h-[80px] resize-none"
          maxLength={160}
        />
        <p className="text-xs text-muted-foreground">{bioValue.length}/160</p>
      </div>

      {/* PFP Position */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Profile Photo Position</Label>
        <RadioGroup
          value={position}
          onValueChange={setPosition}
          className="flex gap-2"
        >
          <div className="flex-1">
            <RadioGroupItem
              value="center"
              id="pos-center"
              className="peer sr-only"
            />
            <label
              htmlFor="pos-center"
              className="flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
            >
              <AlignCenter className="h-5 w-5" />
              <span className="text-xs">Centered</span>
            </label>
          </div>
          <div className="flex-1">
            <RadioGroupItem
              value="left"
              id="pos-left"
              className="peer sr-only"
            />
            <label
              htmlFor="pos-left"
              className="flex flex-col items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
            >
              <AlignLeft className="h-5 w-5" />
              <span className="text-xs">Left</span>
            </label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};
