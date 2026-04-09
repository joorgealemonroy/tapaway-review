import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
} from "lucide-react";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { DashboardUnifiedContent, DashboardUnifiedContentHandle } from "@/components/personal/DashboardUnifiedContent";
import { DashboardDesignTab } from "@/components/personal/DashboardDesignTab";
import { DashboardHeroEditor } from "@/components/personal/DashboardHeroEditor";
import { DashboardSwitcher } from "@/components/dashboard/DashboardSwitcher";
import { ProfilePreviewPanel } from "@/components/personal/ProfilePreviewPanel";
import { UnsavedChangesBar } from "@/components/personal/UnsavedChangesBar";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { compressImage } from "@/lib/imageOptimization";
import EmailLeadsTab from "@/components/personal/EmailLeadsTab";
import { AdvancedAnalyticsTab } from "@/components/personal/AdvancedAnalyticsTab";
import { DashboardContactCard } from "@/components/personal/DashboardContactCard";
import { PersonalBillingTab } from "@/components/personal/PersonalBillingTab";
import { PersonalShopTab } from "@/components/personal/PersonalShopTab";

import { WelcomeCoachMarks } from "@/components/personal/WelcomeCoachMarks";
import { ConfettiEffect } from "@/components/personal/ConfettiEffect";
import { useAffiliateAccess } from "@/hooks/useAffiliateAccess";
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
  const [upgrading, setUpgrading] = useState(false);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "links");
  const [coachHighlight, setCoachHighlight] = useState<string | null>(null);
  const welcomeParamRef = useRef<boolean>(false);
  const [showConfetti, setShowConfetti] = useState(false);

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

          const [linksResult, blocksResult] = await Promise.all([
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
          ]);

          setLinks(linksResult.data || []);
          setBlocks(blocksResult.data || []);
          setLoading(false);
          return;
        }
      }

      // Fetch all profiles for this user (multi-profile support)
      const { data: allProfilesData, error: profileError } = await supabase
        .from("personal_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (profileError || !allProfilesData || allProfilesData.length === 0) {
        // User is authenticated but has no profile - redirect to paywall to choose account type
        navigate("/paywall");
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

      // Add cache buster
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("personal_profiles")
        .update({ profile_photo_url: urlWithCacheBust })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_photo_url: urlWithCacheBust });
      
      // If this was a regular photo edit, just proceed
      if (profile) {
        invalidateProfileCache(profile.username);
      }
      
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

  // Save bar handlers
  const handleSaveChanges = useCallback(async () => {
    if (!unifiedContentRef.current) return;
    setSaving(true);
    try {
      await unifiedContentRef.current.saveAllChanges();
    } finally {
      setSaving(false);
    }
  }, []);

  const handleDiscardChanges = useCallback(() => {
    if (!unifiedContentRef.current) return;
    unifiedContentRef.current.discardChanges();
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-full">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}
      {isAdminView && (
        <AdminViewBanner name={adminViewName} backTo="/admin/personal-accounts" />
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
              {isAffiliate && (
                <Button variant="outline" size="sm" onClick={() => navigate("/affiliate")}>
                  <Users className="h-4 w-4 mr-1" />
                  Affiliate
                </Button>
              )}
              <DashboardSwitcher currentType="personal" />
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
          <TabsList className="hidden md:grid w-full grid-cols-7">
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
            {allProfiles.length > 1 && (
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
                        setSearchParams({ profile_id: p.id });
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
              profileId={profile.id}
              username={profile.username}
              fullName={profile.full_name}
              headline={profile.headline}
              bio={profile.bio}
              planType={profile.plan_type}
              onUpdate={(updates) => setProfile(prev => prev ? { ...prev, ...updates } : null)}
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

            {/* Mobile Live Preview */}
            <div className="xl:hidden border-t pt-6">
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-foreground">
                  Your Profile Preview
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This is exactly how your profile looks to visitors
                </p>
              </div>
              <div className="flex justify-center">
                <ProfilePreviewPanel
                  profile={profile}
                  links={links}
                  blocks={previewBlocks}
                />
              </div>
            </div>
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
                }}
                onUpdate={() => loadData()}
              />
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-4">
            <EmailLeadsTab profileId={profile.id} />
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

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        hasPendingChanges={hasPendingChanges}
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
          setSearchParams({ profile_id: profileId });
          setLoading(true);
          loadData();
        }}
      />

    </div>
  );
};

export default memo(PersonalDashboard);
