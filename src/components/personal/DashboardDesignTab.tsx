import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropper } from "./ImageCropper";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Image as ImageIcon,
  X,
  Upload,
  Loader2,
  Crop,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  profileId: string;
  backgroundColor: string | null;
  profilePhotoUrl: string | null;
  /** The cover image shown at the top of the hub (personal_profiles.header_image_url). */
  bannerImageUrl: string | null;
  isFoundingUser?: boolean;
  showFoundingBadge?: boolean;
  onUpdate: (updates: {
    backgroundColor?: string | null;
    profilePhotoUrl?: string | null;
    bannerImageUrl?: string | null;
  }) => void;
}

type DesignDatabaseUpdates = Partial<{
  background_color: string | null;
  profile_photo_url: string | null;
  header_image_url: string | null;
}>;

type DesignPreviewUpdates = Parameters<Props["onUpdate"]>[0];

// One curated set of solid page colors — no gradients, no fades.
const BG_PRESETS = [
  "#ffffff",
  "#f5f5f5",
  "#fef3c7",
  "#ecfdf5",
  "#e0f2fe",
  "#ede9fe",
  "#fce7f3",
  "#1a1a1a",
  "#0a0a0a",
  "#1e293b",
];

const isSolidHex = (value: string) => /^#[0-9A-Fa-f]{6}$/.test(value);

/**
 * Simplified design editor: profile photo, cover image, and one good
 * background color picker. Legacy header styles (header_type, banner shapes,
 * logo scale, etc.) are intentionally not offered anymore — see the hub
 * render for how stored legacy values fall back to the clean default.
 */
