import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Star,
  Link2,
  Contact,
  UtensilsCrossed,
  BarChart3,
  ShoppingBag,
  ChevronDown,
  ExternalLink,
  UserPlus,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { useAppBackground } from "@/hooks/useAppBackground";

const examples = [
  { label: "Bakery", slug: "sugarbloom" },
  { label: "Barbershop", slug: "spacestudios" },
  { label: "Car Wraps", slug: "rebornwraps" },
  { label: "Restaurant", slug: "islasmarias" },
];

const features = [
  { icon: Star, title: "Reviews", desc: "Collect Google reviews with one tap" },
  { icon: Link2, title: "Links & Socials", desc: "All your platforms in one place" },
  { icon: Contact, title: "Contact / Save Phone", desc: "Visitors save your contact instantly" },
  { icon: UtensilsCrossed, title: "Menu & Services", desc: "Showcase what you offer" },
  { icon: BarChart3, title: "Analytics", desc: "See who visits and what they click" },
  { icon: ShoppingBag, title: "Shop", desc: "Sell courses, guides & products. TapAway takes 0%" },
];

const hubLinks = [
  {
    label: "Instagram",
    url: "https://instagram.com/tapaway.co",
    iconBg: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
  },
  { label: "X", url: "https://x.com/tapawayco", iconBg: "#000" },
  { label: "TikTok", url: "https://tiktok.com/@tapaway.co", iconBg: "#000" },
  { label: "Connect", url: "mailto:hello@tapaway.co", iconBg: "#3B82F6", icon: Mail },
];

const Socials = () => {
  const [selected, setSelected] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const current = examples[selected];

  useAppBackground("#000000");

  return (
    <div className="min-h-screen bg-black text-white">
      <Helmet>
        <title>TapAway | One Link For Everything</title>
        <meta
          name="description"
          content="Reviews, links, contact, menu, analytics & shop — all from one NFC card tap. Try it free."
        />
      </Helmet>

      {/* ① LIVE HUB */}
      <section className="pt-12 pb-8 px-4 max-w-md mx-auto flex flex-col items-center">
        {/* Profile photo + badge */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg">
            <img src="/tapaway-logo.svg" alt="TapAway" className="w-16 h-16 object-contain" />
          </div>
          <CheckCircle2
            className="absolute -bottom-1 -right-1 text-blue-500 fill-blue-500 bg-black rounded-full"
            size={28}
          />
        </div>

        {/* Name + handle */}
        <h1 className="text-2xl font-bold">TapAway</h1>
        <p className="text-white/50 text-sm mb-3">@socials</p>

        {/* Social icon row */}
        <div className="flex gap-3 mb-4">
          {[
            {
              bg: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              label: "IG",
            },
            { bg: "#000", border: true, label: "X" },
            { bg: "#000", border: true, label: "TT" },
          ].map((s, i) => (
            <div
              key={i}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{
                background: s.bg,
                border: s.border ? "1px solid rgba(255,255,255,0.2)" : undefined,
              }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Bio */}
        <p className="text-white/70 text-sm text-center italic max-w-xs mb-5 leading-relaxed">
          Everything your business needs, one tap away. Links, reviews, menu, contact, and more — all
          in one place!
        </p>

        {/* Save Contact button */}
        <button className="w-full max-w-xs flex items-center justify-center gap-2 bg-white text-black font-bold py-3.5 rounded-full shadow-md mb-6 hover:bg-white/90 transition-colors">
          <UserPlus size={18} />
          Save Contact
        </button>

        {/* Link cards */}
        <div className="w-full max-w-xs flex flex-col gap-3">
          {hubLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-4 py-3.5 hover:bg-white/15 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: link.iconBg }}
              >
                {link.icon ? (
                  <link.icon size={14} className="text-white" />
                ) : (
                  <span className="text-white text-[10px] font-bold">
                    {link.label === "Instagram" ? "IG" : link.label}
                  </span>
                )}
              </div>
              <span className="text-white font-semibold text-sm flex-1">{link.label}</span>
              <ExternalLink size={14} className="text-white/40" />
            </a>
          ))}
        </div>
      </section>

      {/* ② TRANSITION CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-px bg-white/20 mx-auto mb-8" />
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white/70 text-lg leading-relaxed mb-8"
          >
            We'll send you cards that tap — taking customers straight to your reviews, links, menu &
            more.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Try It Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-white/40 text-sm mt-3">No credit card required</p>
          </motion.div>
        </div>
      </section>

      {/* ③ DEMO SECTION */}
      <section className="py-16 px-4 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black text-center mb-8"
          >
            See real businesses using TapAway
          </motion.h2>

          <div className="flex flex-col items-center gap-6">
            {/* Dropdown */}
            <div className="relative w-64">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-5 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-semibold shadow-sm hover:bg-white/10 transition-all"
              >
                {current.label}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 shadow-lg overflow-hidden">
                  {examples.map((ex, i) => (
                    <button
                      key={ex.slug}
                      onClick={() => {
                        setSelected(i);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-3 hover:bg-white/10 transition-colors font-medium ${i === selected ? "bg-white/5" : ""}`}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone mockup */}
            <motion.div
              key={current.slug}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-[320px] md:w-[375px] h-[640px] md:h-[720px] rounded-[2.5rem] border-[6px] border-white/20 overflow-hidden shadow-2xl bg-black"
            >
              <iframe
                src={`/${current.slug}`}
                title={`${current.label} demo`}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </motion.div>

            <a
              href={`/${current.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:underline"
            >
              Visit live profile
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ④ FEATURES GRID */}
      <section className="py-20 px-4 bg-black">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black text-center mb-4"
          >
            Everything in one place
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center text-white/50 mb-12 max-w-lg mx-auto"
          >
            One tap gives your customers access to everything about your business.
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 shadow-sm hover:bg-white/10 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-bold text-sm md:text-base mb-1">{f.title}</h3>
                <p className="text-xs md:text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ FOOTER CTA */}
      <section className="py-20 px-4 bg-white text-black">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black mb-4"
          >
            Ready to try it?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-black/60 text-lg mb-8"
          >
            We'll send you cards that tap. Set up your page in minutes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-black text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Try It Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-black/40 text-sm mt-6"
          >
            No credit card required · Cancel anytime
          </motion.p>
        </div>
      </section>
    </div>
  );
};

export default Socials;
