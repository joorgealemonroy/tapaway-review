import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "We received our TapAway cards, put them to use, and I was honestly amazed. The very same day we started using them, we saw 5-star reviews start coming in. It really was that fast.",
    author: "Sonia",
    business: "Las Islas Marias",
    highlight: "5-star reviews the same day",
  },
  {
    quote: "In just the first month with TapAway, we took one location from 3.6 to 4.0 and another from 3.8 to 4.0. Seeing that kind of growth so fast was huge—now we're already setting new goals to reach even higher.",
    author: "Victor",
    business: "Las Islas",
    highlight: "3.6 → 4.0 in just one month.",
  },
];

export const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-14 md:py-16 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-3"
        >
          Real Results from Real Restaurants
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm text-muted-foreground text-center mb-8"
        >
          Hear from restaurant owners using TapAway right now
        </motion.p>
        
        <div className="space-y-4">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 25 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.12 }}
              whileHover={{ y: -3 }}
              className="relative bg-card rounded-2xl p-5 md:p-6 border border-border shadow-lg shadow-black/5 hover:shadow-xl hover:border-primary/20 transition-all duration-300"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              
              {/* Animated stars */}
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 + i * 0.05 }}
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,0.5)]" />
                  </motion.div>
                ))}
              </div>
              
              {/* Highlight callout */}
              <div className="inline-block bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
                {testimonial.highlight}
              </div>
              
              <blockquote className="text-sm md:text-base leading-relaxed mb-4 text-foreground/90">
                "{testimonial.quote}"
              </blockquote>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">
                  {testimonial.author[0]}
                </div>
                <div className="text-sm">
                  <span className="font-bold">{testimonial.author}</span>
                  <span className="text-muted-foreground">, {testimonial.business}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
