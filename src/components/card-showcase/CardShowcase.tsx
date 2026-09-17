import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCardShowcase } from "@/hooks/useCardShowcase";

const CardShowcaseScene = lazy(() => import("./CardShowcaseScene"));

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
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [webgl, setWebgl] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const show3d = webgl && !reducedMotion;
  return (
    <div ref={rootRef} className="flex flex-col items-center gap-3" style={{ width }} onKeyDown={(event) => {
      if (event.key === "ArrowLeft") void move(-1);
      if (event.key === "ArrowRight") void move(1);
      if (event.key === " ") { event.preventDefault(); setPaused((value) => !value); }
    }}>
      <div className="relative w-full aspect-[53.98/85.6]" aria-live="polite">
        <img
          src={design.frontImageUrl}
          alt={`${design.businessName} printed NFC card front`}
          className={`absolute inset-0 z-10 h-full w-full rounded-[6%] object-contain shadow-2xl transition-opacity duration-300 ${ready && show3d ? "pointer-events-none opacity-0" : "opacity-100"}`}
          loading="eager"
          decoding="sync"
        />
        {show3d && (
          <div className="absolute inset-[-18%]">
            <Suspense fallback={null}>
              <CardShowcaseScene
                design={design}
                paused={paused}
                visible={visible}
                mobile={window.innerWidth < 768}
                onReady={() => setReady(true)}
                onCycle={() => void move(1)}
              />
            </Suspense>
          </div>
        )}
      </div>
      <div className="flex min-h-9 items-center justify-center gap-2">
        {designs.length > 1 && <Button variant="ghost" size="icon" aria-label="Previous card design" onClick={() => void move(-1)}><ChevronLeft className="h-4 w-4" /></Button>}
        <p className="min-w-28 text-center text-sm font-semibold text-foreground">{design.businessName}</p>
        {show3d && <Button variant="ghost" size="icon" aria-label={paused ? "Play card rotation" : "Pause card rotation"} onClick={() => setPaused((value) => !value)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button>}
        {designs.length > 1 && <Button variant="ghost" size="icon" aria-label="Next card design" onClick={() => void move(1)}><ChevronRight className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
