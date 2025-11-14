import { YelpIcon } from "@/components/icons/YelpIcon";

const TapAwayCard3D = () => {
  return (
    <div className="flex justify-center items-center" style={{ perspective: "1100px" }}>
      <div style={{ transform: "rotateZ(12deg)" }}>
        <div className="animate-[spin-3d_12s_ease-in-out_infinite]" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="relative"
            style={{
              width: "min(208px, 70vw)",
              aspectRatio: "1 / 1.586",
              transformStyle: "preserve-3d",
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-white px-5"
              style={{
                backfaceVisibility: "hidden",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
                background: "linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%)",
              }}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4 flex items-center justify-center relative">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="7" y="3" width="10" height="18" rx="2" strokeWidth={2} />
                  <circle cx="12" cy="17" r="1.1" strokeWidth={1.6} />
                </svg>
                <div className="absolute inset-0 rounded-full border border-white/40 animate-ping opacity-40" />
              </div>
              <div className="text-[22px] font-black tracking-tight mb-1">TapAway</div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] opacity-90">Tap to Review</div>
              <div className="mt-3 text-[11px] text-white/85 text-center leading-snug max-w-[170px]">
                Your guests tap once. You get more 5-star reviews without extra work.
              </div>
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between text-white p-4"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                background: "radial-gradient(circle at 0 0,#1e293b 0,#020617 40%,#020617 100%)",
              }}
            >
              <div className="text-center">
                <div className="text-[14px] font-semibold">How was your visit?</div>
                <div className="text-[11px] text-white/75 mt-1">Tap the card to leave a quick review.</div>
              </div>

              <div className="mt-3 space-y-2">
                {/* Google */}
                <div className="flex items-center gap-2 bg-white/6 rounded-full px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
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
                    <div className="text-[9px] text-white/60">Boost your public rating</div>
                  </div>
                </div>

                {/* Yelp */}
                <div className="flex items-center gap-2 bg-white/6 rounded-full px-2.5 py-1.5">
                  <div className="w-7 h-7 aspect-square rounded-full bg-[#d32323] flex items-center justify-center">
                    <YelpIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold leading-tight">Yelp Reviews</div>
                    <div className="text-[9px] text-white/60">Strengthen local reputation</div>
                  </div>
                </div>

                {/* Instagram */}
                <div className="flex items-center gap-2 bg-white/6 rounded-full px-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center">
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
                    <div className="text-[9px] text-white/60">Drive social follows & tags</div>
                  </div>
                </div>
              </div>

              <div className="text-center text-[8px] tracking-[0.16em] text-white/40 uppercase">
                Real guests · Real reviews · No extra work
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* keyframes for the spin animation */}
      <style>
        {`
          @keyframes spin-3d {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(180deg); }
            100% { transform: rotateY(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default TapAwayCard3D;
