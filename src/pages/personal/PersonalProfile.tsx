import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2,
  ExternalLink,
  Loader2,
  Share2
} from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import { toast } from "sonner";

interface PersonalProfile {
  id: string;
  username: string;
  full_name: string;
  profile_photo_url: string | null;
}

interface PersonalLink {
  id: string;
  link_type: string;
  label: string;
  url: string;
}

const PersonalProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [links, setLinks] = useState<PersonalLink[]>([]);
  const [notFound, setNotFound] = useState(false);

  const handleShare = async () => {
    // Share URL uses edge function for rich OG previews
    const ogUrl = `https://xfrvckdcrqvkqdwjzopt.supabase.co/functions/v1/serve-og-profile?slug=${profile?.username}`;
    const displayUrl = `https://tapaway.co/${profile?.username}`;
    const shareData = {
      title: `${profile?.full_name} | TapAway`,
      text: `Check out ${profile?.full_name}'s TapAway profile`,
      url: ogUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed - copy to clipboard instead
        await navigator.clipboard.writeText(displayUrl);
        toast.success("Link copied to clipboard");
      }
    } else {
      await navigator.clipboard.writeText(displayUrl);
      toast.success("Link copied to clipboard");
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch profile via public RPC (works for anon)
        const { data: rows, error: profileError } = await supabase
          .rpc("get_public_personal_profile", { _slug: username.toLowerCase() });
        const profileData = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

        if (profileError || !profileData || profileData.subscription_status !== "active") {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch links
        const { data: linksData } = await supabase
          .from("personal_links")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        setLinks(linksData || []);

        // Track visit (fire and forget)
        supabase
          .from("personal_analytics")
          .insert({
            profile_id: profileData.id,
            event_type: "profile_visit",
            visitor_info: {
              referrer: document.referrer || null,
              userAgent: navigator.userAgent,
            },
          })
          .then(() => {});
      } catch (err) {
        console.error("Error loading profile:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Profile not found</h1>
        <p className="text-muted-foreground mb-6">
          This TapAway profile doesn't exist or is no longer active.
        </p>
        <a href="/personal" className="text-primary hover:underline">
          Get your own TapAway
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cover/Header */}
      <div className="h-32 bg-gradient-to-br from-primary to-primary/70" />
      
      {/* Profile Content */}
      <div className="max-w-md mx-auto px-4 -mt-16 pb-12 relative">
        {/* Share button - top right */}
        <button
          onClick={handleShare}
          className="absolute top-0 right-4 h-10 w-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          aria-label="Share profile"
        >
          <Share2 className="h-4 w-4 text-foreground" />
        </button>

        {/* Avatar */}
        <div className="relative inline-block mb-4">
          {profile.profile_photo_url ? (
            <img
              src={profile.profile_photo_url}
              alt={profile.full_name}
              className="h-28 w-28 rounded-full border-4 border-background object-cover"
            />
          ) : (
            <div className="h-28 w-28 rounded-full border-4 border-background bg-muted flex items-center justify-center">
              <span className="text-3xl font-bold text-muted-foreground">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>

        {/* Name & Username */}
        <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
        <p className="text-muted-foreground mb-6">@{profile.username}</p>

        {/* Links with platform styling */}
        {links.length > 0 ? (
          <div className="space-y-3">
            {links.map((link) => {
              const config = getPlatformConfig(link.link_type);
              const Icon = config?.icon;
              
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg ${
                    config?.gradient || config?.bgColor || "bg-card border border-border"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    config ? "bg-white/20" : "bg-primary/10"
                  }`}>
                    {Icon && <Icon className={`h-6 w-6 ${config?.color || "text-primary"}`} />}
                  </div>
                  <span className={`flex-1 font-medium ${config?.color || "text-foreground"}`}>
                    {link.label}
                  </span>
                  <ExternalLink className={`h-4 w-4 ${config?.color || "text-muted-foreground"} opacity-60`} />
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No links yet
          </p>
        )}

        {/* Subtle Footer with Create CTA */}
        <div className="mt-12 pt-8 border-t border-border">
          <a
            href="/personal"
            className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Create your own TapAway page</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;
