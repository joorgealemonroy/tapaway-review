import { Component, lazy, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Pause, Play } from "lucide-react";
import { useCardShowcase } from "@/hooks/useCardShowcase";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

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

const preloadDesign = async (front: string, back: string | null, hubPreview: string | null) => {
  const urls = [front, back, hubPreview].filter((url): url is string => Boolean(url));
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
      void preloadDesign(next.frontImageUrl, next.backImageUrl, next.hubScreenshotUrl).catch(() => undefined);
    }
  }, [design?.id, designs, index]);

  const move = useCallback(async (direction: number) => {
    if (designs.length < 2) return;
    const nextIndex = (index + direction + designs.length) % designs.length;
    const next = designs[nextIndex];
    try {
      await preloadDesign(next.frontImageUrl, next.backImageUrl, next.hubScreenshotUrl);
      setReady(false);
      setIndex(nextIndex);
    } catch {
      // The current matched pair remains visible when any required asset fails.
    }
  }, [designs, index]);

  if (loading) return <div className="h-[430px] w-full max-w-[620px]" aria-label="Loading card showcase" />;
  if (!design) return <div className="h-[430px] w-full max-w-[620px]" aria-label="No card designs are currently available" />;

  const show3d = webgl && !reducedMotion && !viewerFailed;
  const hasHub = Boolean(design.hubScreenshotUrl && design.hubUrl);

  return (
    <div ref={rootRef} className="mx-auto flex w-full flex-col items-center" style={{ maxWidth: width }}>
      <div className={`flex w-full items-center justify-center ${hasHub ? "gap-3 sm:gap-6 lg:gap-8" : ""}`}>
        <div className={`relative shrink-0 ${hasHub ? "w-[124px] sm:w-[175px] lg:w-[210px]" : "w-[210px] sm:w-[250px]"}`}>
          <div className="relative aspect-[53.98/85.6] w-full" aria-live="polite">
            {show3d && !ready && <div className="absolute inset-0 grid place-items-center" aria-label="Loading printed card"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
            {!show3d && <img src={design.frontImageUrl} alt={`${design.businessName} printed NFC card front`} className="absolute inset-0 h-full w-full rounded-[6%] object-contain shadow-xl" loading="eager" decoding="sync" />}
            {show3d && <div className="absolute inset-0">
              <ViewerErrorBoundary onError={() => { setViewerFailed(true); setReady(false); }}>
                <Suspense fallback={null}>
                  <CardShowcaseScene design={design} paused={paused} visible={visible} mobile={isMobile} onReady={() => setReady(true)} onCycle={() => void move(1)} />
                </Suspense>
              </ViewerErrorBoundary>
            </div>}
          </div>
        </div>

        {hasHub && <a href={design.hubUrl ?? undefined} aria-label={`View ${design.businessName} live hub`} className="group relative block w-[172px] shrink-0 sm:w-[220px] lg:w-[250px]" target="_blank" rel="noreferrer">
          <div className="relative aspect-[390/844] overflow-hidden rounded-[30px] border-[7px] border-secondary bg-secondary shadow-xl sm:rounded-[38px] sm:border-[9px]">
            <img src={design.hubScreenshotUrl ?? ""} alt={`${design.businessName} live mobile hub preview`} className="h-full w-full object-cover object-top" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
            <span className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-foreground sm:h-5 sm:w-20" aria-hidden="true" />
          </div>
        </a>}
      </div>

      <div className="mt-3 flex min-h-12 w-full max-w-md items-center justify-center gap-2">
        {designs.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-background hover:bg-background/10 hover:text-background" onClick={() => void move(-1)} aria-label="Previous business"><ChevronLeft /></Button>}
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-background">{design.businessName}</p>
          {design.hubUrl && <a href={design.hubUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" aria-label={`View ${design.businessName} live hub`}>View live hub <ExternalLink className="h-3 w-3" /></a>}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-background hover:bg-background/10 hover:text-background" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play card rotation" : "Pause card rotation"}>{paused ? <Play /> : <Pause />}</Button>
        {designs.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-background hover:bg-background/10 hover:text-background" onClick={() => void move(1)} aria-label="Next business"><ChevronRight /></Button>}
      </div>
    </div>
  );
}