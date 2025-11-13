import { useEffect, useRef } from "react";

const TapAwayCard3D = () => {
  const rotorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animation is handled by CSS
  }, []);

  return (
    <div className="flex justify-center items-center perspective-[1100px] my-12 relative">
      <div className="rotate-[12deg]">
        <div 
          ref={rotorRef}
          className="preserve-3d animate-[spin-3d_12s_ease-in-out_infinite]"
        >
          <div className="w-[min(208px,70vw)] aspect-[1/1.586] relative preserve-3d">
            {/* Front face */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden backface-hidden shadow-[0_18px_40px_rgba(10,20,40,0.28),inset_0_1px_0_rgba(255,255,255,0.2)] bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700 flex flex-col items-center justify-center p-6 text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-2xl font-black tracking-tight mb-2">TapAway</div>
              <div className="text-sm font-medium opacity-90">Tap to Review</div>
            </div>
            
            {/* Back face */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden backface-hidden shadow-[0_18px_40px_rgba(10,20,40,0.28)] bg-gradient-to-br from-slate-800 via-slate-900 to-black flex flex-col items-center justify-center p-6 text-white [transform:rotateY(180deg)]">
              <div className="text-center">
                <div className="text-xl font-bold mb-2">How was your visit?</div>
                <div className="text-sm opacity-80">Leave us a review!</div>
                <div className="mt-4 flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20"></div>
                  <div className="w-8 h-8 rounded-full bg-white/20"></div>
                  <div className="w-8 h-8 rounded-full bg-white/20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TapAwayCard3D;
