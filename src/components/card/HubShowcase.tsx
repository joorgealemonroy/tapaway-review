import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/components/personal/OptimizedImage";
import { ExternalLink } from "lucide-react";

interface ShowcaseProfile {
  username: string;
  full_name: string;
  headline: string | null;
  profile_photo_url: string | null;
}

export const HubShowcase = () => {
  const [profiles, setProfiles] = useState<ShowcaseProfile[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("personal_profiles_public")
        .select("username, full_name, headline, profile_photo_url")
        .eq("subscription_status", "active")
        .not("profile_photo_url", "is", null)
        .limit(6);

      if (data && data.length > 0) {
        setProfiles(data as ShowcaseProfile[]);
      }
    };
    fetchProfiles();
  }, []);

  if (profiles.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Real Hubs, Real People</h2>
        <p className="text-sm text-muted-foreground mt-1">See what others are building</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
        {profiles.map((p) => (
          <a
            key={p.username}
            href={`/${p.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="snap-start flex-shrink-0 w-[140px] rounded-2xl border border-border bg-card p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow group"
          >
            <div className="h-16 w-16 rounded-full overflow-hidden bg-muted">
              {p.profile_photo_url && (
                <img
                  src={getOptimizedImageUrl(p.profile_photo_url, 128, 85)}
                  alt={p.full_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
              {p.headline && (
                <p className="text-xs text-muted-foreground truncate">{p.headline}</p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
              View <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};
