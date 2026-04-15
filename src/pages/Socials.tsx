import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Star, Link2, Contact, UtensilsCrossed, BarChart3, ShoppingBag, ChevronDown, ExternalLink } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";

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

const Socials = () => {
  const [selected, setSelected] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const current = examples[selected];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>TapAway | One Link For Everything</title>
        <meta name="description" content="Reviews, links, contact, menu, analytics & shop — all from one NFC card tap. Try it free." />
      </Helmet>

      <LandingNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-black tracking-tight max-w-3xl mx-auto leading-[1.1]"
        >
          One card.<br />Everything they need.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
        >
          We'll send you cards that tap — taking customers straight to your reviews, links, menu & more.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Try It Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-muted-foreground mt-3">No credit card required</p>
        </motion.div>
      </section>

      {/* Examples */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black text-center mb-8"
          >
            See real businesses using TapAway
          </motion.h2>

          {/* Custom dropdown */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-64">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-5 py-3 rounded-xl border bg-card text-card-foreground font-semibold shadow-sm hover:shadow transition-all"
              >
                {current.label}
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border bg-card shadow-lg overflow-hidden">
                  {examples.map((ex, i) => (
                    <button
                      key={ex.slug}
                      onClick={() => { setSelected(i); setDropdownOpen(false); }}
                      className={`w-full text-left px-5 py-3 hover:bg-accent transition-colors font-medium ${i === selected ? "bg-accent/60" : ""}`}
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
              className="w-[320px] md:w-[375px] h-[640px] md:h-[720px] rounded-[2.5rem] border-[6px] border-foreground/20 overflow-hidden shadow-2xl bg-background"
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
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Visit live profile
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
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
            className="text-center text-muted-foreground mb-12 max-w-lg mx-auto"
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
                className="rounded-2xl border bg-card p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-sm md:text-base mb-1">{f.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-4 bg-foreground text-background">
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
            className="text-background/70 text-lg mb-8"
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
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-background text-foreground font-bold text-lg shadow-lg hover:shadow-xl transition-all"
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
            className="text-background/50 text-sm mt-6"
          >
            No credit card required · Cancel anytime
          </motion.p>
        </div>
      </section>
    </div>
  );
};

export default Socials;
