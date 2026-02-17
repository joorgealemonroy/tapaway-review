import { motion } from "framer-motion";
import { ArrowRight, ExternalLink, Zap } from "lucide-react";
import { Link } from "react-router-dom";

// Jorge's real profile assets
const PROFILE = {
  name: "Jorge Monroy",
  bio: "Building TapAway — a faster way to share who you are.",
  username: "jorge",
  pfp: "https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/profile.jpg?t=1767860088497",
  banner: "https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/header.jpg?t=1767751867827",
  bg: "#1a1a1a"
};

const LINKS = {
  instagram: {
    cover: "https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-link-images/link-covers/1769802393568-rv77m.jpeg",
    label: "Instagram"
  },
  tiktok: {
    cover: "https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-link-images/link-covers/1769802471936-vqtugk.jpeg",
    label: "TikTok"
  }
};

const CTA_BLOCK = "https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/blocks/1767595066063.jpeg";

const COLLAGE = [
"https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/collage/1767656890914.webp",
"https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/collage/1767656902215.webp",
"https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/collage/1767752065336.jpg",
"https://xfrvckdcrqvkqdwjzopt.supabase.co/storage/v1/object/public/personal-photos/87672793-9bcb-4cf9-b2d6-657dcaa36187/collage/1767752087166.jpg"];


/* Small inline SVG social icons */
const InstagramIcon = () =>
<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>;


const TikTokIcon = () =>
<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" />
  </svg>;


const XIcon = () =>
<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>;


export const PersonalHero = () => {
  return (
    <section className="relative flex flex-col items-center text-center overflow-hidden bg-white py-16 md:py-24">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-5">

          <Zap className="w-4 h-4 fill-primary" />
          <span>Share Everything in One Tap</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.1] mb-4">

          One link for{" "}
          <span className="text-primary">everything.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 max-w-md">

          Share all your links from one beautiful profile — works on any phone.{" "}
          <span className="font-semibold text-foreground">Set up in under 2 minutes.</span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-4">

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Link
              to="/personal/pricing"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl bg-foreground text-background font-bold text-base shadow-lg shadow-foreground/20 hover:shadow-xl transition-all">

              Get Your TapAway
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <a
              href="https://tapaway.co/jorge"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl border border-border bg-background text-foreground font-semibold text-base hover:bg-muted transition-all">

              See a Live Profile
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xs text-muted-foreground mb-10 md:mb-14">

          Free plan available • Pro from $6.25/mo
        </motion.p>

        {/* Phone Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[340px]">

          {/* Phone bezel */}
          <div className="rounded-[2.5rem] bg-gradient-to-b from-zinc-800 to-zinc-900 p-3 shadow-2xl shadow-black/30">
            {/* Notch */}
            

            {/* Screen */}
            <div
              className="rounded-[2rem] overflow-hidden relative"
              style={{ backgroundColor: PROFILE.bg }}>

              {/* Banner */}
              <div className="relative h-28">
                <img src={PROFILE.banner} alt="" className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to bottom, transparent 40%, ${PROFILE.bg} 100%)` }} />

              </div>

              {/* Profile content */}
              <div className="px-5 pb-5 -mt-10 relative z-10">
                {/* PFP */}
                <div className="flex justify-center mb-2">
                  <img
                    src={PROFILE.pfp}
                    alt={PROFILE.name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-[#1a1a1a] shadow-lg" />

                </div>

                {/* Name & bio */}
                <div className="text-center mb-3">
                  <h3 className="text-base font-bold text-white tracking-tight">{PROFILE.name}</h3>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5 px-2">{PROFILE.bio}</p>
                </div>

                {/* Social icons */}
                <div className="flex justify-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
                    <InstagramIcon />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-black border border-zinc-700 flex items-center justify-center">
                    <TikTokIcon />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-black border border-zinc-700 flex items-center justify-center">
                    <XIcon />
                  </div>
                </div>

                {/* Grid cards */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[LINKS.instagram, LINKS.tiktok].map((link) =>
                  <div key={link.label} className="rounded-xl overflow-hidden bg-zinc-800/80 border border-zinc-700/50">
                      <img src={link.cover} alt={link.label} className="w-full h-20 object-cover" />
                      <div className="px-2.5 py-2">
                        <p className="text-[11px] font-semibold text-white truncate">{link.label}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* X pill */}
                <div className="rounded-xl bg-zinc-800/80 border border-zinc-700/50 px-3.5 py-2.5 flex items-center gap-2.5 mb-2">
                  <div className="w-5 h-5 rounded-full bg-black border border-zinc-600 flex items-center justify-center flex-shrink-0">
                    <XIcon />
                  </div>
                  <span className="text-[11px] font-semibold text-white">X</span>
                  <ArrowRight className="w-3 h-3 text-zinc-500 ml-auto flex-shrink-0" />
                </div>

                {/* CTA block */}
                <div className="rounded-xl overflow-hidden mb-2">
                  <img src={CTA_BLOCK} alt="Start using TapAway" className="w-full h-14 object-cover" />
                </div>

                {/* Collage */}
                <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
                  {COLLAGE.map((src, i) =>
                  <img key={i} src={src} alt="" className="w-full h-14 object-cover" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Handle badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-5">

          <a
            href="https://tapaway.co/jorge"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 bg-card rounded-xl shadow-lg border border-border px-6 py-3 hover:shadow-xl transition-all">

            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Live profile</p>
              <p className="text-lg font-bold text-foreground">
                tapaway.co/<span className="text-primary">jorge</span>
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        </motion.div>
      </div>
    </section>);

};