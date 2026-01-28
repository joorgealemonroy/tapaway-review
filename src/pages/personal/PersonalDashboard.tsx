import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Link2, 
  BarChart3, 
  CreditCard,
  LogOut,
  Camera,
  Loader2,
  Eye,
  Copy,
  Check,
  Palette,
  Smartphone,
  Mail,
  Lock,
  Sparkles,
  Star
} from "lucide-react";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { TapAwayCardPreview, TapAwayCardPreviewHandle } from "@/components/personal/TapAwayCardPreview";
import { DashboardUnifiedContent, DashboardUnifiedContentHandle } from "@/components/personal/DashboardUnifiedContent";
import { DashboardDesignTab } from "@/components/personal/DashboardDesignTab";
import { DashboardHeroEditor } from "@/components/personal/DashboardHeroEditor";
import { DashboardSwitcher } from "@/components/dashboard/DashboardSwitcher";
import { ProfilePreviewPanel } from "@/components/personal/ProfilePreviewPanel";
import { UnsavedChangesBar } from "@/components/personal/UnsavedChangesBar";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { compressImage } from "@/lib/imageOptimization";
import EmailLeadsTab from "@/components/personal/EmailLeadsTab";
import { DashboardContactCard } from "@/components/personal/DashboardContactCard";
import { PersonalBillingTab } from "@/components/personal/PersonalBillingTab";
import { WelcomeCoachMarks } from "@/components/personal/WelcomeCoachMarks";
import { cn } from "@/lib/utils";

interface PersonalProfile {
  id: string;
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

type TimeRange = "7d" | "30d" | "all";

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [links, setLinks] = useState<DbPersonalLink[]>([]);
  const [blocks, setBlocks] = useState<PersonalBlock[]>([]);
  const [analytics, setAnalytics] = useState<Record<TimeRange, number>>({
    "7d": 0,
    "30d": 0,
    "all": 0,
  });
  const [copied, setCopied] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewSheetOpen, setPreviewSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyticsLoadedRef = useRef(false);
  const unifiedContentRef = useRef<DashboardUnifiedContentHandle>(null);
  const cardPreviewRef = useRef<TapAwayCardPreviewHandle>(null);
  const cardModalPreviewRef = useRef<TapAwayCardPreviewHandle>(null);
  const [sendingCardApproval, setSendingCardApproval] = useState(false);
  const [showCardConfirmModal, setShowCardConfirmModal] = useState(false);
  const [editableCardName, setEditableCardName] = useState("");
  const [editableFrontHeadline, setEditableFrontHeadline] = useState("");
  const [editableBackText, setEditableBackText] = useState("");
  const [editableCardPhotoUrl, setEditableCardPhotoUrl] = useState<string | null>(null);
  const [isCardPhotoEdit, setIsCardPhotoEdit] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState("links");
  const [coachHighlight, setCoachHighlight] = useState<string | null>(null);
  const welcomeParamRef = useRef<boolean>(false);

