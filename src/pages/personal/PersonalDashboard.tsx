import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Instagram,
  Youtube,
  Globe,
  Mail,
  DollarSign,
  Music,
  CheckCircle2,
  Wifi,
  QrCode,
  Eye,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";

// TikTok icon
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const LINK_TYPES = [
  { type: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/yourname" },
  { type: "tiktok", label: "TikTok", icon: TikTokIcon, placeholder: "https://tiktok.com/@yourname" },
  { type: "youtube", label: "YouTube", icon: Youtube, placeholder: "https://youtube.com/@yourchannel" },
  { type: "website", label: "Website", icon: Globe, placeholder: "https://yourwebsite.com" },
  { type: "email", label: "Email", icon: Mail, placeholder: "your@email.com" },
  { type: "payments", label: "Venmo / Cash App", icon: DollarSign, placeholder: "https://venmo.com/yourname" },
  { type: "music", label: "Spotify / Apple Music", icon: Music, placeholder: "https://open.spotify.com/artist/..." },
];

interface PersonalProfile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
}

interface PersonalLink {
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
  const [links, setLinks] = useState<PersonalLink[]>([]);
  const [analytics, setAnalytics] = useState({ visits: 0 });
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<typeof LINK_TYPES[0] | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile, timeRange]);

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

  const loadAnalytics = async () => {
    if (!profile) return;

    let startDate = new Date();
    switch (timeRange) {
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

    setAnalytics({ visits: count || 0 });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("personal_profiles")
        .update({ profile_photo_url: publicUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, profile_photo_url: publicUrl });
      toast.success("Photo updated!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const addLink = async () => {
    if (!selectedType || !linkUrl.trim() || !profile) return;

    setSavingLinks(true);
    try {
      const newLink = {
        profile_id: profile.id,
        link_type: selectedType.type,
        label: selectedType.label,
        url: selectedType.type === "email" && !linkUrl.startsWith("mailto:")
          ? `mailto:${linkUrl}`
          : linkUrl,
        sort_order: links.length,
      };

      const { data, error } = await supabase
        .from("personal_links")
        .insert(newLink)
        .select()
        .single();

      if (error) throw error;

      setLinks([...links, data]);
      setDialogOpen(false);
      setSelectedType(null);
      setLinkUrl("");
      toast.success("Link added!");
    } catch (err) {
      console.error("Error adding link:", err);
      toast.error("Failed to add link");
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

  const getLinkIcon = (type: string) => {
    const linkType = LINK_TYPES.find(l => l.type === type);
    if (!linkType) return Globe;
    return linkType.icon;
  };

  const availableTypes = LINK_TYPES.filter(
    type => !links.some(link => link.link_type === type.type)
  );

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
            onChange={handlePhotoUpload}
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
            onClick={() => window.open(`https://tapaway.co/${profile.username}`, "_blank")}
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
                  const Icon = getLinkIcon(link.link_type);
                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">{link.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <button
                        onClick={() => removeLink(link.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {availableTypes.length > 0 && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="w-full flex items-center gap-3 p-4 bg-muted/50 hover:bg-muted rounded-xl border border-dashed border-border hover:border-primary transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Add a link</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm mx-4">
                  <DialogHeader>
                    <DialogTitle>Add a link</DialogTitle>
                  </DialogHeader>
                  
                  {!selectedType ? (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {availableTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.type}
                            onClick={() => setSelectedType(type)}
                            className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-left"
                          >
                            <Icon className="h-5 w-5 text-foreground" />
                            <span className="text-sm font-medium">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <selectedType.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{selectedType.label}</span>
                      </div>
                      <Input
                        type={selectedType.type === "email" ? "email" : "url"}
                        placeholder={selectedType.placeholder}
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="h-12"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedType(null);
                            setLinkUrl("");
                          }}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={addLink}
                          disabled={!linkUrl.trim() || savingLinks}
                          className="flex-1"
                        >
                          {savingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}

            {links.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Add links to your profile so people can connect with you
              </p>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Profile visits</h2>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3d">Last 3 days</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="12m">Last 12 months</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-6 bg-card rounded-xl border border-border text-center">
              <p className="text-4xl font-bold text-foreground">{analytics.visits}</p>
              <p className="text-sm text-muted-foreground mt-1">profile visits</p>
            </div>

            {analytics.visits === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Share your profile link to start tracking visits
              </p>
            )}
          </TabsContent>

          {/* Card Tab */}
          <TabsContent value="card" className="space-y-4">
            <div className="space-y-3">
              <h2 className="font-semibold text-foreground">Your TapAway card</h2>
              
              {/* Card Preview */}
              <div className="aspect-[1.586/1] bg-foreground rounded-2xl p-6 flex flex-col justify-between text-background relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 opacity-60" />
                    <QrCode className="h-5 w-5 opacity-60" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {profile.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt={profile.full_name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-background/20 flex items-center justify-center">
                      <span className="text-lg font-bold">{profile.full_name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg flex items-center gap-2">
                      {profile.full_name}
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm opacity-70">Tap to Connect & Collaborate</p>
                  <p className="text-xs opacity-50">tapaway.co/{profile.username}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Your card design updates automatically when you change your profile photo or name.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PersonalDashboard;
