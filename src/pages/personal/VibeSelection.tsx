import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { PhoneMockup } from "@/components/personal/PhoneMockup";
import { VIBE_TEMPLATES } from "@/lib/vibeTemplates";
import { ArrowRight } from "lucide-react";

const numberInRange = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const VibeSelection = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [slideStyles, setSlideStyles] = useState<Array<{ scale: number; opacity: number; blur: number }>>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    containScroll: false,
    skipSnaps: false,
    duration: 30,
  });

  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const rafRef = useRef(0);

  const updateStyles = useCallback(() => {
    if (!emblaApi) return;
    const progress = emblaApi.scrollProgress();
    const snaps = emblaApi.scrollSnapList();
    const styles = snaps.map((snap) => {
      let diff = snap - progress;
      // Wrap for loop
      if (diff > 0.5) diff -= 1;
      if (diff < -0.5) diff += 1;
      const absDiff = Math.abs(diff) * VIBE_TEMPLATES.length;
      const scale = numberInRange(1.15 - absDiff * 0.15, 0.85, 1.15);
      const opacity = numberInRange(1 - absDiff * 0.3, 0.4, 1);
      const blur = absDiff > 0.5 ? numberInRange(absDiff - 0.5, 0, 1) : 0;
      return { scale, opacity, blur };
    });
    setSlideStyles(styles);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateStyles);
  }, [updateStyles]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("scroll", onScroll);
    emblaApi.on("reInit", onScroll);
    onSelect();
    updateStyles();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("scroll", onScroll);
      emblaApi.off("reInit", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [emblaApi, onSelect, onScroll, updateStyles]);

  const handleSelect = () => {
    const vibe = VIBE_TEMPLATES[selectedIndex];
    sessionStorage.setItem("tapaway_selected_vibe", vibe.id);
    setIsZooming(true);
    setTimeout(() => {
      navigate("/personal/signup?vibe=true");
    }, 600);
  };

  const currentGlow = VIBE_TEMPLATES[selectedIndex]?.glowColor ?? "#888";

  // Snake dot widths
  const getDotWidth = (i: number) => {
    const total = scrollSnaps.length;
    let diff = Math.abs(i - selectedIndex);
    if (diff > total / 2) diff = total - diff;
    if (diff === 0) return 28;
    if (diff === 1) return 14;
    return 8;
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative"
      style={{
        background: "linear-gradient(to bottom, hsl(230 40% 6%), hsl(230 30% 12%))",
      }}
    >
      {/* Radial glow behind carousel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${currentGlow}22 0%, transparent 70%)`,
          transition: "background 0.6s ease",
        }}
      />

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isZooming ? 0 : 1, y: isZooming ? -30 : 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-black text-white text-center mb-2 mt-8 relative z-10"
      >
        Choose Your Vibe
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: isZooming ? 0 : 0.6 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-white/60 text-sm mb-8 relative z-10"
      >
        Swipe to preview — you can customize later
      </motion.p>

      {/* Carousel */}
      <motion.div
        animate={
          isZooming
            ? { scale: 2.5, opacity: 0 }
            : { scale: 1, opacity: 1 }
        }
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[1100px] mx-auto relative z-10"
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {VIBE_TEMPLATES.map((vibe, index) => {
              const s = slideStyles[index] ?? { scale: 0.85, opacity: 0.4, blur: 0 };
              const isActive = index === selectedIndex;
              return (
                <div
                  key={vibe.id}
                  className="flex-[0_0_70%] sm:flex-[0_0_45%] md:flex-[0_0_33%] flex justify-center px-2"
                  style={{
                    transform: `scale(${s.scale})`,
                    opacity: s.opacity,
                    filter: s.blur > 0 ? `blur(${s.blur}px)` : "none",
                    zIndex: isActive ? 20 : 10,
                    transition: "filter 0.2s ease",
                  }}
                >
                  <div
                    className="rounded-[2.5rem] transition-shadow duration-500"
                    style={{
                      boxShadow: isActive
                        ? `0 0 40px 8px ${currentGlow}33, 0 0 80px 20px ${currentGlow}15`
                        : "none",
                    }}
                  >
                    <PhoneMockup vibe={vibe} isActive={isActive} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Snake dot indicators */}
      <motion.div
        animate={{ opacity: isZooming ? 0 : 1 }}
        className="flex items-center gap-1.5 mt-6 mb-6 relative z-10"
      >
        {scrollSnaps.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className="rounded-full"
            style={{
              width: getDotWidth(i),
              height: 8,
              backgroundColor:
                i === selectedIndex ? "white" : "rgba(255,255,255,0.3)",
              transition: "width 0.35s ease, background-color 0.35s ease",
            }}
          />
        ))}
      </motion.div>

      {/* Dynamic CTA Button */}
      <motion.button
        onClick={handleSelect}
        disabled={isZooming}
        animate={{ opacity: isZooming ? 0 : 1, y: isZooming ? 20 : 0 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-zinc-900 font-bold text-lg shadow-lg shadow-white/10 mb-12 disabled:opacity-50 relative z-10"
      >
        Use {VIBE_TEMPLATES[selectedIndex]?.name}
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default VibeSelection;
