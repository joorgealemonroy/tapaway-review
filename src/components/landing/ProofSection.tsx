import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Star, TrendingUp } from "lucide-react";

const results = [
  {
    business: "Las Nuevas Islas",
    location: "Fontana, CA",
    before: 30,
    after: 63,
    days: 30,
    rating: 4.6,
  },
  {
    business: "Space Studios",
    location: "Rancho Cucamonga, CA",
    before: 2,
    after: 22,
    days: 30,
    rating: 5.0,
  },
  {
    business: "Reborn Wraps Auto Design",
    location: "",
    before: 0,
    after: 19,
    days: 30,
    rating: 4.8,
  },
];

export const ProofSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            Real Results from Real Businesses
          </h2>
          <p className="text-muted-foreground text-lg">
            See how TapAway is helping businesses like yours get more reviews.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {results.map((result, i) => (
            <motion.div
              key={result.business}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1 }}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-all"
            >
              {/* Business Info */}
              <div className="mb-6">
                <h3 className="font-bold text-foreground text-lg">{result.business}</h3>
                <p className="text-sm text-muted-foreground">{result.location}</p>
              </div>

              {/* Before/After */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Before</p>
                  <p className="text-2xl font-bold text-muted-foreground">{result.before}</p>
                  <p className="text-xs text-muted-foreground">reviews</p>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">After</p>
                  <p className="text-2xl font-bold text-primary">{result.after}</p>
                  <p className="text-xs text-muted-foreground">reviews</p>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-primary/5 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-primary">
                      +{result.after - result.before}
                    </p>
                    <p className="text-xs text-muted-foreground">new reviews in {result.days} days</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-foreground">{result.rating}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 bg-card rounded-full px-8 py-4 border border-border shadow-sm">
            <div className="text-4xl font-black text-primary">+24</div>
            <div className="text-left">
              <p className="font-semibold text-foreground">average new reviews</p>
              <p className="text-sm text-muted-foreground">in the first 30 days</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
