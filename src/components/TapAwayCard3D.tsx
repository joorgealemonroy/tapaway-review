import { useState, useEffect } from "react";

const restaurants = [
  "Las Islas Marias",
  "Las Nuevas Islas",
  "Sakura Sushi",
  "The Golden Fork",
  "Bella Italia",
  "Blue Lagoon Café",
  "Smoky BBQ",
  "Fresh Greens",
];

const TapAwayCard3D = () => {
  const [activeSet, setActiveSet] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSet((prev) => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const firstHalf = restaurants.slice(0, 4);
  const secondHalf = restaurants.slice(4, 8);
  const currentSet = activeSet === 0 ? firstHalf : secondHalf;

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
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                background: "linear-gradient(145deg, hsl(var(--foreground)), hsl(var(--foreground) / 0.85))",
              }}
            >
              <div className="grid grid-cols-2 gap-2 w-full flex-1 content-center">
                {currentSet.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-center rounded-lg px-1.5 py-2 text-center animate-fade-in"
                    style={{
                      background: "hsl(var(--background) / 0.1)",
                      border: "1px solid hsl(var(--background) / 0.15)",
                    }}
                  >
                    <span
                      className="text-[9px] font-bold leading-tight tracking-wide"
                      style={{ color: "hsl(var(--background) / 0.9)" }}
                    >
                      {name}
                    </span>
                  </div>
                ))}
              </div>
              <p
                className="text-[8px] mt-2 font-medium tracking-wider uppercase"
                style={{ color: "hsl(var(--background) / 0.5)" }}
              >
                Trusted by local restaurants
              </p>
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
