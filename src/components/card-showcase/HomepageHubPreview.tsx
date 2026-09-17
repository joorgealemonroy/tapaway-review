import { Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProfilePreviewRenderer } from "@/components/personal/ProfilePreviewRenderer";
import type { HubPreviewData } from "@/types/cardShowcase";

interface HomepageHubPreviewProps {
  preview: HubPreviewData;
  businessName: string;
}

export default function HomepageHubPreview({ preview, businessName }: HomepageHubPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setScale(viewport.clientWidth / 430);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden" aria-label={`${businessName} live hub preview`}>
      <div
        className="homepage-hub-canvas pointer-events-none absolute left-0 top-0 w-[430px] origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        <ProfilePreviewRenderer
          profile={preview.profile}
          links={preview.links}
          blocks={preview.blocks}
          isPreview
          displayMode="showcase"
        />
        <div className="absolute right-4 top-4 flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background shadow-lg">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </div>
      </div>
    </div>
  );
}