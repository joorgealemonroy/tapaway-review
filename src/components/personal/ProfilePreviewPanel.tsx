import { memo } from "react";
import { ProfilePreviewRenderer } from "./ProfilePreviewRenderer";
import { toast } from "sonner";

interface ProfileData {
  id: string;
  full_name: string;
  username: string;
  headline?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  header_type?: string | null;
  header_color?: string | null;
  header_image_url?: string | null;
  background_color?: string | null;
  pfp_position?: string | null;
  contact_enabled?: boolean | null;
  contact_display_style?: string | null;
  contact_name?: string | null;
  contact_button_label?: string | null;
  button_theme?: string | null;
  text_color?: string | null;
}

interface LinkData {
  id: string;
  label: string;
  url: string;
  link_type: string;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
  pill_color?: string | null;
  display_style?: string | null;
  cover_image_url?: string | null;
  grid_size?: string | null;
  thumbnail_url?: string | null;
}

interface BlockData {
  id: string;
  block_type: string;
  content: Record<string, unknown>;
  is_active?: boolean | null;
  sort_order: number;
  alignment?: string | null;
}

interface ProfilePreviewPanelProps {
  profile: ProfileData;
  links: LinkData[];
  blocks: BlockData[];
}

function ProfilePreviewPanelComponent({
  profile,
  links,
  blocks,
}: ProfilePreviewPanelProps) {
  const handleLinkClick = (url: string) => {
    toast.info("Links are disabled in preview mode", {
      description: url,
      duration: 2000,
    });
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Phone frame */}
      <div className="relative">
        {/* Phone bezel - slimmer, more modern */}
        <div className="w-[280px] h-[560px] bg-gray-900 rounded-[2.5rem] p-[6px] shadow-2xl ring-1 ring-gray-700/50">
          {/* Screen */}
          <div className="w-full h-full rounded-[2.2rem] overflow-hidden relative" style={{ backgroundColor: profile.background_color || '#000000' }}>
            {/* Dynamic Island style notch - smaller, modern */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
            
            {/* Content */}
            <div className="h-full overflow-y-auto scrollbar-hide">
              <ProfilePreviewRenderer
                profile={profile}
                links={links}
                blocks={blocks}
                isPreview={true}
                onLinkClick={handleLinkClick}
              />
            </div>
          </div>
        </div>
        
        {/* Side buttons (decorative) - refined */}
        <div className="absolute right-[-2px] top-24 w-[3px] h-8 bg-gray-700 rounded-l-sm" />
        <div className="absolute left-[-2px] top-20 w-[3px] h-6 bg-gray-700 rounded-r-sm" />
        <div className="absolute left-[-2px] top-32 w-[3px] h-12 bg-gray-700 rounded-r-sm" />
      </div>
    </div>
  );
}

export const ProfilePreviewPanel = memo(ProfilePreviewPanelComponent);
