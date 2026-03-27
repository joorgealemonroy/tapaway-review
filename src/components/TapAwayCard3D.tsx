const TapAwayCard3D = () => {
  return (
    <div className="flex justify-center items-center" style={{ perspective: "1100px" }}>
      <div style={{ transform: "rotateZ(12deg)" }}>
        <div className="animate-[spin-3d_12s_ease-in-out_infinite]" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="relative rounded-2xl"
            style={{
              width: "min(240px, 70vw)",
              aspectRatio: "2.125 / 3.375",
              transformStyle: "preserve-3d",
              borderRadius: "1rem",
            }}
          >
            {/* FRONT */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: "hidden",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
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
