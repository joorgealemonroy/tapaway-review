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
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [canvasHeight, setCanvasHeight] = useState(860);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const widthScale = viewport.clientWidth / 430;
      const hub = contentRef.current?.firstElementChild as HTMLElement | null;
      // Natural content height, measured from the rendered children so the
      // stretched canvas height never feeds back into the measurement.
      let naturalHeight = 860;
      if (hub) {
        const top = hub.getBoundingClientRect().top;
        let bottom = 0;
        Array.from(hub.children).forEach((child) => {
          bottom = Math.max(bottom, child.getBoundingClientRect().bottom - top);
        });
        const current = scaleRef.current || widthScale;
        if (bottom > 0) naturalHeight = bottom / current;
      }
      const heightScale = viewport.clientHeight / naturalHeight;
      // Fill the screen when possible, but never crop more than a sliver off the sides.
      const next = Math.min(Math.max(widthScale, heightScale), widthScale * 1.12);
      scaleRef.current = next;
      setScale(next);
      setCanvasHeight(next > 0 ? viewport.clientHeight / next : 860);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    const images = Array.from(viewport.querySelectorAll("img"));
    images.forEach((image) => image.addEventListener("load", update));
    return () => {
      observer.disconnect();
      images.forEach((image) => image.removeEventListener("load", update));
    };
  }, [preview]);

  if (!preview.profile) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-hub-preview px-[9%] text-center text-hub-preview-foreground" aria-label={`${businessName} live hub preview`}>
        {preview.logoUrl && <img src={preview.logoUrl} alt={`${preview.name} logo`} className="w-[48%] object-contain" />}
        <p className="mt-[6%] text-[clamp(9px,4.4cqw,17px)] font-bold">{preview.name}</p>
        {preview.description && <p className="mt-[2%] text-[clamp(6px,2.7cqw,11px)] text-hub-preview-muted">{preview.description}</p>}
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden" aria-label={`${businessName} live hub preview`}>
      <div
        ref={contentRef}
        className="homepage-hub-canvas homepage-hub-content pointer-events-none absolute left-1/2 top-0 flex w-[430px] origin-top flex-col [backface-visibility:hidden] [will-change:transform]"
        style={{
          transform: `translateX(-50%) scale(${scale})`,
          height: `${canvasHeight}px`,
          background: preview.profile.background_color || "#000000",
        }}
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