import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const features = [
  { title: "Taps per week", description: "See how many customers are engaging with your cards" },
  { title: "Button clicks", description: "Track which actions customers take most" },
  { title: "Google reviews sent", description: "Monitor reviews generated through TapAway" },
  { title: "Peak traffic days", description: "Know your busiest days for reviews" },
  { title: "Menu views", description: "See how often customers check your menu" },
  { title: "Review sentiment", description: "Understand what customers love and what to improve" },
  { title: "AI Coach suggestions", description: "Get actionable tips to grow your reputation" }
];

export const DashboardShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-black text-center mb-4"
        >
          Track Everything From One Dashboard
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          You see exactly what customers are tapping and how your reputation is growing — in real time.
        </motion.p>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white rounded-2xl p-6 border border-border shadow-sm min-h-[120px] flex flex-col justify-center">
              <h3 className="font-bold text-lg mb-2">{features[currentIndex].title}</h3>
              <p className="text-muted-foreground text-sm">{features[currentIndex].description}</p>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full bg-white border border-border shadow-sm hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-1.5">
                {features.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="p-2 rounded-full bg-white border border-border shadow-sm hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
              className="bg-white rounded-xl p-5 border border-border shadow-sm"
            >
              <h3 className="font-bold mb-1">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
