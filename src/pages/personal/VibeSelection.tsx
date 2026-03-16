import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { PhoneMockup } from "@/components/personal/PhoneMockup";
import { VIBE_TEMPLATES } from "@/lib/vibeTemplates";
import { ArrowRight } from "lucide-react";

const VibeSelection = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    containScroll: false,
    skipSnaps: false,
  });

  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Per-slide transform based on distance from active
  const getSlideStyle = (index: number) => {
    if (!emblaApi) return {};
    const totalSlides = VIBE_TEMPLATES.length;
    let diff = index - selectedIndex;
    // Wrap around for loop
    if (diff > totalSlides / 2) diff -= totalSlides;
    if (diff < -totalSlides / 2) diff += totalSlides;
    const isActive = diff === 0;
    return {
      transform: `scale(${isActive ? 1 : 0.8})`,
      opacity: isActive ? 1 : 0.5,
      transition: "transform 0.35s ease, opacity 0.35s ease",
    };
  };

  const handleSelect = () => {
    const vibe = VIBE_TEMPLATES[selectedIndex];
    sessionStorage.setItem("tapaway_selected_vibe", vibe.id);
    setIsZooming(true);
    setTimeout(() => {
      navigate("/personal/signup?vibe=true");
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, hsl(230 40% 6%), hsl(230 30% 12%))",
      }}
    >
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: isZooming ? 0 : 1, y: isZooming ? -30 : 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl md:text-4xl font-black text-white text-center mb-2 mt-8"
      >
        Choose Your Vibe
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: isZooming ? 0 : 0.6 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-white/60 text-sm mb-8"
      >
        Swipe to preview — you can customize later
      </motion.p>

      {/* Carousel */}
      <motion.div
        animate={isZooming ? { scale: 1.3, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-[900px] mx-auto"
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {VIBE_TEMPLATES.map((vibe, index) => (
              <div
                key={vibe.id}
                className="flex-[0_0_80%] sm:flex-[0_0_50%] md:flex-[0_0_40%] flex justify-center px-2"
                style={getSlideStyle(index)}
              >
                <PhoneMockup vibe={vibe} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Dot indicators */}
      <motion.div
        animate={{ opacity: isZooming ? 0 : 1 }}
        className="flex gap-2 mt-6 mb-6"
      >
        {scrollSnaps.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === selectedIndex ? 24 : 8,
              height: 8,
              backgroundColor: i === selectedIndex ? "white" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.button
        onClick={handleSelect}
        disabled={isZooming}
        animate={{ opacity: isZooming ? 0 : 1, y: isZooming ? 20 : 0 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-zinc-900 font-bold text-lg shadow-lg shadow-white/10 mb-12 disabled:opacity-50"
      >
        Use This Vibe
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default VibeSelection;
