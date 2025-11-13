const TapAwayCard3D = () => {
  return (
    <div className="flex justify-center items-center my-12 relative" style={{ perspective: '1100px' }}>
      <div style={{ transform: 'rotateZ(12deg)' }}>
        <div 
          className="animate-[spin-3d_12s_ease-in-out_infinite]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div 
            className="relative"
            style={{ 
              width: 'min(208px, 70vw)', 
              aspectRatio: '1/1.586',
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Front face - Teal gradient with TapAway branding */}
            <div 
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-white"
              style={{
                backfaceVisibility: 'hidden',
                boxShadow: '0 18px 40px rgba(10,20,40,0.28), inset 0 1px 0 rgba(255,255,255,0.2)',
                background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #155e75 100%)'
              }}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-2xl font-black tracking-tight mb-2">TapAway</div>
              <div className="text-sm font-medium opacity-90">Tap to Review</div>
            </div>
            
            {/* Back face - Dark slate with review prompt */}
            <div 
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-white"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: '0 18px 40px rgba(10,20,40,0.28)',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)'
              }}
            >
              <div className="text-center">
                <div className="text-xl font-bold mb-2">How was your visit?</div>
                <div className="text-sm opacity-80">Leave us a review!</div>
                <div className="mt-4 flex gap-2 justify-center">
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
