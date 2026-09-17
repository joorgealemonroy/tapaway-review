import { Component, lazy, ReactNode, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCardShowcase } from "@/hooks/useCardShowcase";
import { useIsMobile } from "@/hooks/use-mobile";

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

const preloadPair = async (front: string, back: string | null) => {
  const urls = back ? [front, back] : [front];
  await Promise.all(urls.map((url) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* loaded pixels are still usable */ }
      resolve();
    };
    image.onerror = () => reject(new Error(`Unable to load ${url}`));
    image.src = url;
  })));
};

interface CardShowcaseProps { width?: string }

export default function CardShowcase({ width = "min(310px, 76vw)" }: CardShowcaseProps) {
  const { designs, loading } = useCardShowcase();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [webgl, setWebgl] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewerFailed, setViewerFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const design = designs[index] ?? null;

  useEffect(() => {
    setWebgl(canUseWebGL());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(element);
    const onVisibility = () => setVisible(!document.hidden && Boolean(element.getBoundingClientRect().bottom > -100));
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
    if (next && next.id !== design?.id) void preloadPair(next.frontImageUrl, next.backImageUrl).catch(() => undefined);
  }, [design?.id, designs, index]);

  const move = useCallback(async (direction: number) => {
    if (designs.length < 2) return;
    const nextIndex = (index + direction + designs.length) % designs.length;
    const next = designs[nextIndex];
    try {
      await preloadPair(next.frontImageUrl, next.backImageUrl);
      setReady(false);
      setIndex(nextIndex);
    } catch {
      // Keep the current design visible if the requested pair is unavailable.
    }
  }, [designs, index]);

  if (loading) return <div className="aspect-[53.98/85.6] w-[min(310px,76vw)]" aria-label="Loading card showcase" />;
  if (!design) return <div className="aspect-[53.98/85.6] w-[min(310px,76vw)]" aria-label="No card designs are currently available" />;

  const show3d = webgl && !reducedMotion && !viewerFailed;
  return (
    <div ref={rootRef} className="flex flex-col items-center" style={{ width }}>
      <div className="relative w-full aspect-[53.98/85.6]" aria-live="polite">
        {show3d && !ready && <div className="absolute inset-0 grid place-items-center" aria-label="Loading printed card"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
        {!show3d && <img
          src={design.frontImageUrl}
          alt={`${design.businessName} printed NFC card front`}
          className="absolute inset-0 z-10 h-full w-full rounded-[6%] object-contain shadow-2xl"
          loading="eager"
          decoding="sync"
        />}
        {show3d && (
          <div className="absolute inset-0">
            <ViewerErrorBoundary onError={() => { setViewerFailed(true); setReady(false); }}>
              <Suspense fallback={null}>
                <CardShowcaseScene
                  design={design}
                  paused={false}
                  visible={visible}
                  mobile={isMobile}
                  onReady={() => setReady(true)}
                  onCycle={() => void move(1)}
                />
              </Suspense>
            </ViewerErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
