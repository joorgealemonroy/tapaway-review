import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Phone, Building, Briefcase, MapPin, Globe } from "lucide-react";
import { invalidateProfileCache } from "@/hooks/useProfileCache";

interface ContactSettings {
  contact_enabled: boolean;
  contact_phone: string | null;
  contact_company: string | null;
  contact_title: string | null;
  contact_address: string | null;
  contact_website: string | null;
}

interface Props {
  profileId: string;
  username: string;
  fullName: string;
  email: string;
  initialSettings: ContactSettings;
  onUpdate?: () => void;
}

export function DashboardContactCard({
  profileId,
  username,
  fullName,
  email,
  initialSettings,
  onUpdate,
}: Props) {
  const [enabled, setEnabled] = useState(initialSettings.contact_enabled || false);
  const [phone, setPhone] = useState(initialSettings.contact_phone || "");
  const [company, setCompany] = useState(initialSettings.contact_company || "");
  const [title, setTitle] = useState(initialSettings.contact_title || "");
  const [address, setAddress] = useState(initialSettings.contact_address || "");
  const [website, setWebsite] = useState(initialSettings.contact_website || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update({
          contact_enabled: enabled,
          contact_phone: phone.trim() || null,
          contact_company: company.trim() || null,
          contact_title: title.trim() || null,
          contact_address: address.trim() || null,
          contact_website: website.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId);

      if (error) throw error;

      invalidateProfileCache(username);
      toast.success("Contact card settings saved!");
      onUpdate?.();
    } catch (err) {
      console.error("Error saving contact settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Contact Card
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Let visitors save your contact info to their phone with one tap
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable save contact button"
        />
      </div>

      {/* Fields */}
      <div className={`space-y-4 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          Your display name (<strong>{fullName}</strong>) and email (<strong>{email}</strong>) are automatically included.
        </p>

        <div className="space-y-2">
          <Label htmlFor="contact-phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Phone Number
          </Label>
          <Input
            id="contact-phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-company" className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            Company / Organization
          </Label>
          <Input
            id="contact-company"
            placeholder="TapAway Inc."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-title" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Job Title
          </Label>
          <Input
            id="contact-title"
            placeholder="Founder & CEO"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-address" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Address
          </Label>
          <Input
            id="contact-address"
            placeholder="123 Main St, Los Angeles, CA 90001"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-website" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Website
          </Label>
          <Input
            id="contact-website"
            type="url"
            placeholder="https://tapaway.co"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Contact Settings
      </Button>
    </div>
  );
}
