import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Phone, Building, Briefcase, MapPin, Globe, User, Camera, Mail, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { invalidateProfileCache } from "@/hooks/useProfileCache";

interface ContactSettings {
  contact_enabled: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_photo_url: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  contact_title: string | null;
  contact_address: string | null;
  contact_website: string | null;
  contact_display_style?: string | null;
  contact_button_label?: string | null;
}

interface Props {
  profileId: string;
  username: string;
  fullName: string;
  email: string;
  profilePhotoUrl?: string | null;
  initialSettings: ContactSettings;
  onUpdate?: () => void;
  onDisplayStyleChange?: (style: string) => void;
}

export function DashboardContactCard({
  profileId,
  username,
  fullName,
  email,
  profilePhotoUrl,
  initialSettings,
  onUpdate,
  onDisplayStyleChange,
}: Props) {
  const [enabled, setEnabled] = useState(initialSettings.contact_enabled || false);
  const [contactName, setContactName] = useState(initialSettings.contact_name || "");
  const [contactEmail, setContactEmail] = useState(initialSettings.contact_email || "");
  const [contactPhotoUrl, setContactPhotoUrl] = useState(initialSettings.contact_photo_url || "");
  const [phone, setPhone] = useState(initialSettings.contact_phone || "");
  const [company, setCompany] = useState(initialSettings.contact_company || "");
  const [title, setTitle] = useState(initialSettings.contact_title || "");
  const [address, setAddress] = useState(initialSettings.contact_address || "");
  const [website, setWebsite] = useState(initialSettings.contact_website || "");
  const [displayStyle, setDisplayStyle] = useState(initialSettings.contact_display_style || "icon");
  const [buttonLabel, setButtonLabel] = useState(initialSettings.contact_button_label || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      // Compress large images
      let processedFile: File | Blob = file;
      if (file.size > 2 * 1024 * 1024) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        processedFile = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
        });
        URL.revokeObjectURL(url);
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${profileId}/contact-photo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(fileName, processedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(fileName);

      setContactPhotoUrl(urlData.publicUrl);
      toast.success("Photo uploaded!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update({
          contact_enabled: enabled,
          contact_name: contactName.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_photo_url: contactPhotoUrl.trim() || null,
          contact_phone: phone.trim() || null,
          contact_company: company.trim() || null,
          contact_title: title.trim() || null,
          contact_address: address.trim() || null,
          contact_website: website.trim() || null,
          contact_display_style: displayStyle,
          contact_button_label: buttonLabel.trim() || null,
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

  const displayPhotoUrl = contactPhotoUrl || profilePhotoUrl;

  return (
    <Collapsible defaultOpen={false} className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-start justify-between gap-4">
        <CollapsibleTrigger className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Contact Card
            </h3>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Let visitors save your contact info to their phone with one tap
          </p>
        </CollapsibleTrigger>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable save contact button"
        />
      </div>

      <CollapsibleContent>
      {/* Display Style */}
      <div className={`space-y-3 mb-4 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
        <Label className="text-sm font-medium">Display Style</Label>
        <RadioGroup
          value={displayStyle}
          onValueChange={(value) => {
            setDisplayStyle(value);
            onDisplayStyleChange?.(value);
          }}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="icon" id="style-icon" />
            <Label htmlFor="style-icon" className="cursor-pointer text-sm">Icon (top right)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="button" id="style-button" />
            <Label htmlFor="style-button" className="cursor-pointer text-sm">Button (in content)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Fields */}
      <div className={`space-y-4 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Contact Photo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            Contact Photo
          </Label>
          <div className="flex items-center gap-4">
            <div className="relative">
              {displayPhotoUrl ? (
                <img
                  src={displayPhotoUrl}
                  alt="Contact"
                  className="h-16 w-16 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {contactPhotoUrl ? "Change Photo" : "Upload Photo"}
              </Button>
              {contactPhotoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-muted-foreground"
                  onClick={() => setContactPhotoUrl("")}
                >
                  Use profile photo
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {contactPhotoUrl ? "Custom photo for contact card" : `Using your profile photo`}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Name */}
        <div className="space-y-2">
          <Label htmlFor="contact-name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Contact Name
          </Label>
          <Input
            id="contact-name"
            placeholder={fullName}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use "{fullName}"
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="contact-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email
          </Label>
          <Input
            id="contact-email"
            type="email"
            placeholder={email}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use "{email}"
          </p>
        </div>

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
            placeholder={`https://tapaway.co/${username}`}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use your TapAway profile link
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Contact Settings
      </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
