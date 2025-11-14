const FRONT_CARD_URL =
  "https://image.typedream.com/cdn-cgi/image/width=640,format=auto,fit=scale-down,quality=100/https://api.typedream.com/v0/document/public/405c67c3-87d4-428b-a715-ca7b5a1296a1/33tc2sMHnZZKUM5odHNBQyckGZB_Copy_of_Loved_your_visit_Leave_us_a_review_Tap_or_Scan_below_to_share_your_experience_1_.png";

const BACK_CARD_URL =
  "https://image.typedream.com/cdn-cgi/image/width=640,format=auto,fit=scale-down,quality=100/https://api.typedream.com/v0/document/public/405c67c3-87d4-428b-a715-ca7b5a1296a1/33te8luDAUy35SkNiip4OSFmv56_2.png";

const TapAwayCard3D = () => {
  return (
    <div className="flex justify-center items-center" style={{ perspective: "1100px" }}>
      <div style={{ transform: "rotateZ(12deg)" }}>
        <div className="animate-[spin-3d_12s_ease-in-out_infinite]" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="relative"
            style={{
              width: "min(208px, 70vw)",
              aspectRatio: "1 / 1.586", // credit-card proportion
              transformStyle: "preserve-3d",
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28), inset 0 1px 0 rgba(255,255,255,0.2)",
                backgroundColor: "#020617",
              }}
            >
              <img
                src={FRONT_CARD_URL}
                alt="TapAway card front"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            {/* BACK */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                backgroundColor: "#020617",
              }}
            >
              <img src={BACK_CARD_URL} alt="TapAway card back" className="w-full h-full object-cover" loading="lazy" />
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
