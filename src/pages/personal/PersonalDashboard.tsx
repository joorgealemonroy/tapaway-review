import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Link2, 
  BarChart3, 
  CreditCard,
  LogOut,
  Plus,
  GripVertical,
  Trash2,
  Camera,
  Loader2,
  Eye,
  Copy,
  Check,
  Edit
} from "lucide-react";
import { LinkModal } from "@/components/personal/LinkModal";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { TapAwayCardPreview } from "@/components/personal/TapAwayCardPreview";
import { getPlatformConfig } from "@/lib/platformLinks";
import { PersonalLink } from "@/hooks/usePersonalOnboarding";

interface PersonalProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
}

interface DbPersonalLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
  sort_order: number;
}

type TimeRange = "3d" | "7d" | "30d" | "12m" | "all";

const PersonalDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [links, setLinks] = useState<DbPersonalLink[]>([]);
  const [analytics, setAnalytics] = useState<Record<TimeRange, number>>({
    "3d": 0,
    "7d": 0,
    "30d": 0,
    "12m": 0,
    "all": 0,
  });
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<PersonalLink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profile) {
      loadAllAnalytics();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/personal/signup");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("personal_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        navigate("/personal/signup");
        return;
      }

      setProfile(profileData);

      const { data: linksData } = await supabase
        .from("personal_links")
        .select("*")
        .eq("profile_id", profileData.id)
        .order("sort_order", { ascending: true });

      setLinks(linksData || []);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load your profile");
    } finally {
      setLoading(false);
    }
  };

  const loadAllAnalytics = async () => {
    if (!profile) return;

    const ranges: TimeRange[] = ["3d", "7d", "30d", "12m", "all"];
    const results: Record<TimeRange, number> = { "3d": 0, "7d": 0, "30d": 0, "12m": 0, "all": 0 };

    for (const range of ranges) {
      let startDate = new Date();
      switch (range) {
        case "3d":
          startDate.setDate(startDate.getDate() - 3);
          break;
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "12m":
          startDate.setMonth(startDate.getMonth() - 12);
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

      results[range] = count || 0;
    }

    setAnalytics(results);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob, previewUrl: string) => {
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
      toast.success("Photo updated!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddLink = async (link: Omit<PersonalLink, "id">) => {
    if (!profile) return;

    setSavingLinks(true);
    try {
      const newLink = {
        profile_id: profile.id,
        link_type: link.type,
        label: link.label,
        url: link.url,
        sort_order: links.length,
      };

      const { data, error } = await supabase
        .from("personal_links")
        .insert(newLink)
        .select()
        .single();

      if (error) throw error;

      setLinks([...links, data]);
      setLinkModalOpen(false);
      toast.success("Link added!");
    } catch (err) {
      console.error("Error adding link:", err);
      toast.error("Failed to add link");
    } finally {
      setSavingLinks(false);
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<PersonalLink>) => {
    setSavingLinks(true);
    try {
      const { error } = await supabase
        .from("personal_links")
        .update({
          link_type: updates.type,
          label: updates.label,
          url: updates.url,
        })
        .eq("id", id);

      if (error) throw error;

      setLinks(links.map(l => 
        l.id === id 
          ? { ...l, link_type: updates.type || l.link_type, label: updates.label || l.label, url: updates.url || l.url }
          : l
      ));
      setLinkModalOpen(false);
      setEditingLink(null);
      toast.success("Link updated!");
    } catch (err) {
      console.error("Error updating link:", err);
      toast.error("Failed to update link");
    } finally {
      setSavingLinks(false);
    }
  };

  const removeLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLinks(links.filter(l => l.id !== id));
      setDeleteId(null);
      toast.success("Link removed");
    } catch (err) {
      console.error("Error removing link:", err);
      toast.error("Failed to remove link");
    }
  };

  const copyProfileUrl = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(`https://tapaway.co/${profile.username}`);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/personal");
  };

  const convertToPersonalLink = (dbLink: DbPersonalLink): PersonalLink => ({
    id: dbLink.id,
    type: dbLink.link_type,
    label: dbLink.label,
    value: getPlatformConfig(dbLink.link_type)?.extractValue(dbLink.url) || dbLink.url,
    url: dbLink.url,
  });

  const existingTypes = links.map(l => l.link_type);

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
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
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
            className="relative h-16 w-16 rounded-full overflow-hidden group"
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
          <div className="flex-1">
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
            onClick={() => window.open(`/u/${profile.username}`, "_blank")}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="links" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="links" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Card</span>
            </TabsTrigger>
          </TabsList>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-4">
            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link) => {
                  const config = getPlatformConfig(link.link_type);
                  const Icon = config?.icon;
                  
                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${config?.gradient || config?.bgColor || "bg-primary/10"}`}>
                        {Icon && <Icon className={`h-5 w-5 ${config?.color || "text-primary"}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{link.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingLink(convertToPersonalLink(link));
                          setLinkModalOpen(true);
                        }}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteId(link.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button 
              onClick={() => {
                setEditingLink(null);
                setLinkModalOpen(true);
              }}
              className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Add a link</span>
            </button>

            {links.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add your first link to get started
              </p>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Last 3 days", key: "3d" as TimeRange },
                { label: "Last 7 days", key: "7d" as TimeRange },
                { label: "Last 30 days", key: "30d" as TimeRange },
                { label: "Last 12 months", key: "12m" as TimeRange },
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

      {/* Link Modal */}
      <LinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        onAdd={handleAddLink}
        editingLink={editingLink}
        onUpdate={handleUpdateLink}
        existingTypes={existingTypes}
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && removeLink(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PersonalDashboard;
