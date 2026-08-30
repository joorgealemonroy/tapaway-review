interface TapAwayCard3DProps {
  logoUrl?: string;
  businessName?: string;
  staticTilt?: boolean;
  width?: string;
}

const TapAwayCard3D = ({ logoUrl, businessName, staticTilt, width = "min(240px, 70vw)" }: TapAwayCard3DProps) => {
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
              width,
              aspectRatio: "153.12 / 247.92",
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
                background: "#ffffff",
              }}
            >

              <img
                src="/tapaway-card-front-v2.svg"
                alt="TapAway card front"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-cover"
                style={{ borderRadius: "1.5rem" }}

              />

              {/* Logo overlay — fills the artwork's logo circle */}
              {logoUrl && (
                <div
                  className="absolute rounded-full overflow-hidden"
                  style={{
                    left: "50%",
                    top: "48.5%",
                    width: "66%",
                    aspectRatio: "1 / 1",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <img src={logoUrl} alt="Your logo" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Business name — bottom of card face */}
              {businessName && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-3 pointer-events-none">
                  <span className="text-[9px] font-bold text-black/80 tracking-wide truncate max-w-[80%] text-center">
                    {businessName}
                  </span>
                </div>
              )}
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                borderRadius: "1.5rem",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg) translateZ(0)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                isolation: "isolate",
                background: "#ffffff",
              }}
            >
              <img
                src="/tapaway-card-back-v2.svg"
                alt="TapAway card back"
                className="w-full h-full object-cover"
                style={{ borderRadius: "1.5rem" }}
              />
              {logoUrl && (
                <div
                  className="absolute rounded-full overflow-hidden"
                  style={{
                    left: "50%",
                    top: "48.5%",
                    width: "88%",
                    aspectRatio: "1 / 1",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <img src={logoUrl} alt="Your logo" className="w-full h-full object-cover" />
                </div>
              )}
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