export const DashboardDesignTab = ({
  profileId,
  backgroundColor,
  profilePhotoUrl,
  bannerImageUrl,
  isFoundingUser,
  showFoundingBadge,
  onUpdate,
}: Props) => {
  const [pendingBgColor, setPendingBgColor] = useState(backgroundColor);
  const [bgColorInput, setBgColorInput] = useState(backgroundColor || "#ffffff");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState<"photo" | "banner" | null>(null);
  const [badgeVisible, setBadgeVisible] = useState(showFoundingBadge ?? false);
  const [togglingBadge, setTogglingBadge] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [cropperTarget, setCropperTarget] = useState<"photo" | "banner">("photo");

  const queuedUpdatesRef = useRef<DesignDatabaseUpdates>({});
  const saveInFlightRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Consecutive failed flushes — after a few, stop auto-retrying so a
  // persistent failure doesn't loop forever; the user retries manually.
  const consecutiveFailuresRef = useRef(0);
  const MAX_AUTO_RETRIES = 3;

  // Re-sync when props change externally.
  useEffect(() => {
    setPendingBgColor(backgroundColor);
    setBgColorInput(backgroundColor || "#ffffff");
  }, [backgroundColor]);

  useEffect(() => {
    setBadgeVisible(showFoundingBadge ?? false);
  }, [showFoundingBadge]);

  const flushDesignSave = useCallback(async () => {
    if (saveInFlightRef.current || Object.keys(queuedUpdatesRef.current).length === 0) return;

    const updates = queuedUpdatesRef.current;
    queuedUpdatesRef.current = {};
    saveInFlightRef.current = true;
    setSaving(true);
    setSaveStatus("saving");

    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update(updates)
        .eq("id", profileId);
      if (error) throw error;

      consecutiveFailuresRef.current = 0;
      setSaveStatus("saved");
      if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
      savedStatusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 1600);
    } catch (err) {
      queuedUpdatesRef.current = { ...updates, ...queuedUpdatesRef.current };
      consecutiveFailuresRef.current += 1;
      console.error("Save error:", err);
      setSaveStatus("error");
      toast.error("Design could not be saved. Please try again.");
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
      if (
        Object.keys(queuedUpdatesRef.current).length > 0 &&
        consecutiveFailuresRef.current < MAX_AUTO_RETRIES
      ) {
        // Back off between automatic retries — don't hammer the network.
        setTimeout(() => { void flushDesignSave(); }, 2500);
      }
    }
  }, [profileId]);

  const queueDesignSave = useCallback((
    databaseUpdates: DesignDatabaseUpdates,
    previewUpdates: DesignPreviewUpdates,
  ) => {
    queuedUpdatesRef.current = { ...queuedUpdatesRef.current, ...databaseUpdates };
    onUpdate(previewUpdates);
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushDesignSave();
    }, 250);
  }, [flushDesignSave, onUpdate]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savedStatusTimerRef.current) clearTimeout(savedStatusTimerRef.current);
    if (Object.keys(queuedUpdatesRef.current).length > 0) void flushDesignSave();
  }, [flushDesignSave]);

  const handleBgColorChange = (color: string) => {
    setPendingBgColor(color);
    setBgColorInput(color);
    // Keep the live preview in step with the picker.
    queueDesignSave({ background_color: color }, { backgroundColor: color });
  };

  // --- Image upload plumbing ---
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement("canvas");
        const maxDim = 2400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No 2d context")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => { if (blob) resolve(blob); else reject(new Error("Compression failed")); },
          "image/jpeg", 0.85
        );
      };
      img.onerror = (e) => { URL.revokeObjectURL(img.src); reject(e); };
      img.src = URL.createObjectURL(file);
    });
  };

  const validateImageFile = async (file: File): Promise<Blob | null> => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return null; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Image must be less than 20MB"); return null; }
    let processed: Blob = file;
    if (file.size > 2 * 1024 * 1024) {
      try { processed = await compressImage(file); }
      catch { toast.error("Failed to process image"); return null; }
    }
    return processed;
  };

  const uploadCroppedBlob = async (blob: Blob, target: "photo" | "banner") => {
    setUploading(target);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const filePath = target === "photo"
        ? `${user.id}/${profileId}/profile.jpg`
        : `${user.id}/${profileId}/banner.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(filePath);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      if (target === "photo") {
        const { error } = await supabase
          .from("personal_profiles")
          .update({ profile_photo_url: urlWithBust })
          .eq("id", profileId);
        if (error) throw error;
        onUpdate({ profilePhotoUrl: urlWithBust });
        toast.success("Profile photo updated!");
      } else {
        const { error } = await supabase
          .from("personal_profiles")
          .update({ header_image_url: urlWithBust })
          .eq("id", profileId);
        if (error) throw error;
        onUpdate({ bannerImageUrl: urlWithBust });
        toast.success("Cover image updated!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(target === "photo" ? "Failed to upload photo" : "Failed to upload cover image");
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "photo" | "banner",
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const processed = await validateImageFile(file);
    if (!processed) return;
    setCropperSrc(URL.createObjectURL(processed));
    setCropperTarget(target);
    setCropperOpen(true);
  };

  /** Re-crop the currently saved image so it can be framed right. */
  const openAdjustCropper = (target: "photo" | "banner") => {
    const source = target === "photo" ? profilePhotoUrl : bannerImageUrl;
    if (!source) {
      toast.error(target === "photo" ? "Upload a photo first" : "Upload a cover image first");
      return;
    }
    // Bust the cache so the cropper fetches the freshly-replaced image.
    setCropperSrc(source.includes("?") ? source : `${source}?t=${Date.now()}`);
    setCropperTarget(target);
    setCropperOpen(true);
  };

  const handleRemoveBanner = async () => {
    setUploading("banner");
    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update({ header_image_url: null })
        .eq("id", profileId);
      if (error) throw error;
      onUpdate({ bannerImageUrl: null });
      toast.success("Cover image removed");
    } catch (err) {
      console.error("Error removing cover image:", err);
      toast.error("Failed to remove cover image");
    } finally {
      setUploading(null);
    }
  };

  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // A stored legacy gradient still renders on the hub — the picker just can't
  // edit it, so show it honestly as "Custom".
  const currentIsGradient = typeof pendingBgColor === "string" &&
    (pendingBgColor.startsWith("linear-gradient") || pendingBgColor.startsWith("radial-gradient"));

  return (
    <div className="space-y-8">
      {/* Sticky save bar */}
      {(saving || saveStatus !== "idle") && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saveStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span className={saveStatus === "error" ? "text-destructive" : undefined}>
            {saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Save failed" : "Saving…"}
          </span>
          {saveStatus === "error" && (
            <button
              type="button"
              onClick={() => {
                consecutiveFailuresRef.current = 0;
                void flushDesignSave();
              }}
              className="min-h-[44px] px-3 font-semibold text-primary"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Profile photo */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Profile photo</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            This shows next to your name. Adjust it to frame it just right.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden bg-muted border border-border">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Camera className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <Button
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading !== null}
            >
              {uploading === "photo" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {profilePhotoUrl ? "Upload new photo" : "Upload photo"}
            </Button>
            {profilePhotoUrl && (
              <Button
                variant="ghost"
                className="min-h-[44px] w-full sm:w-auto"
                onClick={() => openAdjustCropper("photo")}
                disabled={uploading !== null}
              >
                <Crop className="h-4 w-4 mr-2" />
                Adjust framing
              </Button>
            )}
          </div>
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e, "photo")}
          className="hidden"
        />
      </section>

      <div className="h-px bg-border" />

      {/* Cover image */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Cover image</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            A wide banner at the top of your page. Optional.
          </p>
        </div>
        {bannerImageUrl ? (
          <div className="relative">
            <img
              src={bannerImageUrl}
              alt="Cover"
              className="w-full h-36 object-cover rounded-xl border border-border"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-11 w-11 rounded-full shadow"
                onClick={() => openAdjustCropper("banner")}
                disabled={uploading !== null}
                aria-label="Adjust cover image"
              >
                {uploading === "banner" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Crop className="h-5 w-5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-11 w-11 rounded-full shadow"
                onClick={() => setConfirmRemoveCover(true)}
                disabled={uploading !== null}
                aria-label="Remove cover image"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploading !== null}
            className="w-full min-h-[96px] bg-muted/50 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
          >
            {uploading === "banner" ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload cover image</span>
              </>
            )}
          </button>
        )}
        {bannerImageUrl && (
          <Button
            variant="outline"
            className="min-h-[44px] w-full sm:w-auto"
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploading !== null}
          >
            <Upload className="h-4 w-4 mr-2" />
            Replace cover image
          </Button>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e, "banner")}
          className="hidden"
        />
      </section>

      <div className="h-px bg-border" />

      {/* Background color — one good picker */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Page background</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pick a color for your page, or enter your own.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {BG_PRESETS.map((color) => {
            const selected = pendingBgColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => handleBgColorChange(color)}
                aria-label={`Background color ${color}`}
                aria-pressed={selected}
                className={`h-12 w-12 rounded-full border-2 transition-all ${
                  selected
                    ? "border-primary ring-2 ring-primary/30 scale-110"
                    : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}
          {currentIsGradient && (
            <button
              type="button"
              aria-label={`Current custom background ${pendingBgColor}`}
              aria-pressed
              className="h-12 w-12 rounded-full border-2 border-primary ring-2 ring-primary/30"
              style={{ background: pendingBgColor as string }}
              title="Your current custom background"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="bg-custom-color" className="sr-only">Custom background color</Label>
          <input
            id="bg-custom-color"
            type="color"
            value={isSolidHex(bgColorInput) ? bgColorInput : "#ffffff"}
            onChange={(e) => {
              setBgColorInput(e.target.value);
              handleBgColorChange(e.target.value);
            }}
            className="h-12 w-12 shrink-0 rounded-lg border border-border cursor-pointer bg-transparent p-1"
            aria-label="Pick a custom color"
          />
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm pointer-events-none">
              #
            </span>
            <Input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="FFFFFF"
              aria-label="Custom color hex code"
              value={bgColorInput.replace(/^#/, "")}
              onChange={(e) => setBgColorInput(`#${e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6)}`)}
              onBlur={() => {
                if (isSolidHex(bgColorInput)) {
                  handleBgColorChange(bgColorInput);
                } else {
                  // Snap back to the saved value on invalid input.
                  setBgColorInput(pendingBgColor && isSolidHex(pendingBgColor) ? pendingBgColor : "#ffffff");
                  toast.error("Enter a 6-digit hex color, like #1a1a2e");
                }
              }}
              className="h-12 pl-8 font-mono text-base md:text-sm uppercase"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Dark colors work best with light text, light colors with dark text — your
          page adjusts text automatically.
        </p>
      </section>

      {/* Founding Creator Badge Toggle */}
      {isFoundingUser && (
        <div className="border-t pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Founding Creator Badge</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Display your Founding Creator badge on your public profile
              </p>
            </div>
            <Switch
              checked={badgeVisible}
              disabled={togglingBadge}
              aria-label="Show Founding Creator badge on public profile"
              onCheckedChange={async (checked) => {
                if (togglingBadge) return;
                setTogglingBadge(true);
                setBadgeVisible(checked);
                try {
                  const { error } = await supabase
                    .from("personal_profiles")
                    .update({ show_founding_badge: checked })
                    .eq("id", profileId);
                  if (error) throw error;
                  toast.success(checked ? "Badge visible on your profile" : "Badge hidden from your profile");
                } catch (err) {
                  console.error("Toggle badge error:", err);
                  setBadgeVisible(!checked);
                  toast.error("Failed to update badge visibility");
                } finally {
                  setTogglingBadge(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {cropperSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) {
              // Release the blob URL created in handleFileSelect (remote URLs
              // used by "adjust crop" are not blob URLs — leave those alone).
              setCropperSrc((src) => {
                if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
                return null;
              });
            }
          }}
          imageSrc={cropperSrc}
          onCropComplete={(blob) => uploadCroppedBlob(blob, cropperTarget)}
          aspectRatio={cropperTarget === "photo" ? 1 : 3}
          cropShape={cropperTarget === "photo" ? "round" : "rect"}
          minZoom={1}
          maxOutputDimension={2048}
          outputQuality={0.9}
          title={cropperTarget === "photo" ? "Adjust your profile photo" : "Adjust your cover image"}
        />
      )}

      <AlertDialog open={confirmRemoveCover} onOpenChange={setConfirmRemoveCover}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove cover image?</AlertDialogTitle>
            <AlertDialogDescription>
              Your hub will go back to the plain background. You can upload a new cover any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
              onClick={() => { setConfirmRemoveCover(false); void handleRemoveBanner(); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
