import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "We received our TapAway cards, put them to use, and I was honestly amazed. The very same day we started using them, we saw 5-star reviews start coming in. It really was that fast.",
    author: "Sonia",
    business: "Las Islas Marias"
  },
  {
    quote: "In just the first month with TapAway, we took one location from 3.6 to 4.0 and another from 3.8 to 4.0. Seeing that kind of growth so fast was huge—now we're already setting new goals to reach even higher.",
    author: "Victor",
    business: "Las Islas"
  }
];

export const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-12 md:py-16 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="text-2xl md:text-3xl font-black text-center mb-8"
        >
          What Restaurant Owners Say
        </motion.h2>
        
        <div className="space-y-4">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              className="bg-white rounded-xl p-5 md:p-6 border border-border shadow-sm"
            >
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-sm md:text-base text-foreground leading-relaxed mb-3">
                "{testimonial.quote}"
              </blockquote>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-bold">— {testimonial.author},</span>
                <span className="text-muted-foreground">{testimonial.business}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
