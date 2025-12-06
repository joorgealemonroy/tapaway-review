import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Activity, Star, Eye, Calendar, Bot } from "lucide-react";

const features = [
  { icon: Activity, title: "Taps per week", description: "See how many guests are engaging" },
  { icon: Star, title: "Google reviews sent", description: "Monitor reviews generated" },
  { icon: Eye, title: "Menu views", description: "Track menu engagement" },
  { icon: Calendar, title: "Peak traffic days", description: "Know your busiest days" },
  { icon: Bot, title: "AI Coach suggestions", description: "Get tips to grow reviews" }
];

export const DashboardShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % features.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + features.length) % features.length);
  };

  return (
    <section ref={ref} className="py-12 md:py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-3"
        >
          Track Everything From One Dashboard
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center text-sm text-muted-foreground mb-8 max-w-md mx-auto"
        >
          See everything your guests interact with — live, in one dashboard.
        </motion.p>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = features[currentIndex].icon;
                  return (
                    <div className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-bold text-base mb-1">{features[currentIndex].title}</h3>
                  <p className="text-muted-foreground text-sm">{features[currentIndex].description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={prevSlide}
                className="p-2 rounded-full bg-white border border-border shadow-sm active:bg-muted/50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1.5">
                {features.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="p-2 rounded-full bg-white border border-border shadow-sm active:bg-muted/50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: 0.15 + index * 0.05 }}
                className="bg-white rounded-xl p-4 border border-border shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-0.5">{feature.title}</h3>
                    <p className="text-muted-foreground text-xs">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
