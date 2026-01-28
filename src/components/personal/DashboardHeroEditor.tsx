import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { invalidateProfileCache } from "@/hooks/useProfileCache";

interface Props {
  profileId: string;
  username: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
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
  onUpdate,
}: Props) => {
  const [name, setName] = useState(fullName);
  const [headlineValue, setHeadlineValue] = useState(headline || "");
  const [bioValue, setBioValue] = useState(bio || "");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setName(fullName);
    setHeadlineValue(headline || "");
    setBioValue(bio || "");
  }, [fullName, headline, bio]);

  useEffect(() => {
    const changed = 
      name !== fullName ||
      headlineValue !== (headline || "") ||
      bioValue !== (bio || "");
    setHasChanges(changed);
  }, [name, headlineValue, bioValue, fullName, headline, bio]);

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    try {
      const updates = {
        full_name: name.trim(),
        headline: headlineValue.trim() || null,
        bio: bioValue.trim() || null,
        pfp_position: "center", // Always centered
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
    </div>
  );
};
