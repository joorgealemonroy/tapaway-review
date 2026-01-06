import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Mic2, Trophy, Camera, PartyPopper, Truck, Briefcase } from "lucide-react";

const useCases = [
  {
    icon: PartyPopper,
    title: "Networkers",
    tagline: "Share your contact at events instantly.",
    links: ["LinkedIn", "Email", "Calendar"],
  },
  {
    icon: Camera,
    title: "Content Creators",
    tagline: "All your platforms in one tap.",
    links: ["YouTube", "TikTok", "Instagram"],
  },
  {
    icon: Trophy,
    title: "Athletes",
    tagline: "Stats, highlights, and recruitment ready.",
    links: ["Highlights", "Stats", "NCSA"],
  },
  {
    icon: Mic2,
    title: "Musicians",
    tagline: "Fans find your music instantly.",
    links: ["Spotify", "Apple Music", "Merch"],
  },
  {
    icon: Truck,
    title: "Food Trucks",
    tagline: "Share your schedule and menu.",
    links: ["Location", "Menu", "Orders"],
  },
  {
    icon: Briefcase,
    title: "Freelancers",
    tagline: "Portfolio, booking, and payment in one.",
    links: ["Portfolio", "Booking", "Venmo"],
  },
];

export const PersonalUseCases = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            Perfect For
          </h2>
          <p className="text-muted-foreground text-base">
            One card. Every link. Anyone can use it.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {useCases.map((useCase, i) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="bg-white rounded-xl border border-border p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Icon + Title row */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <useCase.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-foreground">
                  {useCase.title}
                </h3>
              </div>

              {/* Tagline */}
              <p className="text-muted-foreground text-xs md:text-sm mb-3 leading-relaxed">
                {useCase.tagline}
              </p>

              {/* Link badges */}
              <div className="flex flex-wrap gap-1.5">
                {useCase.links.map((link) => (
                  <span
                    key={link}
                    className="text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {link}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
