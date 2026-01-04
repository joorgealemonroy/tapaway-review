import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Mic2, Trophy, Camera, PartyPopper } from "lucide-react";

const useCases = [
  {
    icon: PartyPopper,
    title: "Events & Networking",
    description: "Share your contact info instantly at conferences, meetups, and parties.",
  },
  {
    icon: Camera,
    title: "Content Creators",
    description: "Link to all your platforms — YouTube, TikTok, Instagram, Patreon.",
  },
  {
    icon: Trophy,
    title: "Athletes",
    description: "Share your stats, highlights, and recruitment profiles with one tap.",
  },
  {
    icon: Mic2,
    title: "Music Artists",
    description: "Link to Spotify, Apple Music, merch store, and tour dates.",
  },
  {
    icon: Users,
    title: "Freelancers & Professionals",
    description: "Share your portfolio, booking link, and payment methods instantly.",
  },
];

export const PersonalUseCases = () => {
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
            Perfect For
          </h2>
          <p className="text-muted-foreground text-lg">
            One card. Every link. Anyone can use it.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, i) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
              className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <useCase.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {useCase.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {useCase.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
