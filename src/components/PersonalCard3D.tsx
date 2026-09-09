import { useState, useRef } from "react";
import QRCode from "react-qr-code";

const PersonalCard3D = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startXRef.current;
    
    if (Math.abs(diff) > 50) {
      setIsFlipped(prev => !prev);
    }
    isDraggingRef.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const diff = e.clientX - startXRef.current;
    
    if (Math.abs(diff) > 50) {
      setIsFlipped(prev => !prev);
    }
    isDraggingRef.current = false;
  };

  const handleClick = () => {
    // Only flip on tap if no significant drag occurred
    if (Math.abs(startXRef.current) < 5 || !isDraggingRef.current) {
      setIsFlipped(prev => !prev);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsFlipped(prev => !prev);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <div 
        className="cursor-pointer select-none"
        style={{ perspective: "1100px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? "Card showing QR code. Tap or swipe to see front." : "Card showing front. Tap or swipe to see QR code."}
      >
        <div style={{ transform: "rotateZ(12deg)" }}>
          <div 
            style={{ 
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              willChange: "transform",
            }}
          >
            <div
              className="relative"
              style={{
                width: "min(220px, 70vw)",
                aspectRatio: "153.12 / 247.92",
                transformStyle: "preserve-3d",
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
                  alt="TapAway personal card front" 
                  loading="eager"
                  decoding="async"
                  {...({ fetchpriority: "high" } as Record<string, string>)}
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ borderRadius: "1.5rem" }}
                />

              </div>

              {/* BACK */}
              <div
                className="absolute inset-0 overflow-hidden bg-[#f5f5f5] flex flex-col items-center justify-center gap-3 p-4"
                style={{
                  borderRadius: "1.5rem",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg) translateZ(0)",
                  boxShadow: "0 18px 40px rgba(10,20,40,0.28)",
                  isolation: "isolate",
                }}
              >
                {/* QR Code */}
                <div className="bg-white p-2.5 rounded-xl shadow-sm" style={{ width: "55%" }}>
                  <QRCode 
                    value="https://tapaway.co/yourname"
                    size={120}
                    level="M"
                    style={{ width: "100%", height: "auto" }}
                  />
                </div>
                
                {/* Text */}
                <div className="text-center">
                  <p className="font-semibold text-[#1a1a1a] text-xs">
                    Tap to Connect
                  </p>
                  <p className="text-[#888] text-[10px] mt-0.5">
                    tapaway.co/yourname
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5 animate-pulse">
        <span>👆</span> Tap to flip
      </p>
    </div>
  );
};

export default PersonalCard3D;
