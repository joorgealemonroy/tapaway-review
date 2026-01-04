const PersonalCard3D = () => {
  return (
    <div className="flex justify-center items-center" style={{ perspective: "1100px" }}>
      <div style={{ transform: "rotateZ(12deg)" }}>
        <div className="animate-[spin-3d_12s_ease-in-out_infinite]" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="relative"
            style={{
              width: "min(220px, 70vw)",
              aspectRatio: "1 / 1.586",
              transformStyle: "preserve-3d",
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
                src="/tapaway-personal-front.png" 
                alt="TapAway personal card front" 
                loading="lazy" 
                className="w-full h-full object-cover" 
              />
            </div>

            {/* BACK - Empty/minimal */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden bg-white"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
              }}
            />
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

export default PersonalCard3D;
