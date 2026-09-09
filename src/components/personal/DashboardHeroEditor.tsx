import { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, X, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { isUsernameReserved } from "@/lib/reservedUsernames";
import { getPublicUsername } from "@/lib/personalUsername";
import { toast } from "sonner";

export interface HeroSnapshot {
  name: string;
  headlineValue: string;
  bioValue: string;
  usernameInput: string;
  showUsernameValue: boolean;
}

export interface DashboardHeroEditorHandle {
  saveAllChanges: () => Promise<void>;
  discardChanges: () => void;
  hasPendingChanges: boolean;
  getSnapshot: () => HeroSnapshot;
  restoreSnapshot: (snap: HeroSnapshot) => void;
}

interface Props {
  profileId: string;
  username: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  planType: string | null;
  showUsername: boolean;
  usernameLocked?: boolean;
  onUpdate: (updates: Partial<{
    full_name: string;
    headline: string | null;
    bio: string | null;
    pfp_position: string;
    username: string;
    show_username: boolean;
  }>) => void;
  onPendingChangesChange?: (hasPending: boolean) => void;
  onEdit?: () => void;
}


export const DashboardHeroEditor = forwardRef<DashboardHeroEditorHandle, Props>(({
  profileId,
  username,
  fullName,
  headline,
  bio,
  planType,
  showUsername,
  usernameLocked = false,
  onUpdate,
  onPendingChangesChange,
  onEdit,
}, ref) => {

  const [name, setName] = useState(fullName);
  const [headlineValue, setHeadlineValue] = useState(headline || "");
  const [bioValue, setBioValue] = useState(bio || "");
  const [showUsernameValue, setShowUsernameValue] = useState(showUsername);
  const suppressEditPingRef = useRef(true);

  // Username editing state
  const isFree = !planType || planType === "free";
  const extractEditableUsername = (storedUsername: string) => {
    if (isFree && storedUsername.startsWith("tap")) {
      return storedUsername.slice(3);
    }
    return storedUsername;
  };

  const [usernameInput, setUsernameInput] = useState(extractEditableUsername(username));
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "unknown">("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  useEffect(() => {
    suppressEditPingRef.current = true;
    setName(fullName);
    setHeadlineValue(headline || "");
    setBioValue(bio || "");
    setUsernameInput(extractEditableUsername(username));
    setShowUsernameValue(showUsername);
  }, [fullName, headline, bio, username, isFree, showUsername]);

  // Ping parent debounce on any user edit (skips the sync-from-props effect above).
  useEffect(() => {
    if (suppressEditPingRef.current) {
      suppressEditPingRef.current = false;
      return;
    }
    onEdit?.();
  }, [name, headlineValue, bioValue, usernameInput, showUsernameValue, onEdit]);

  const hasChanges = useMemo(() => {
    const newPublicUsername = getPublicUsername(isFree ? "free" : (planType as any) || "free", usernameInput);
    return (
      name !== fullName ||
      headlineValue !== (headline || "") ||
      bioValue !== (bio || "") ||
      (!usernameLocked && newPublicUsername !== username) ||
      showUsernameValue !== showUsername
    );
  }, [name, headlineValue, bioValue, usernameInput, fullName, headline, bio, username, isFree, planType, showUsernameValue, showUsername, usernameLocked]);


  // Report pending changes to parent
  useEffect(() => {
    onPendingChangesChange?.(hasChanges);
  }, [hasChanges, onPendingChangesChange]);

  // Debounced username availability check
  useEffect(() => {
    if (usernameLocked) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }
    const newPublicUsername = getPublicUsername(isFree ? "free" : (planType as any) || "free", usernameInput);


    if (newPublicUsername === username) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }

    if (usernameInput.length < 3) {
      setUsernameStatus("invalid");
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    if (usernameInput.length > 30) {
      setUsernameStatus("invalid");
      setUsernameError("Username must be 30 characters or less");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(usernameInput)) {
      setUsernameStatus("invalid");
      setUsernameError("Only lowercase letters, numbers, and underscores");
      return;
    }

    if (isUsernameReserved(newPublicUsername)) {
      setUsernameStatus("taken");
      setUsernameError("This username is reserved");
      return;
    }

    setUsernameError(null);
    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const { data, error } = await supabase.rpc("is_username_available", {
          check_username: newPublicUsername,
        });
        if (error) throw error;
        setUsernameStatus(data ? "available" : "taken");
        if (!data) setUsernameError("This username is already taken");
      } catch (err) {
        console.error("Error checking username:", err);
        // Don't silently reset — the check genuinely failed (offline, etc.)
        // and the user would otherwise hit a confusing save error.
        setUsernameStatus("unknown");
        setUsernameError("Couldn't check username availability — check your connection and try again");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [usernameInput, username, isFree, planType, usernameLocked]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    if (!name.trim()) {
      throw new Error("Please add your display name before saving");
    }

    const newPublicUsername = getPublicUsername(isFree ? "free" : (planType as any) || "free", usernameInput);
    const usernameChanged = !usernameLocked && newPublicUsername !== username;

    if (usernameChanged && usernameStatus !== "available") {
      throw new Error("Please fix username issues before saving");
    }

    const updates: Record<string, any> = {
      full_name: name.trim(),
      headline: headlineValue.trim() || null,
      bio: bioValue.trim() || null,
      pfp_position: "center",
      show_username: showUsernameValue,
    };

    if (usernameChanged) {
      updates.username = newPublicUsername;
    }

    const { error } = await supabase
      .from("personal_profiles")
      .update(updates)
      .eq("id", profileId);

    if (error) throw error;

    // If username changed, sync NFC cards
    if (usernameChanged) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: nfcError } = await supabase
          .from("nfc_cards")
          .update({ destination_value: newPublicUsername })
          .eq("owner_user_id", user.id)
          .eq("destination_type", "profile");
        if (nfcError) {
          // Profile already saved — don't throw, but the user must know
          // their physical cards still point at the old username.
          console.error("Failed to sync NFC cards with new username:", nfcError);
          toast.error("Profile saved, but your NFC cards couldn't be updated — contact support so they still point to your new URL.");
        }
      }

      invalidateProfileCache(username);
      invalidateProfileCache(newPublicUsername);
    } else {
      invalidateProfileCache(username);
    }

    onUpdate(updates);
    setUsernameStatus("idle");
  }, [hasChanges, isFree, planType, usernameInput, username, usernameStatus, name, headlineValue, bioValue, profileId, onUpdate, showUsernameValue, usernameLocked]);


  const discardChanges = useCallback(() => {
    setName(fullName);
    setHeadlineValue(headline || "");
    setBioValue(bio || "");
    setUsernameInput(extractEditableUsername(username));
    setShowUsernameValue(showUsername);
    setUsernameStatus("idle");
    setUsernameError(null);
  }, [fullName, headline, bio, username, isFree, showUsername]);

  const getSnapshot = useCallback((): HeroSnapshot => ({
    name,
    headlineValue,
    bioValue,
    usernameInput,
    showUsernameValue,
  }), [name, headlineValue, bioValue, usernameInput, showUsernameValue]);

  const restoreSnapshot = useCallback((snap: HeroSnapshot) => {
    suppressEditPingRef.current = true;
    setName(snap.name);
    setHeadlineValue(snap.headlineValue);
    setBioValue(snap.bioValue);
    setUsernameInput(snap.usernameInput);
    setShowUsernameValue(snap.showUsernameValue);
    setUsernameStatus("idle");
    setUsernameError(null);
    // Fire onEdit on the next tick so the debounce restarts against restored values.
    setTimeout(() => onEdit?.(), 0);
  }, [onEdit]);

  useImperativeHandle(ref, () => ({
    saveAllChanges: handleSave,
    discardChanges,
    hasPendingChanges: hasChanges,
    getSnapshot,
    restoreSnapshot,
  }), [handleSave, discardChanges, hasChanges, getSnapshot, restoreSnapshot]);

  const usernameChanged = getPublicUsername(isFree ? "free" : (planType as any) || "free", usernameInput) !== username;

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full min-h-[44px] py-2">
        <Label className="text-sm font-medium text-foreground pointer-events-none">Hero Identity</Label>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
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

        {/* Username */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              tapaway.co/{isFree ? "tap" : ""}
            </span>
            <Input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yourname"
              disabled={usernameLocked}
              className={cn(
                `h-11 ${isFree ? "pl-[120px]" : "pl-[100px]"} pr-10`,
                usernameLocked && "opacity-70 cursor-not-allowed"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
              {usernameStatus === "taken" && <X className="h-4 w-4 text-destructive" />}
              {usernameStatus === "invalid" && <X className="h-4 w-4 text-destructive" />}
              {usernameStatus === "unknown" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
            </div>
          </div>
          {usernameLocked ? (
            <p className="text-xs text-muted-foreground">
              Username is locked once your hub is approved.
            </p>
          ) : (
            <>
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
              {usernameChanged && usernameStatus === "available" && (
                <div className="flex items-start gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Changing your username will update your profile URL and all linked cards</span>
                </div>
              )}
            </>
          )}
        </div>


        {/* Show username toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Show username on profile</Label>
          <Switch
            checked={showUsernameValue}
            onCheckedChange={setShowUsernameValue}
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
      </CollapsibleContent>
    </Collapsible>
  );
});

DashboardHeroEditor.displayName = "DashboardHeroEditor";
