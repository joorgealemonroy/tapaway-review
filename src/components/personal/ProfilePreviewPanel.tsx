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
    <div className="flex flex-col items-center">
      <p className="text-xs text-muted-foreground mb-3">Live Preview</p>
      
      {/* Phone frame */}
      <div className="relative">
        {/* Phone bezel */}
        <div className="w-[280px] h-[560px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
          {/* Screen */}
          <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-xl z-10" />
            
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
        
        {/* Side buttons (decorative) */}
        <div className="absolute right-[-2px] top-24 w-1 h-8 bg-gray-700 rounded-l" />
        <div className="absolute left-[-2px] top-20 w-1 h-6 bg-gray-700 rounded-r" />
        <div className="absolute left-[-2px] top-32 w-1 h-12 bg-gray-700 rounded-r" />
      </div>
    </div>
  );
}

export const ProfilePreviewPanel = memo(ProfilePreviewPanelComponent);
