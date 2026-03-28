import { Star, Smartphone, QrCode } from "lucide-react";

interface CardCustomizerProps {
  logoUrl?: string | null;
  businessName?: string;
  headline: string;
  subHeadline: string;
  onHeadlineChange: (value: string) => void;
  onSubHeadlineChange: (value: string) => void;
}

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
    className="bg-white rounded-2xl overflow-hidden flex flex-col items-center text-center relative"
    style={{
      width: "min(220px, 55vw)",
      aspectRatio: "2.125 / 3.375",
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(-4deg)",
    }}
  >
    {/* Stars */}
    <div className="flex gap-0.5 pt-5 pb-2">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
      ))}
    </div>

    {/* Headline */}
    <p className="text-slate-800 font-semibold text-[11px] leading-tight px-4 max-w-[90%]">
      {headline || "Loved your visit? Leave us a review!"}
    </p>

    {/* Sub-headline */}
    <p className="text-slate-500 text-[9px] leading-tight px-4 mt-1 max-w-[85%]">
      {subHeadline || "Tap or Scan below to share your experience."}
    </p>

    {/* Logo circle */}
    <div className="flex-1 flex items-center justify-center w-full px-6 py-3">
      <div className="w-[55%] aspect-square rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-black text-[11px] leading-tight text-center px-2 drop-shadow-sm"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
            YOUR<br />LOGO<br />HERE
          </span>
        )}
      </div>
    </div>

    {/* Bottom icons row */}
    <div className="w-full px-5 pb-2 flex items-center justify-between">
      {/* NFC tap icon */}
      <div className="flex items-center gap-1">
        <Smartphone className="w-5 h-5 text-gray-600" />
        <div className="flex flex-col">
          <div className="w-2 h-2 border border-gray-400 rounded-full" />
        </div>
      </div>

      <div className="h-8 w-px bg-gray-300" />

      {/* QR code icon */}
      <QrCode className="w-7 h-7 text-gray-700" />
    </div>

    {/* Footer URL */}
    <p className="text-[8px] font-bold text-gray-800 pb-3 tracking-wide">tapaway.co</p>
  </div>
);

const CardBack = ({ logoUrl }: { logoUrl?: string | null }) => (
  <div
    className="bg-white rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center relative"
    style={{
      width: "min(220px, 55vw)",
      aspectRatio: "2.125 / 3.375",
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(4deg)",
    }}
  >
    {/* Logo circle */}
    <div className="w-[45%] aspect-square rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-5">
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-black text-[10px] leading-tight text-center px-2 drop-shadow-sm"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
          YOUR<br />LOGO<br />HERE
        </span>
      )}
    </div>

    {/* QR code placeholder */}
    <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center mb-3">
      <QrCode className="w-10 h-10 text-gray-500" />
    </div>

    {/* Footer URL */}
    <p className="text-[8px] font-bold text-gray-800 tracking-wide">tapaway.co</p>
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
