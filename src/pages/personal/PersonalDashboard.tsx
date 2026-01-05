import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Palette
} from "lucide-react";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { TapAwayCardPreview } from "@/components/personal/TapAwayCardPreview";
import { DashboardUnifiedContent } from "@/components/personal/DashboardUnifiedContent";
import { DashboardDesignTab } from "@/components/personal/DashboardDesignTab";
import { DashboardHeroEditor } from "@/components/personal/DashboardHeroEditor";
import { DashboardSwitcher } from "@/components/dashboard/DashboardSwitcher";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { compressImage } from "@/lib/imageOptimization";

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
}

interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  sort_order: number;
  alignment: string | null;
}

type TimeRange = "7d" | "30d" | "all";

const PersonalDashboard = () => {
  const navigate = useNavigate();
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyticsLoadedRef = useRef(false);

  // Load profile data - optimized with parallel fetches
  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/personal/signup");
        return;
      }

      // Single profile query
      const { data: profileData, error: profileError } = await supabase
        .from("personal_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
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

      // Parallel fetch links and blocks
      const [linksResult, blocksResult] = await Promise.all([
        supabase
          .from("personal_links")
          .select("*")
          .eq("profile_id", profileData.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("personal_blocks")
          .select("*")
          .eq("profile_id", profileData.id)
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

  // compressImage moved to lib/imageOptimization.ts - imported at top

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
      
      // Invalidate public profile cache
      invalidateProfileCache(profile.username);
      
      toast.success("Photo updated!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
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
  }) => {
    if (profile) {
      const updatedProfile = { 
        ...profile, 
        header_type: updates.headerType ?? profile.header_type,
        header_color: updates.headerColor !== undefined ? updates.headerColor : profile.header_color,
        header_image_url: updates.headerImageUrl !== undefined ? updates.headerImageUrl : profile.header_image_url,
        background_color: updates.backgroundColor !== undefined ? updates.backgroundColor : profile.background_color,
        pfp_position: updates.pfpPosition ?? profile.pfp_position,
      };
      setProfile(updatedProfile);
      
      // Invalidate public profile cache
      invalidateProfileCache(profile.username);
    }
  }, [profile]);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
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

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
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
              onClick={copyProfileUrl}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        <Tabs defaultValue="links" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Design</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Card</span>
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
              pfpPosition={profile.pfp_position}
              onUpdate={(updates) => setProfile(prev => prev ? { ...prev, ...updates } : null)}
            />
            
            <div className="border-t pt-6">
              <DashboardUnifiedContent
                profileId={profile.id}
                links={links}
                blocks={blocks}
                onLinksChange={setLinks}
                onBlocksChange={setBlocks}
              />
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4">
            <DashboardDesignTab
              profileId={profile.id}
              headerType={profile.header_type}
              headerColor={profile.header_color}
              headerImageUrl={profile.header_image_url}
              backgroundColor={profile.background_color}
              pfpPosition={profile.pfp_position}
              onUpdate={handleDesignUpdate}
            />
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
            <TapAwayCardPreview
              fullName={profile.full_name}
              username={profile.username}
              profilePhotoUrl={profile.profile_photo_url}
            />
            <p className="text-sm text-muted-foreground text-center">
              Your TapAway card is connected to your profile
            </p>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Cropper */}
      {rawImageUrl && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={rawImageUrl}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export default memo(PersonalDashboard);
