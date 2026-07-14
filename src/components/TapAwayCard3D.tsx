interface TapAwayCard3DProps {
  logoUrl?: string;
  businessName?: string;
  staticTilt?: boolean;
}

const TapAwayCard3D = ({ logoUrl, businessName, staticTilt }: TapAwayCard3DProps) => {
  return (
    <div className="flex justify-center items-center" style={{ perspective: "1100px" }}>
      <div style={{ transform: staticTilt ? "none" : "rotateZ(12deg)" }}>
        <div
          className={staticTilt ? "" : "animate-[spin-3d_12s_ease-in-out_infinite]"}
          style={{
            transformStyle: "preserve-3d",
            willChange: "transform",
            ...(staticTilt ? { transform: "rotateY(0deg)" } : {}),
          }}
        >
          <div
            className="relative"
            style={{
              width: "min(240px, 70vw)",
              aspectRatio: "2.125 / 3.375",
              transformStyle: "preserve-3d",
              borderRadius: "1.5rem",
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
              WebkitFontSmoothing: "antialiased",
              transform: "translateZ(0)",
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: "1.5rem",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                transform: "translateZ(0)",
                isolation: "isolate",
              }}
            >

              <img
                src="/tapaway-card-front.svg"
                alt="TapAway card front"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-cover rounded-2xl"
              />

              {/* Logo overlay — centered on the card face */}
              {logoUrl && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ top: "-8%" }}>
                  <img
                    src={logoUrl}
                    alt="Your logo"
                    className="w-[60px] h-[60px] rounded-full object-cover border-2 border-white/20 shadow-lg"
                  />
                </div>
              )}

              {/* Business name — bottom of card face */}
              {businessName && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-3 pointer-events-none">
                  <span className="text-[9px] font-bold text-white/90 tracking-wide truncate max-w-[80%] text-center drop-shadow-md">
                    {businessName}
                  </span>
                </div>
              )}
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
              }}
            >
              <img
                src="/tapaway-card-back.svg"
                alt="TapAway card back"
                className="w-full h-full object-cover rounded-2xl"
                style={{ transform: "rotate(180deg)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {!staticTilt && (
        <style>
          {`
            @keyframes spin-3d {
              0% { transform: rotateY(0deg); }
              50% { transform: rotateY(180deg); }
              100% { transform: rotateY(360deg); }
            }
          `}
        </style>
      )}
    </div>
  );
};

export default TapAwayCard3D;
