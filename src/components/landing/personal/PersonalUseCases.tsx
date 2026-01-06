import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Mic2, Trophy, Camera, PartyPopper, Truck, Briefcase } from "lucide-react";

const useCases = [
  {
    icon: PartyPopper,
    title: "Networkers & Event-Goers",
    scenario: "You're at a conference. Instead of fumbling for a business card, you tap your card to their phone — they instantly have your LinkedIn, email, calendar link, and portfolio.",
    features: ["LinkedIn", "Email", "Calendar", "Portfolio"],
  },
  {
    icon: Camera,
    title: "Content Creators",
    scenario: "A fan asks 'Where can I follow you?' One tap and they see all your platforms — no more spelling out handles or losing followers.",
    features: ["YouTube", "TikTok", "Instagram", "Patreon"],
  },
  {
    icon: Trophy,
    title: "Athletes & Recruits",
    scenario: "A scout is interested. You tap your card and they instantly access your highlight reel, stats, schedule, and contact info.",
    features: ["Highlights", "Stats", "Schedule", "NCSA Profile"],
  },
  {
    icon: Mic2,
    title: "Musicians & Artists",
    scenario: "After a killer set, fans want to find you. One tap gives them your Spotify, Apple Music, tour dates, and merch store.",
    features: ["Spotify", "Apple Music", "Tour Dates", "Merch"],
  },
  {
    icon: Truck,
    title: "Food Trucks & Pop-Ups",
    scenario: "A customer asks 'Where will you be next week?' One tap and they have your schedule, menu, Instagram, and can even order online.",
    features: ["Location", "Menu", "Instagram", "Online Orders"],
  },
  {
    icon: Briefcase,
    title: "Freelancers & Pros",
    scenario: "A potential client is interested. You tap your card — they get your portfolio, booking link, payment info, and testimonials.",
    features: ["Portfolio", "Booking", "Venmo", "Reviews"],
  },
];

export const PersonalUseCases = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            See How People Use It
          </h2>
          <p className="text-muted-foreground text-lg">
            Real examples. Real value. One tap.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, i) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              className="group bg-white rounded-2xl border border-border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Icon with gradient background */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <useCase.icon className="w-6 h-6 text-primary" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground mb-3">
                {useCase.title}
              </h3>

              {/* Scenario - italicized storytelling */}
              <p className="text-muted-foreground text-sm leading-relaxed italic mb-4">
                "{useCase.scenario}"
              </p>

              {/* Feature badges */}
              <div className="flex flex-wrap gap-2">
                {useCase.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                  >
                    {feature}
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
