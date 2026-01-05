import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { 
  CheckCircle2,
  ExternalLink,
  Loader2
} from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";

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

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("personal_profiles")
          .select("id, username, full_name, profile_photo_url, subscription_status")
          .eq("username", username.toLowerCase())
          .single();

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
      <div className="max-w-md mx-auto px-4 -mt-16 pb-12">
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

        {/* Footer */}
        <div className="mt-12 text-center">
          <a
            href="/personal"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-black text-xs">TapAway</span>
            <span>Get your own</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;
