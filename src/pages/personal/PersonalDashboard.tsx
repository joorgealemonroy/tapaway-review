import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { 
  Link2, 
  BarChart3,
  LogOut,
  Camera,
  Loader2,
  Eye,
  Copy,
  Check,
  Palette,
  Mail,
  Sparkles,
  Star,
  Users,
  ShoppingBag,
  ArrowLeftRight,
  Smartphone,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { DashboardUnifiedContent, DashboardUnifiedContentHandle, UnifiedContentSnapshot } from "@/components/personal/DashboardUnifiedContent";
import { DashboardDesignTab } from "@/components/personal/DashboardDesignTab";
import { DashboardHeroEditor, DashboardHeroEditorHandle, HeroSnapshot } from "@/components/personal/DashboardHeroEditor";

import { ProfilePreviewPanel } from "@/components/personal/ProfilePreviewPanel";
import { AutosaveStatusBar, AutosaveStatus } from "@/components/personal/AutosaveStatusBar";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { compressImage } from "@/lib/imageOptimization";
import { sampleBottomEdgeColor, DEFAULT_HUB_BACKGROUND_COLOR } from "@/lib/sampleBannerColor";
import EmailLeadsTab from "@/components/personal/EmailLeadsTab";
import SmsMarketingTab from "@/components/personal/SmsMarketingTab";
import { AdvancedAnalyticsTab } from "@/components/personal/AdvancedAnalyticsTab";
import { DashboardContactCard } from "@/components/personal/DashboardContactCard";
import { PersonalBillingTab } from "@/components/personal/PersonalBillingTab";
import { PersonalShopTab } from "@/components/personal/PersonalShopTab";
import { CardsTab } from "@/components/personal/CardsTab";

import { WelcomeCoachMarks } from "@/components/personal/WelcomeCoachMarks";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";
import { useAffiliateAccess } from "@/hooks/useAffiliateAccess";
import { useSalesRep } from "@/hooks/useSalesRep";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/personal/MobileBottomNav";
import { AdminViewBanner } from "@/components/admin/AdminViewBanner";


interface PersonalProfile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  header_type: string;
  header_color: string | null;
  header_image_url: string | null;
  background_color: string | null;
  pfp_position: string;
  headline: string | null;
  bio: string | null;
  card_confirmed: boolean | null;
  card_confirmed_at: string | null;
  card_front_headline: string | null;
  card_back_text: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  // Contact card fields
  contact_enabled: boolean | null;
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
  // Premium feature
  banner_image_url: string | null;
  // Affiliate referral
  referred_by: string | null;
  trial_ends_at: string | null;
  stripe_billing_email: string | null;
  // Founding creator
  is_founding_user?: boolean;
  founding_number?: number | null;
  show_founding_badge?: boolean;
  show_username?: boolean;
  has_card_addon?: boolean;
  // Rep-demo fields
  sales_rep_id?: string | null;
  is_approved?: boolean | null;
  pipeline_status?: string | null;
  submitted_for_review_at?: string | null;
}

interface DbPersonalLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  sort_order: number;
  pill_color: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  display_style?: string | null;
}

interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  sort_order: number;
  alignment: string | null;
  is_active?: boolean | null;
}



