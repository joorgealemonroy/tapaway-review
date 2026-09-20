import { Component, lazy, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Pause, Play } from "lucide-react";
import { useCardShowcase } from "@/hooks/useCardShowcase";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import ShowcasePhone from "./ShowcasePhone";
import type { HubPreviewData } from "@/types/cardShowcase";

const CardShowcaseScene = lazy(() => import("./CardShowcaseScene"));

class ViewerErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const canUseWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
};

const preloadImage = (url: string) => new Promise<void>((resolve, reject) => {
  const image = new Image();
  image.onload = async () => {
    try { await image.decode?.(); } catch { /* loaded pixels remain usable */ }
    resolve();
  };
  image.onerror = () => reject(new Error(`Unable to load ${url}`));
  image.src = url;
});

const preloadDesign = async (front: string, back: string | null, hubPreview: HubPreviewData | null) => {
  const urls = [
    front,
    back,
    hubPreview?.profile?.profile_photo_url,
    hubPreview?.profile?.header_image_url,
    ...(hubPreview?.links.flatMap((link) => [link.cover_image_url, link.thumbnail_url]) ?? []),
  ].filter((url): url is string => Boolean(url));
  await Promise.all(urls.map(preloadImage));
};

interface CardShowcaseProps { width?: string }

export default function CardShowcase({ width = "min(620px, 100%)" }: CardShowcaseProps) {
  const { designs, loading } = useCardShowcase();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [webgl, setWebgl] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewerFailed, setViewerFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const design = designs[index] ?? null;

  useEffect(() => {
    setWebgl(canUseWebGL());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReducedMotion(media.matches); if (media.matches) setPaused(true); };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "160px" });
    observer.observe(element);
    const onVisibility = () => setVisible(!document.hidden && element.getBoundingClientRect().bottom > -160);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    if (index >= designs.length) setIndex(0);
  }, [designs.length, index]);

  useEffect(() => {
    setReady(false);
    setViewerFailed(false);
    const next = designs[(index + 1) % designs.length];
    if (next && next.id !== design?.id) {
      void preloadDesign(next.frontImageUrl, next.backImageUrl, next.hubPreview).catch(() => undefined);
    }
  }, [design?.id, designs, index]);

  // Warm every remaining design in the background so later switches are instant.
  useEffect(() => {
    if (designs.length < 2) return;
    const scheduler = window as unknown as { requestIdleCallback?: (fn: () => void) => number };
    const idle = (cb: () => void) => {
      if (scheduler.requestIdleCallback) return scheduler.requestIdleCallback(cb);
      return window.setTimeout(cb, 1200);
    };
    let cancelled = false;
    idle(() => {
      if (cancelled) return;
      void (async () => {
        for (const item of designs) {
          if (cancelled) return;
          await preloadDesign(item.frontImageUrl, item.backImageUrl, item.hubPreview).catch(() => undefined);
        }
      })();
    });
    return () => { cancelled = true; };
  }, [designs]);

  const move = useCallback(async (direction: number) => {
    if (designs.length < 2) return;
    const nextIndex = (index + direction + designs.length) % designs.length;
    const next = designs[nextIndex];
    try {
      await preloadDesign(next.frontImageUrl, next.backImageUrl, next.hubPreview);
      setReady(false);
      setIndex(nextIndex);
    } catch {
      // The current matched pair remains visible when any required asset fails.
    }
  }, [designs, index]);

  if (loading) return <div className="h-[430px] w-full max-w-[620px]" aria-label="Loading card showcase" />;
  if (!design) return <div className="h-[430px] w-full max-w-[620px]" aria-label="No card designs are currently available" />;

  const show3d = webgl && !reducedMotion && !viewerFailed;
  const hasHub = Boolean(design.hubPreview && design.hubUrl);

  return (
    <div ref={rootRef} className="mx-auto flex w-full flex-col items-center" style={{ maxWidth: width }}>
      <div className={`showcase-pair relative flex justify-center pb-12 sm:pb-16 md:pb-20 items-center`}>
        {hasHub && <div className="showcase-pool-light pointer-events-none absolute -bottom-[3%] left-[4%] right-[-2%] h-[22%]" aria-hidden="true" />}
        <div className={`relative z-10 shrink-0 ${hasHub ? "showcase-card" : "w-[210px] sm:w-[250px] aspect-[53.98/85.6]"}`}>
          <div className="relative h-full w-full" aria-live="polite">
            {show3d && !ready && <div className="absolute inset-0 grid place-items-center" aria-label="Loading printed card"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            {!show3d && <img src={design.frontImageUrl} alt={`${design.businessName} printed NFC card front`} className="absolute inset-0 h-full w-full rounded-[6%] object-contain shadow-xl" loading="eager" decoding="sync" />}
            {show3d && <div className="absolute left-0 right-0" style={{ top: "-7.5%", bottom: "-7.5%" }}>
              <ViewerErrorBoundary onError={() => { setViewerFailed(true); setReady(false); }}>
                <Suspense fallback={null}>
                  <CardShowcaseScene design={design} paused={paused} visible={visible} mobile={isMobile} onReady={() => setReady(true)} onCycle={() => void move(1)} />
                </Suspense>
              </ViewerErrorBoundary>
            </div>}
          </div>
        </div>

        {hasHub && (
          <div key={design.id} className="showcase-fade-in shrink-0">
            <ShowcasePhone design={design} />
          </div>
        )}
      </div>

      <div className="mt-1 flex min-h-11 items-center justify-center gap-2">
        {designs.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground" onClick={() => void move(-1)} aria-label="Previous business"><ChevronLeft /></Button>}
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play card rotation" : "Pause card rotation"}>{paused ? <Play /> : <Pause />}</Button>
        {designs.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground" onClick={() => void move(1)} aria-label="Next business"><ChevronRight /></Button>}
      </div>
    </div>
  );
}