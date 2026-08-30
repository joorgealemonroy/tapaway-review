interface CardCustomizerProps {
  logoUrl?: string | null;
  businessName?: string;
  headline: string;
  subHeadline: string;
  onHeadlineChange: (value: string) => void;
  onSubHeadlineChange: (value: string) => void;
}

const CARD_SHELL =
  "relative w-full max-w-[320px] aspect-[153.12/247.92] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden";

const LogoOverlay = ({ logoUrl, size }: { logoUrl?: string | null; size: string }) => {
  if (!logoUrl) return null;
  return (
    <div
      className="absolute rounded-full overflow-hidden"
      style={{
        left: "50%",
        top: "48.5%",
        width: size,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
      }}
    >
      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
    </div>
  );
};

const CardFront = ({
  logoUrl,
  headline,
  subHeadline,
}: {
  logoUrl?: string | null;
  headline: string;
  subHeadline: string;
}) => (
  <div
    className={CARD_SHELL}
    style={{
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(-4deg)",
    }}
  >
    <img src="/tapaway-card-front-v2.svg" alt="TapAway card front" className="w-full h-full object-cover" />

    {/* Custom headline block — covers the artwork's default copy */}
    <div
      className="absolute left-0 right-0 bg-white flex flex-col items-center justify-center px-5 text-center"
      style={{ top: "15%", height: "13.5%" }}
    >
      <p className="text-[13px] font-bold text-black leading-tight">
        {headline || "Menu, reviews, socials & more."}
      </p>
      <p className="text-[13px] font-bold text-black leading-tight">
        {subHeadline || "Tap or scan to explore."}
      </p>
    </div>

    <LogoOverlay logoUrl={logoUrl} size="65%" />
  </div>
);

const CardBack = ({ logoUrl }: { logoUrl?: string | null }) => (
  <div
    className={CARD_SHELL}
    style={{
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(4deg)",
    }}
  >
    <img src="/tapaway-card-back-v2.svg" alt="TapAway card back" className="w-full h-full object-cover" />
    <LogoOverlay logoUrl={logoUrl} size="88%" />
  </div>
);

const CardCustomizer = ({
  logoUrl,
  headline,
  subHeadline,
  onHeadlineChange,
  onSubHeadlineChange,
}: CardCustomizerProps) => {
  return (
    <div className="space-y-6">
      {/* Input fields */}
      <div className="space-y-3">
        <div>
          <label className="text-gray-400 text-xs font-medium mb-1 block">Card Headline</label>
          <input
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
            placeholder="Loved your visit? Leave us a review!"
            className="w-full h-10 px-3 bg-[#111827] border border-white/10 text-white text-sm rounded-xl placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs font-medium mb-1 block">Card Sub-headline</label>
          <input
            value={subHeadline}
            onChange={(e) => onSubHeadlineChange(e.target.value)}
            placeholder="Tap or Scan below to share your experience."
            className="w-full h-10 px-3 bg-[#111827] border border-white/10 text-white text-sm rounded-xl placeholder:text-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Card previews */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Front</span>
          <CardFront logoUrl={logoUrl} headline={headline} subHeadline={subHeadline} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Back</span>
          <CardBack logoUrl={logoUrl} />
        </div>
      </div>
    </div>
  );
};

export default CardCustomizer;