  // Load profile data - optimized with parallel fetches
  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not authenticated - redirect to auth page, NOT signup
        navigate("/auth?redirect=/personal/dashboard");
        return;
      }

      // Single profile query
      const { data: profileData, error: profileError } = await supabase
        .from("personal_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        // User is authenticated but has no profile - this is the only case for signup
        navigate("/personal/signup");
        return;
      }

      const normalizedProfile = {
        ...profileData,
        header_type: profileData.header_type || "color",
        header_color: profileData.header_color || "#6BCB77",
        background_color: profileData.background_color || "#ffffff",
        pfp_position: profileData.pfp_position || "left",
      };

      setProfile(normalizedProfile);

      // Parallel fetch links and blocks - filter out archived content
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
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load your profile");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

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

  // Show welcome tutorial after profile loads if we had the welcome param
  useEffect(() => {
    if (welcomeParamRef.current && profile) {
      const dismissKey = `tapaway_personal_welcome_dismissed_${profile.id}`;
      const alreadyDismissed = localStorage.getItem(dismissKey);
      
      if (!alreadyDismissed) {
        setShowWelcomeTutorial(true);
      }
      welcomeParamRef.current = false;
    }
  }, [profile]);

  // Initialize card modal editable fields when profile loads (but don't auto-show)
  useEffect(() => {
    if (profile && !profile.card_confirmed && profile.plan_type && profile.plan_type !== "free") {
      setEditableCardName(profile.full_name);
      setEditableFrontHeadline(profile.card_front_headline || "Tap to Connect\n& Collaborate");
      setEditableBackText(profile.card_back_text || "Tap to Connect");
      setEditableCardPhotoUrl(null);
    }
  }, [profile]);

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

  // Load analytics lazily after initial render
  useEffect(() => {
    if (profile && !analyticsLoadedRef.current) {
      analyticsLoadedRef.current = true;
      // Defer analytics loading
      const timer = setTimeout(() => loadAllAnalytics(), 100);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  const loadAllAnalytics = useCallback(async () => {
    if (!profile) return;

    const ranges: TimeRange[] = ["7d", "30d", "all"];
    const results: Record<TimeRange, number> = { "7d": 0, "30d": 0, "all": 0 };

    // Parallel analytics queries
    const promises = ranges.map(async (range) => {
      let startDate = new Date();
      switch (range) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "all":
          startDate = new Date(0);
          break;
      }

      const { count } = await supabase
        .from("personal_analytics")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .gte("created_at", startDate.toISOString());

      return { range, count: count || 0 };
    });

    const counts = await Promise.all(promises);
    counts.forEach(({ range, count }) => {
      results[range] = count;
    });

    setAnalytics(results);
  }, [profile]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Allow up to 15MB, compress if needed
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be less than 15MB");
      return;
    }

    // Compress if > 5MB
    let processedFile: Blob = file;
    if (file.size > 5 * 1024 * 1024) {
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

      const filePath = `${user.id}/profile.jpg`;

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
      
      // If this was a card photo edit, update the editable card photo URL
      if (isCardPhotoEdit) {
        setEditableCardPhotoUrl(urlWithCacheBust);
        setIsCardPhotoEdit(false);
      }
      
      // Invalidate public profile cache
      invalidateProfileCache(profile.username);
      
      toast.success("Photo updated!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }, [profile, isCardPhotoEdit]);

  const handleModalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsCardPhotoEdit(true);
    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
  };

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

  const handleOpenPreview = useCallback(() => {
    setPreviewSheetOpen(true);
  }, []);

  const handleConfirmCardDesign = useCallback(async (fromModal = false) => {
    const previewRef = fromModal ? cardModalPreviewRef : cardPreviewRef;
    if (!profile || !previewRef.current) return;

    setSendingCardApproval(true);
    try {
      // Capture both sides of the card
      const { front, back } = await previewRef.current.captureScreenshots();

      // First update the profile with card text settings and confirmation
      const cardFrontHeadline = fromModal ? editableFrontHeadline : (profile.card_front_headline || "Tap to Connect\n& Collaborate");
      const cardBackText = fromModal ? editableBackText : (profile.card_back_text || "Tap to Connect");
      const cardName = fromModal ? editableCardName : profile.full_name;

      const { error: updateError } = await supabase
        .from("personal_profiles")
        .update({
          card_confirmed: true,
          card_confirmed_at: new Date().toISOString(),
          card_front_headline: cardFrontHeadline,
          card_back_text: cardBackText,
          full_name: cardName,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      // Send to edge function
      const response = await supabase.functions.invoke("send-card-approval", {
        body: {
          fullName: cardName,
          username: profile.username,
          email: profile.email,
          profileId: profile.id,
          frontImageBase64: front,
          backImageBase64: back,
          cardHeadline: cardFrontHeadline,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Update local state
      setProfile({
        ...profile,
        card_confirmed: true,
        card_confirmed_at: new Date().toISOString(),
        card_front_headline: cardFrontHeadline,
        card_back_text: cardBackText,
        full_name: cardName,
      });
      
      setShowCardConfirmModal(false);
      
      toast.success("Card design confirmed! We'll start printing soon.", {
        description: "You'll receive an email when your card ships.",
      });
    } catch (err) {
      console.error("Error sending card approval:", err);
      toast.error("Failed to confirm card design. Please try again.");
    } finally {
      setSendingCardApproval(false);
    }
  }, [profile, editableCardName, editableFrontHeadline, editableBackText]);

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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
            <div className="flex items-center gap-2">
              <DashboardSwitcher currentType="personal" />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Dashboard + Preview Panel */}
      <div className="max-w-7xl mx-auto flex overflow-x-hidden">
        {/* Dashboard Content */}
        <main className="flex-1 max-w-2xl px-4 py-6 pb-32 w-full overflow-x-hidden">
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
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
            <TabsTrigger value="card" className="flex items-center gap-2 relative">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Card</span>
              {!profile.card_confirmed && profile.plan_type && profile.plan_type !== "free" && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
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
              />
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
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Last 7 days", key: "7d" as TimeRange },
                { label: "Last 30 days", key: "30d" as TimeRange },
                { label: "All time", key: "all" as TimeRange },
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-4 bg-card rounded-xl border border-border"
                >
                  <p className="text-2xl font-bold text-foreground">{analytics[item.key]}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Profile visits
            </p>
          </TabsContent>

          {/* Card Tab */}
          <TabsContent value="card" className="space-y-4">
            {profile.card_confirmed ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-sm text-primary">
                  <Lock className="h-4 w-4" />
                  <span>Your card design is confirmed and being printed</span>
                </div>
                <TapAwayCardPreview
                  ref={cardPreviewRef}
                  fullName={profile.full_name}
                  username={profile.username}
                  profilePhotoUrl={profile.profile_photo_url}
                  cardHeadline={profile.card_front_headline || undefined}
                  cardBackText={profile.card_back_text || undefined}
                />
              </>
            ) : profile.plan_type === "free" ? (
              <div className="text-center py-8 space-y-6">
                <div className="space-y-2">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Get Your Custom NFC Card</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Upgrade to Pro to get a personalized TapAway card and remove the "tap" prefix from your URL
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 space-y-3 border border-primary/20">
                  <div className="flex items-center justify-center gap-2 text-primary font-medium">
                    <Star className="h-4 w-4 fill-primary" />
                    <span>Pro Benefits</span>
                  </div>
                  <ul className="text-sm text-left space-y-2 max-w-xs mx-auto">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Custom NFC card with your photo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Clean URL (no "tap" prefix)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Unlimited links & blocks</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Email lead capture</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => handleUpgrade("yearly")}
                    disabled={upgrading}
                    className="relative"
                  >
                    {upgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Yearly — $99/year
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">Save 8%</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpgrade("monthly")}
                    disabled={upgrading}
                  >
                    Monthly — $9/mo
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <TapAwayCardPreview
                  ref={cardPreviewRef}
                  fullName={profile.full_name}
                  username={profile.username}
                  profilePhotoUrl={profile.profile_photo_url}
                  cardHeadline={profile.card_front_headline || undefined}
                  cardBackText={profile.card_back_text || undefined}
                />
                <Button
                  onClick={() => handleConfirmCardDesign(false)}
                  disabled={sendingCardApproval}
                  className="w-full"
                  size="lg"
                >
                  {sendingCardApproval ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirm This is My Card Design
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Once confirmed, we'll print and ship your card
                </p>
              </>
            )}
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

      {/* Mobile Preview Button + Sheet */}
      <Sheet open={previewSheetOpen} onOpenChange={setPreviewSheetOpen}>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 xl:hidden rounded-full h-14 w-14 shadow-lg z-40"
            size="icon"
            style={{ bottom: hasPendingChanges ? "7rem" : "1.5rem" }}
          >
            <Smartphone className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          <div className="flex justify-center pt-4 pb-8 overflow-y-auto h-full">
            <ProfilePreviewPanel
              profile={profile}
              links={links}
              blocks={previewBlocks}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Bar */}
      <UnsavedChangesBar
        hasPendingChanges={hasPendingChanges}
        onPreview={handleOpenPreview}
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

      {/* Card Confirmation Modal */}
      <Dialog open={showCardConfirmModal} onOpenChange={setShowCardConfirmModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Your Card Design</DialogTitle>
            <DialogDescription>
              Review and customize your TapAway card before we print it. You won't be able to change it after confirmation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Editable Photo */}
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <button
                onClick={() => modalFileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden mx-auto group block"
              >
                {(editableCardPhotoUrl || profile.profile_photo_url) ? (
                  <img 
                    src={editableCardPhotoUrl || profile.profile_photo_url || ""} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-xl font-bold text-muted-foreground">{editableCardName.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <input
                ref={modalFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleModalPhotoSelect}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground text-center">Click to change</p>
            </div>

            {/* Editable Name */}
            <div className="space-y-2">
              <Label htmlFor="cardName">Name on Card</Label>
              <Input
                id="cardName"
                value={editableCardName}
                onChange={(e) => setEditableCardName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            {/* Editable Front Headline */}
            <div className="space-y-2">
              <Label htmlFor="frontHeadline">Front Text</Label>
              <Input
                id="frontHeadline"
                value={editableFrontHeadline.replace("\n", " ")}
                onChange={(e) => setEditableFrontHeadline(e.target.value)}
                placeholder="Tap to Connect & Collaborate"
              />
              <p className="text-xs text-muted-foreground">Text shown below your photo</p>
            </div>

            {/* Editable Back Text */}
            <div className="space-y-2">
              <Label htmlFor="backText">Back Text</Label>
              <Input
                id="backText"
                value={editableBackText}
                onChange={(e) => setEditableBackText(e.target.value)}
                placeholder="Tap to Connect"
              />
              <p className="text-xs text-muted-foreground">Text shown with QR code on back</p>
            </div>

            {/* Live Preview */}
            <div className="pt-2">
              <Label className="mb-2 block">Preview</Label>
              <TapAwayCardPreview
                ref={cardModalPreviewRef}
                fullName={editableCardName}
                username={profile.username}
                profilePhotoUrl={editableCardPhotoUrl || profile.profile_photo_url}
                cardHeadline={editableFrontHeadline}
                cardBackText={editableBackText}
              />
            </div>

            <Button
              onClick={() => handleConfirmCardDesign(true)}
              disabled={sendingCardApproval || !editableCardName.trim()}
              className="w-full"
              size="lg"
            >
              {sendingCardApproval ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm & Print My Card
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              ⚠️ Your card design cannot be changed after confirmation
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

export default memo(PersonalDashboard);
