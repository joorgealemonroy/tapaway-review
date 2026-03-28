import { Star, Smartphone, Wifi, QrCode } from "lucide-react";

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
    className="w-full max-w-[320px] aspect-[54/86] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    style={{
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(-4deg)",
    }}
  >
    <div className="flex flex-col items-center justify-between h-full text-center p-6">
      {/* Stars */}
      <div className="flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      {/* Headline */}
      <p className="text-lg font-normal text-gray-800 leading-snug mt-3">
        {headline || "Loved your visit? Leave us a review!"}
      </p>

      {/* Sub-headline */}
      <p className="text-sm font-normal text-gray-800 mt-1">
        {subHeadline || "Tap or Scan below to share your experience."}
      </p>

      {/* Logo circle */}
      <div className="w-48 h-48 rounded-full bg-[#707070] flex items-center justify-center my-auto flex-shrink-0 overflow-hidden">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-black text-3xl leading-none tracking-tight text-center">
            YOUR<br />LOGO<br />HERE
          </span>
        )}
      </div>

      {/* Bottom icons row */}
      <div className="flex items-center justify-center w-full h-16 mb-4">
        {/* NFC tap icon */}
        <div className="flex items-center gap-1">
          <Smartphone className="w-10 h-10 text-black" />
          <Wifi className="w-8 h-8 text-black -ml-2 rotate-90" />
        </div>

        <div className="h-full w-px bg-black mx-4" />

        {/* QR code icon */}
        <QrCode className="w-16 h-16 text-black" />
      </div>

      {/* Footer URL */}
      <p className="font-black text-xs text-black pb-2 tracking-wide">tapaway.co</p>
    </div>
  </div>
);

const CardBack = ({ logoUrl }: { logoUrl?: string | null }) => (
  <div
    className="w-full max-w-[320px] aspect-[54/86] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    style={{
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(4deg)",
    }}
  >
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      {/* Logo circle */}
      <div className="w-36 h-36 rounded-full bg-[#707070] flex items-center justify-center overflow-hidden mb-6">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-black text-2xl leading-none tracking-tight text-center">
            YOUR<br />LOGO<br />HERE
          </span>
        )}
      </div>

      {/* QR code placeholder */}
      <div className="w-20 h-20 border-2 border-gray-300 rounded-lg flex items-center justify-center mb-4">
        <QrCode className="w-14 h-14 text-black" />
      </div>

      {/* Footer URL */}
      <p className="font-black text-xs text-black pb-2 tracking-wide">tapaway.co</p>
    </div>
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