const PersonalDashboard = () => {
  const navigate = useNavigate();
  const { isAffiliate } = useAffiliateAccess();
  const { isSalesRep } = useSalesRep();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<PersonalProfile[]>([]);
  const [links, setLinks] = useState<DbPersonalLink[]>([]);
  const [blocks, setBlocks] = useState<PersonalBlock[]>([]);
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unifiedContentRef = useRef<DashboardUnifiedContentHandle>(null);
  const heroEditorRef = useRef<DashboardHeroEditorHandle>(null);
  const [heroHasPending, setHeroHasPending] = useState(false);

  // Autosave state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const editTickRef = useRef(0);
  const [editTick, setEditTick] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingReflushRef = useRef(false);
  const lastSavedSnapshotRef = useRef<{ hero: HeroSnapshot | null; content: UnifiedContentSnapshot | null }>({ hero: null, content: null });
  const undoTargetRef = useRef<{ hero: HeroSnapshot | null; content: UnifiedContentSnapshot | null } | null>(null);
  const savedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [upgrading, setUpgrading] = useState(false);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "links");
  const [coachHighlight, setCoachHighlight] = useState<string | null>(null);
  const welcomeParamRef = useRef<boolean>(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Admin impersonation mode
  const adminViewId = searchParams.get("admin_view_personal") || searchParams.get("admin_view");
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminViewName, setAdminViewName] = useState("");

  // Load profile data - always fresh from DB, never cached
  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not authenticated - redirect to auth page, NOT signup
        navigate("/auth?redirect=/dashboard");
        return;
      }

      // Admin never gets bound to a personal profile at /dashboard.
      // If admin lands here without an explicit impersonation target, send them
      // to the account picker. If they arrived via a legacy ?profile_id=..., rewrite
      // it to ?admin_view_personal=... so the impersonation branch owns the session.
      if (!adminViewId) {
        const { data: isAdminEarly } = await supabase.rpc("is_admin");
        if (isAdminEarly) {
          const legacyProfileId = searchParams.get("profile_id");
          if (legacyProfileId) {
            navigate(`/dashboard?admin_view_personal=${legacyProfileId}`, { replace: true });
            return;
          }
          navigate("/admin/personal-accounts", { replace: true });
          return;
        }
      }

      // Admin impersonation: load a specific profile by ID
      if (adminViewId) {
        const { data: isAdminData } = await supabase.rpc("is_admin");
        if (isAdminData) {

          const { data: profileData, error: profileError } = await supabase
            .from("personal_profiles")
            .select("*")
            .eq("id", adminViewId)
            .single();

          if (profileError || !profileData) {
            toast.error("Profile not found");
            navigate("/admin/personal-accounts");
            return;
          }

          const normalizedProfile = {
            ...profileData,
            header_type: profileData.header_type || "color",
            header_color: profileData.header_color || "#6BCB77",
            background_color: profileData.background_color || "#ffffff",
            pfp_position: profileData.pfp_position || "center",
          };

          setProfile(normalizedProfile);
          setIsAdminView(true);
          setAdminViewName(`@${profileData.username}`);

          // Fetch all sibling profiles for the same user (multi-profile switcher in admin view)
          const [linksResult, blocksResult, siblingsResult] = await Promise.all([
            supabase
              .from("personal_links")
              .select("*")
              .eq("profile_id", profileData.id)
              .or("is_archived.is.null,is_archived.eq.false")
              .order("sort_order", { ascending: true }),
            supabase
              .from("personal_blocks")
              .select("*")
              .eq("profile_id", profileData.id)
              .or("is_archived.is.null,is_archived.eq.false")
              .order("sort_order", { ascending: true }),
            supabase
              .from("personal_profiles")
              .select("*")
              .eq("user_id", profileData.user_id)
              .order("created_at", { ascending: true }),
          ]);

          setLinks(linksResult.data || []);
          setBlocks(blocksResult.data || []);
          if (siblingsResult.data && siblingsResult.data.length > 1) {
            setAllProfiles(siblingsResult.data.map(p => ({
              ...p,
              header_type: p.header_type || "color",
              header_color: p.header_color || "#6BCB77",
              background_color: p.background_color || "#ffffff",
              pfp_position: p.pfp_position || "center",
            })));
          }
          setLoading(false);
          return;
        }
      }

      // Fetch all profiles for this user (multi-profile support)
      // Include profiles the user owns AND demo profiles they created as a sales rep
      const { data: allProfilesData, error: profileError } = await supabase
        .from("personal_profiles")
        .select("*")
        .or(`user_id.eq.${user.id},sales_rep_id.eq.${user.id},created_by_rep_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (profileError || !allProfilesData || allProfilesData.length === 0) {
        // Sales reps without any demos yet should go back to the partner portal, not onboarding
        const { data: repRow } = await supabase
          .from("sales_reps")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (repRow) {
          navigate("/rep/restaurants");
          return;
        }
        // User is authenticated but has no profile - redirect to onboarding
        navigate("/onboarding");
        return;
      }

      // Select active profile: from URL param, or default to first
      const requestedProfileId = searchParams.get("profile_id");
      const selectedProfile = requestedProfileId
        ? allProfilesData.find(p => p.id === requestedProfileId) || allProfilesData[0]
        : allProfilesData[0];

      const normalizedProfile = {
        ...selectedProfile,
        header_type: selectedProfile.header_type || "color",
        header_color: selectedProfile.header_color || "#6BCB77",
        background_color: selectedProfile.background_color || "#ffffff",
        pfp_position: selectedProfile.pfp_position || "center",
      };

      // Check for expired trial and auto-downgrade
      if (
        normalizedProfile.subscription_status === "trialing" &&
        normalizedProfile.trial_ends_at &&
        new Date(normalizedProfile.trial_ends_at) <= new Date()
      ) {
        await supabase
          .from("personal_profiles")
          .update({ subscription_status: "expired" })
          .eq("id", normalizedProfile.id);
        normalizedProfile.subscription_status = "expired";
      }

      setProfile(normalizedProfile);
      setAllProfiles(allProfilesData.map(p => ({
        ...p,
        header_type: p.header_type || "color",
        header_color: p.header_color || "#6BCB77",
        background_color: p.background_color || "#ffffff",
        pfp_position: p.pfp_position || "center",
      })));

      // Parallel fetch links and blocks - filter out archived content, strictly scoped by profile_id
      const [linksResult, blocksResult] = await Promise.all([
        supabase
          .from("personal_links")
          .select("*")
          .eq("profile_id", selectedProfile.id)
          .or("is_archived.is.null,is_archived.eq.false")
          .order("sort_order", { ascending: true }),
        supabase
          .from("personal_blocks")
          .select("*")
          .eq("profile_id", selectedProfile.id)
          .or("is_archived.is.null,is_archived.eq.false")
          .order("sort_order", { ascending: true }),
      ]);

      setLinks(linksResult.data || []);
      setBlocks(blocksResult.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load your profile");
    } finally {
      setLoading(false);
    }
  }, [navigate, adminViewId, searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Capture welcome param on mount (before profile loads) to avoid race condition
  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      welcomeParamRef.current = true;
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - run once on mount

  // Show welcome tutorial + confetti after profile loads if we had the welcome param
  useEffect(() => {
    if (welcomeParamRef.current && profile) {
      const dismissKey = `tapaway_personal_welcome_dismissed_${profile.id}`;
      const alreadyDismissed = localStorage.getItem(dismissKey);
      
      if (!alreadyDismissed) {
        setShowWelcomeTutorial(true);
        setShowConfetti(true);
        toast.success("Thank you for joining TapAway! 🎉", {
          description: "Start customizing your profile below.",
          duration: 5000,
        });
      }
      welcomeParamRef.current = false;
    }
  }, [profile]);

  // No longer auto-showing card modal

  // Handle upgrade success from URL param
  useEffect(() => {
    const upgradeStatus = searchParams.get("upgrade");
    const sessionId = searchParams.get("session_id");
    
    if (upgradeStatus === "success" && sessionId && profile) {
      // Verify the upgrade
      const verifyUpgrade = async () => {
        try {
          const { data, error } = await supabase.functions.invoke("verify-personal-upgrade", {
            body: { sessionId },
          });
          
          if (error) throw error;
          
          if (data?.success) {
            toast.success("Welcome to Pro! 🎉", {
              description: data.newUsername !== profile.username 
                ? `Your new URL is tapaway.co/${data.newUsername}`
                : "Your upgrade is complete.",
            });
            
            // Reload profile to get updated data
            loadData();
          }
        } catch (err) {
          console.error("Error verifying upgrade:", err);
        } finally {
          // Clear URL params
          setSearchParams({});
        }
      };
      
      verifyUpgrade();
    }
  }, [searchParams, profile, setSearchParams, loadData]);


  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be less than 20MB");
      return;
    }

    // Compress if > 2MB
    let processedFile: Blob = file;
    if (file.size > 2 * 1024 * 1024) {
      try {
        processedFile = await compressImage(file);
      } catch {
        toast.error("Failed to process image");
        return;
      }
    }

    setRawImageUrl(URL.createObjectURL(processedFile));
    setCropperOpen(true);
  };

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!profile) return;

    setUploadingPhoto(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}/${profile.id}/profile.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(filePath);

      // Add cache buster for display; sample from clean URL to avoid CORS
      // caching issues with query strings.
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Determine whether we should auto-match the page background to the
      // bottom edge of this photo (only when using a full-banner header and
      // the user hasn't manually customized the background yet).
      const shouldAutoMatchBg =
        profile.header_type === "banner" &&
        (profile.background_color ?? DEFAULT_HUB_BACKGROUND_COLOR).toLowerCase() ===
          DEFAULT_HUB_BACKGROUND_COLOR;

      let sampledBg: string | null = null;
      if (shouldAutoMatchBg) {
        sampledBg = await sampleBottomEdgeColor(publicUrl);
        if (!sampledBg) {
          console.warn(
            "[banner] sampleBottomEdgeColor returned null — likely CORS or decode failure; leaving background_color as-is",
          );
        }
      }

      // Fold both writes into a single atomic UPDATE so the sampled bg
      // can't be lost to a partial failure or later refetch.
      const updates: Record<string, string> = { profile_photo_url: urlWithCacheBust };
      if (sampledBg) updates.background_color = sampledBg;

      const { data: updatedRow, error: updateError } = await supabase
        .from("personal_profiles")
        .update(updates)
        .eq("id", profile.id)
        .select("profile_photo_url, background_color")
        .single();

      if (updateError) throw updateError;

      setProfile({
        ...profile,
        profile_photo_url: updatedRow?.profile_photo_url ?? urlWithCacheBust,
        background_color: updatedRow?.background_color ?? profile.background_color,
      });

      invalidateProfileCache(profile.username);

      toast.success("Photo updated!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }, [profile]);


  const handleUpgrade = useCallback(async (planType: "monthly" | "yearly") => {
    if (!profile) return;
    
    setUpgrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-personal-upgrade", {
        body: {
          profileId: profile.id,
          email: profile.email,
          planType,
          currentUsername: profile.username,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Error creating upgrade checkout:", err);
      toast.error("Failed to start upgrade. Please try again.");
      setUpgrading(false);
    }
  }, [profile]);

  const copyProfileUrl = useCallback(async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`https://tapaway.co/${profile.username}`);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [profile]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/personal");
  }, [navigate]);

  const handleDesignUpdate = useCallback((updates: {
    headerType?: string;
    headerColor?: string | null;
    headerImageUrl?: string | null;
    backgroundColor?: string | null;
    pfpPosition?: string;
    bannerImageUrl?: string | null;
  }) => {
    if (profile) {
      const updatedProfile = { 
        ...profile, 
        header_type: updates.headerType ?? profile.header_type,
        header_color: updates.headerColor !== undefined ? updates.headerColor : profile.header_color,
        header_image_url: updates.headerImageUrl !== undefined ? updates.headerImageUrl : profile.header_image_url,
        background_color: updates.backgroundColor !== undefined ? updates.backgroundColor : profile.background_color,
        pfp_position: updates.pfpPosition ?? profile.pfp_position,
        banner_image_url: updates.bannerImageUrl !== undefined ? updates.bannerImageUrl : profile.banner_image_url,
      };
      setProfile(updatedProfile);
      
      // Invalidate public profile cache
      invalidateProfileCache(profile.username);
    }
  }, [profile]);

  // Save bar handlers — unified across hero editor + content
  const handleSaveChanges = useCallback(async () => {
    setSaving(true);
    try {
      const saves: Promise<void>[] = [];
      if (heroEditorRef.current?.hasPendingChanges) saves.push(heroEditorRef.current.saveAllChanges());
      if (unifiedContentRef.current?.hasPendingChanges) saves.push(unifiedContentRef.current.saveAllChanges());
      const results = await Promise.allSettled(saves);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        const reason = (failures[0] as PromiseRejectedResult).reason;
        toast.error(reason?.message || "Some changes failed to save");
      } else {
        toast.success("Changes saved!");
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDiscardChanges = useCallback(() => {
    heroEditorRef.current?.discardChanges();
    unifiedContentRef.current?.discardChanges();
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Prepare blocks for preview with proper typing
  const previewBlocks = blocks.map(b => ({
    ...b,
    content: b.content as Record<string, unknown>,
    is_active: b.is_active ?? true,
  }));

  const isRepDemo = !!profile.sales_rep_id && !profile.is_approved;
  const isTrialing = profile.subscription_status === "trialing";
  const pipelineStatus = profile.pipeline_status || "draft";

  const handleSaveDraft = async () => {
    const { error } = await supabase
      .from("personal_profiles")
      .update({ pipeline_status: "draft" } as any)
      .eq("id", profile.id);
    if (error) { toast.error("Failed to save draft"); return; }
    setProfile(p => p ? { ...p, pipeline_status: "draft" } : p);
    toast.success("Draft saved");
  };

  const handleSubmitForReview = async () => {
    // Auto-generate a vanity slug from the business name if the username is
    // still the placeholder "demo-xxxxxx" created at demo-hub spin-up.
    let nextUsername: string | null = null;
    const currentUsername = (profile.username || "").toLowerCase();
    if (currentUsername.startsWith("demo-")) {
      const base = (profile.full_name || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);

      if (base.length >= 2) {
        // Find the first non-colliding variant: base, base-2, base-3, ...
        for (let i = 0; i < 25; i++) {
          const candidate = i === 0 ? base : `${base}-${i + 1}`;
          const { data: available } = await supabase.rpc("is_username_available", {
            check_username: candidate,
          });
          if (available === true) {
            nextUsername = candidate;
            break;
          }
        }
      }
    }

    const updates: Record<string, unknown> = {
      pipeline_status: "ready_for_review",
      submitted_for_review_at: new Date().toISOString(),
    };
    if (nextUsername) updates.username = nextUsername;

    const { error } = await supabase
      .from("personal_profiles")
      .update(updates as any)
      .eq("id", profile.id);
    if (error) { toast.error("Failed to submit"); return; }

    if (nextUsername) {
      setProfile(p => p ? { ...p, username: nextUsername! } : p);
      toast.success(`Sent for approval — public URL will be /${nextUsername}`);
    } else {
      toast.success("Sent to admin for approval");
    }
    navigate("/rep/restaurants");
  };

  const handleRecallDraft = async () => {
    const { error } = await supabase
      .from("personal_profiles")
      .update({ pipeline_status: "draft", submitted_for_review_at: null } as any)
      .eq("id", profile.id);
    if (error) { toast.error("Failed to recall"); return; }
    setProfile(p => p ? { ...p, pipeline_status: "draft", submitted_for_review_at: null } : p);
    toast.success("Pulled back to draft");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}
      {isAdminView && (
        <AdminViewBanner name={adminViewName} backTo="/admin/personal-accounts" />
      )}

      {/* Rep-demo editing banner */}
      {isRepDemo && (
        <div className="sticky top-0 z-[55] bg-emerald-500/10 border-b border-emerald-500/30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                Editing demo hub
              </span>
              <span className="text-sm font-medium text-foreground truncate">
                {profile.full_name}
              </span>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                pipelineStatus === "ready_for_review" && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                pipelineStatus === "draft" && "bg-white/10 text-muted-foreground",
                pipelineStatus === "approved" && "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
              )}>
                {pipelineStatus === "ready_for_review" ? "Ready for review" : pipelineStatus === "approved" ? "Approved" : "Draft"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pipelineStatus === "ready_for_review" ? (
                <>
                  <span className="text-xs text-muted-foreground hidden sm:inline">Awaiting admin approval</span>
                  <Button size="sm" variant="outline" onClick={handleRecallDraft}>
                    Recall to draft
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleSaveDraft}>
                    Save draft
                  </Button>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]" onClick={handleSubmitForReview}>
                    Submit for review
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
            <div className="flex items-center gap-2">
               {allProfiles.length > 1 && (
                 <span className="text-xs text-muted-foreground hidden md:inline">
                   @{profile.username}
                 </span>
               )}
              {isSalesRep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/rep/restaurants")}
                  className="border-emerald-400/30 bg-emerald-400/10 text-emerald-700 hover:bg-emerald-400/15 dark:text-emerald-200"
                >
                  <ArrowLeftRight className="h-4 w-4 mr-1" />
                  Partner Portal
                </Button>
              )}
              {isAffiliate && (
                <Button variant="outline" size="sm" onClick={() => navigate("/affiliate")}>
                  <Users className="h-4 w-4 mr-1" />
                  Affiliate
                </Button>
              )}
              
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-10 w-10">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Dashboard + Preview Panel */}
      <div className="max-w-7xl mx-auto flex overflow-x-hidden">
        {/* Dashboard Content */}
        <main className="flex-1 max-w-2xl px-4 py-6 pb-24 md:pb-8 w-full overflow-x-hidden">
          {/* Profile Header */}
          <div 
            id="profile-header" 
            className={cn(
              "flex items-center gap-4 mb-6 rounded-lg p-2 -m-2 transition-all",
              coachHighlight === "welcome" && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative h-16 w-16 rounded-full overflow-hidden group flex-shrink-0"
            >
              {profile.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-xl font-bold text-muted-foreground">
                    {profile.full_name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingPhoto ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg text-foreground">{profile.full_name}</h1>
              <button
                id="profile-url"
                onClick={copyProfileUrl}
                className={cn(
                  "flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors",
                  coachHighlight === "share" && "ring-2 ring-primary ring-offset-2 rounded px-1 -mx-1"
                )}
              >
                tapaway.co/{profile.username}
                {copied ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              {/* Trial badge for referred users */}
              {profile.referred_by && profile.subscription_status === "trialing" && profile.trial_ends_at && (
                (() => {
                  const daysLeft = Math.max(0, Math.ceil((new Date(profile.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        <Star className="h-3 w-3 inline mr-1" />
                        Pro Trial · {daysLeft}d left
                      </span>
                      <span className="text-xs text-muted-foreground">
                        via @{profile.referred_by}
                      </span>
                    </div>
                  );
                })()
              )}
              {/* Trial expired message */}
              {profile.referred_by && profile.subscription_status !== "trialing" && profile.subscription_status !== "active" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Your free trial has ended.{" "}
                  <button onClick={() => handleUpgrade("yearly")} className="text-primary underline">
                    Upgrade to Pro
                  </button>
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/${profile.username}`, "_blank")}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="space-y-6">
          <TabsList className={cn("hidden md:grid w-full", isTrialing ? "grid-cols-7" : "grid-cols-9")}>
            <TabsTrigger 
              id="tab-links"
              value="links" 
              className={cn(
                "flex items-center gap-2",
                coachHighlight === "links" && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger 
              id="tab-design"
              value="design" 
              className={cn(
                "flex items-center gap-2",
                coachHighlight === "design" && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Leads</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">SMS</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Shop</span>
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
            {!isTrialing && (
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
            )}
            {!isTrialing && allProfiles.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                    <ArrowLeftRight className="h-4 w-4" />
                    Switch Profile
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {allProfiles.filter(p => p.id !== profile.id).map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => {
                        if (isAdminView) {
                          setSearchParams({ admin_view_personal: p.id });
                        } else {
                          setSearchParams({ profile_id: p.id });
                        }
                        setLoading(true);
                        loadData();
                      }}
                    >
                      @{p.username}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TabsList>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-6">
            {/* Hero Editor */}
            <DashboardHeroEditor
              ref={heroEditorRef}
              profileId={profile.id}
              username={profile.username}
              fullName={profile.full_name}
              headline={profile.headline}
              bio={profile.bio}
              planType={profile.plan_type}
              showUsername={profile.show_username ?? true}
              onUpdate={(updates) => setProfile(prev => prev ? { ...prev, ...updates } : null)}
              onPendingChangesChange={setHeroHasPending}
            />
            
            <div className="border-t pt-6">
              <DashboardUnifiedContent
                ref={unifiedContentRef}
                profileId={profile.id}
                username={profile.username}
                links={links}
                blocks={blocks}
                onLinksChange={setLinks}
                onBlocksChange={setBlocks}
                onPendingChangesChange={setHasPendingChanges}
                onDiscardRequest={loadData}
                planType={profile.plan_type}
                onUpgrade={() => handleUpgrade("yearly")}
              />
             </div>


             {/* Mobile preview is now a floating FAB + drawer */}
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            <DashboardDesignTab
              profileId={profile.id}
              headerType={profile.header_type}
              headerColor={profile.header_color}
              headerImageUrl={profile.header_image_url}
              backgroundColor={profile.background_color}
              profilePhotoUrl={profile.profile_photo_url}
              isPremium={profile.plan_type !== 'free' && profile.plan_type !== null}
              isFoundingUser={profile.is_founding_user}
              showFoundingBadge={profile.show_founding_badge}
              isRepDemo={isRepDemo}
              onUpgrade={() => handleUpgrade("yearly")}
              onUpdate={handleDesignUpdate}
            />

            {/* Contact Card Settings */}
            <div className="border-t pt-6">
              <DashboardContactCard
                profileId={profile.id}
                username={profile.username}
                fullName={profile.full_name}
                email={profile.email}
                profilePhotoUrl={profile.profile_photo_url}
                initialSettings={{
                  contact_enabled: profile.contact_enabled || false,
                  contact_name: profile.contact_name,
                  contact_email: profile.contact_email,
                  contact_photo_url: profile.contact_photo_url,
                  contact_phone: profile.contact_phone,
                  contact_company: profile.contact_company,
                  contact_title: profile.contact_title,
                  contact_address: profile.contact_address,
                  contact_website: profile.contact_website,
                  contact_display_style: profile.contact_display_style,
                  contact_button_label: profile.contact_button_label,
                }}
                onUpdate={() => loadData()}
                onDisplayStyleChange={(style) => setProfile(prev => prev ? { ...prev, contact_display_style: style } : null)}
              />
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            <EmailLeadsTab profileId={profile.id} />
          </TabsContent>

          {/* SMS Marketing Tab */}
          <TabsContent value="sms" className="space-y-4">
            <SmsMarketingTab profileId={profile.id} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <AdvancedAnalyticsTab
              profileId={profile.id}
              planType={profile.plan_type}
              subscriptionStatus={profile.subscription_status}
              onUpgrade={() => handleUpgrade("yearly")}
            />
          </TabsContent>



          {/* Shop Tab */}
          <TabsContent value="shop" className="space-y-4">
            <PersonalShopTab 
              profileId={profile.id}
              userId={profile.user_id}
              stripeConnectAccountId={(profile as any).stripe_connect_account_id || null}
              isStripeOnboarded={(profile as any).is_stripe_onboarded || false}
              onProfileUpdate={loadData}
              planType={profile.plan_type}
              isTrialing={isTrialing}
            />
          </TabsContent>

          {/* Plan Tab */}
          <TabsContent value="plan" className="space-y-4">
            <PersonalBillingTab
              profile={{
                id: profile.id,
                plan_type: profile.plan_type,
                subscription_status: profile.subscription_status,
                stripe_customer_id: profile.stripe_customer_id,
                stripe_subscription_id: profile.stripe_subscription_id,
                trial_ends_at: profile.trial_ends_at,
                stripe_billing_email: profile.stripe_billing_email,
                email: profile.email,
              }}
              onUpgrade={() => handleUpgrade("monthly")}
              onPlanChange={loadData}
            />
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="space-y-4">
            <CardsTab
              profileId={profile.id}
              userId={profile.user_id}
              hasCardAddon={profile.has_card_addon || false}
              planType={profile.plan_type}
              stripeCustomerId={profile.stripe_customer_id}
              fullName={profile.full_name}
            />
          </TabsContent>
        </Tabs>
      </main>

        {/* Desktop Preview Panel */}
        <aside className="hidden xl:block w-[340px] sticky top-20 h-[calc(100vh-5rem)] py-6 pr-4">
          <ProfilePreviewPanel
            profile={profile}
            links={links}
            blocks={previewBlocks}
          />
        </aside>
      </div>

      {/* Mobile Preview FAB */}
      <button
        onClick={() => setMobilePreviewOpen(true)}
        className="xl:hidden fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Preview profile"
      >
        <Smartphone className="h-6 w-6" />
      </button>

      {/* Mobile Preview Drawer */}
      <Drawer open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
        <DrawerContent className="max-h-[92vh]" showHandle={true}>
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-sm font-semibold">Live Preview</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 pb-8 flex justify-center">
            <ProfilePreviewPanel
              profile={profile}
              links={links}
              blocks={previewBlocks}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        hasPendingChanges={hasPendingChanges || heroHasPending}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
        saving={saving}
      />

      {/* Image Cropper */}
      {rawImageUrl && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={rawImageUrl}
          onCropComplete={handleCropComplete}
        />
      )}


      {/* Welcome Coach Marks */}
      <WelcomeCoachMarks
        active={showWelcomeTutorial}
        onComplete={() => {
          localStorage.setItem(`tapaway_personal_welcome_dismissed_${profile.id}`, 'true');
          setShowWelcomeTutorial(false);
          setCoachHighlight(null);
        }}
        highlightedStep={coachHighlight}
        onHighlightChange={setCoachHighlight}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAffiliate={isAffiliate}
        allProfiles={allProfiles.map(p => ({ id: p.id, username: p.username }))}
        activeProfileId={profile.id}
        onSwitchProfile={(profileId) => {
          if (isAdminView) {
            setSearchParams({ admin_view_personal: profileId });
          } else {
            setSearchParams({ profile_id: profileId });
          }
          setLoading(true);
          loadData();
        }}
        isTrialing={isTrialing}
      />

    </div>
  );
};

export default memo(PersonalDashboard);
