const TapAwayCard3D = () => {
  return (
    <div className="flex justify-center items-center my-12 relative" style={{ perspective: "1100px" }}>
      <div style={{ transform: "rotateZ(12deg)" }}>
        <div className="animate-[spin-3d_12s_ease-in-out_infinite]" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="relative"
            style={{
              width: "min(208px, 70vw)",
              aspectRatio: "1/1.586",
              transformStyle: "preserve-3d",
            }}
          >
            {/* FRONT FACE — like your TapAway card front */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-white"
              style={{
                backfaceVisibility: "hidden",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
                background: "linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%)",
              }}
            >
              {/* NFC ripple / phone icon */}
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4 flex items-center justify-center relative">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="7" y="3" width="10" height="18" rx="2" strokeWidth={2} />
                  <circle cx="12" cy="17" r="1" strokeWidth={1.8} />
                </svg>
                <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-40" />
              </div>

              <div className="text-[22px] font-black tracking-tight mb-1">TapAway</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] opacity-90">Tap to Review</div>

              {/* Subline to mimic real card copy */}
              <div className="mt-3 text-[11px] text-white/80 text-center leading-snug max-w-[160px]">
                Hold your phone near the card and follow the prompts to leave a quick review.
              </div>
            </div>

            {/* BACK FACE — like your review side with logos */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-between p-5 text-white"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                background: "linear-gradient(145deg, #0f172a 0%, #020617 60%, #111827 100%)",
              }}
            >
              {/* Top text */}
              <div className="w-full text-center">
                <div className="text-[14px] font-semibold tracking-tight">How was your visit?</div>
                <div className="mt-1 text-[11px] text-white/75">Scan or tap to leave a quick review.</div>
              </div>

              {/* “Buttons” row – Google / Yelp / Instagram */}
              <div className="mt-3 mb-1 w-full flex flex-col gap-2">
                {/* Google */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                    {/* Simplified Google G */}
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path
                        fill="#EA4335"
                        d="M12 10.2v3.7h5.2c-.2 1.2-.9 2.3-2 3.1l3.3 2.6C20.4 18.3 21.2 16.3 21.2 14c0-.7-.1-1.3-.2-1.9H12z"
                      />
                      <path
                        fill="#34A853"
                        d="M6.6 13.8l-.6.5-2.6 2c1.3 2.6 3.9 4.4 7 4.4 2.1 0 3.9-.7 5.2-2l-3.3-2.6c-.6.4-1.4.7-1.9.7-1.9 0-3.4-1.3-3.9-3z"
                      />
                      <path
                        fill="#4A90E2"
                        d="M3.4 8.3C2.8 9.5 2.5 10.7 2.5 12s.3 2.5.9 3.7l3.9-3c-.2-.6-.3-.8-.3-1.3 0-.4.1-.9.3-1.3L3.4 8.3z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.4 7.1c1 0 1.9.3 2.6 1l2.2-2.2C14.3 4.7 12.6 4 10.5 4 7.4 4 4.7 5.8 3.4 8.3l3.9 3c.4-1.8 1.9-3 3.1-3z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold leading-tight">Google Reviews</div>
                    <div className="text-[9px] text-white/60">Public rating on Google</div>
                  </div>
                </div>

                {/* Yelp */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#af0617] flex items-center justify-center">
                    {/* Simple Yelp burst icon */}
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                      <path d="M10.4 3.2c-.3-.9-1.6-.8-1.8.1L7 9.5c-.1.6.3 1.1.8 1.3l1.7.5c.6.2 1.2-.2 1.3-.8l.7-5.9c0-.4-.3-.9-.8-1zM6.3 13.3l-3.5-.4c-1-.1-1.4 1.2-.5 1.7l3.2 1.9c.5.3 1.1.1 1.4-.3l.9-1.5c.3-.5.1-1.2-.5-1.4zM9.1 15.5l-1 3.4c-.3.9.7 1.7 1.5 1.2l3-1.9c.5-.3.7-.9.4-1.4l-.8-1.5c-.3-.5-1-.7-1.5-.4l-1.6.8zM15.3 13.7l2.8 2.5c.7.6 1.9.1 1.8-.9L19.6 11c-.1-.6-.6-1-1.2-.9l-1.8.2c-.6.1-1 .7-.9 1.3l.6 2.1zM14.4 10.6l1.7-.7c.6-.2.9-.9.6-1.5L14.4 4c-.5-.9-1.9-.6-2 .4l-.2 4.7c0 .6.4 1.1 1 1.3l1.2.2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold leading-tight">Yelp Reviews</div>
                    <div className="text-[9px] text-white/60">Local review profile</div>
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
                    {/* IG camera */}
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                    >
                      <rect x="5" y="5" width="14" height="14" rx="4" ry="4" />
                      <circle cx="12" cy="12" r="3.2" />
                      <circle cx="16.2" cy="7.8" r="0.8" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold leading-tight">Instagram</div>
                    <div className="text-[9px] text-white/60">Follow and tag the restaurant</div>
                  </div>
                </div>
              </div>

              {/* Tiny footer line */}
              <div className="w-full text-center text-[8px] tracking-[0.16em] text-white/40 uppercase">
                Real reviews · Real guests · No extra work
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TapAwayCard3D;
