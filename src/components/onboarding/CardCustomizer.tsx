import { QrCode } from "lucide-react";

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
    className="w-[300px] sm:w-[320px] aspect-[54/86] bg-white rounded-[24px] shadow-2xl p-6 flex flex-col items-center text-center font-sans overflow-hidden border border-gray-100"
    style={{
      boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
      transform: "perspective(1000px) rotateX(8deg) rotateY(-4deg)",
    }}
  >
    {/* 1. The Stars */}
    <div className="flex items-center justify-center gap-[2px] mb-3 mt-2">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-6 h-6 text-[#FFC107]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>

    {/* 2. Customizable Text */}
    <div className="mb-5 flex flex-col items-center w-full px-2">
      <h3 className="text-[17px] leading-snug text-gray-900 font-normal mb-1">
        {headline || "Loved your visit? Leave us a review!"}
      </h3>
      <p className="text-[15px] leading-snug text-gray-900 font-normal">
        {subHeadline || "Tap or Scan below to share your experience."}
      </p>
    </div>

    {/* 3. The Massive Logo Anchor */}
    <div className="w-[200px] h-[200px] bg-[#707070] rounded-full flex items-center justify-center shrink-0 mb-auto relative overflow-hidden shadow-inner">
      {logoUrl ? (
        <img src={logoUrl} alt="Your Logo" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-black text-[34px] leading-[0.85] tracking-tighter text-center">
          YOUR<br />LOGO<br />HERE
        </span>
      )}
    </div>

    {/* 4. Bottom Actions (Tap | QR) */}
    <div className="flex items-center justify-between w-full px-4 h-20 mt-4 mb-2">
      {/* Tap Icon SVG */}
      <div className="w-16 h-16 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full text-black" fill="none" stroke="currentColor" strokeWidth="4">
          <rect x="25" y="15" width="30" height="50" rx="4" />
          <circle cx="40" cy="40" r="6" />
          <path d="M65 30 A 20 20 0 0 1 65 50" strokeLinecap="round" />
          <path d="M75 20 A 35 35 0 0 1 75 60" strokeLinecap="round" />
          <path d="M15 60 C 15 50 25 45 25 45 L 25 65" strokeLinecap="round" />
          <path d="M25 55 L 45 55" strokeLinecap="round" />
        </svg>
      </div>

      {/* The Sharp Black Divider */}
      <div className="w-[2px] h-14 bg-black mx-2"></div>

      {/* QR Code SVG */}
      <div className="w-16 h-16 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-14 h-14 text-black" fill="currentColor">
          <path fillRule="evenodd" d="M10 10h30v30H10V10zm10 10v10h10V20H20zm40-10h30v30H60V10zm10 10v10h10V20H70zM10 60h30v30H10V60zm10 10v10h10V70H20zm30-50h10v10H50V20zm0 30h10v10H50V50zm10-10h10v10H60V40zm10 10h20v10H70V50zm0 20h10v10H70V70zm10-10h10v10H80V60zm-30 20h10v10H50V80zm10-10h10v10H60V70zm10 10h20v10H70V80z" clipRule="evenodd" />
        </svg>
      </div>
    </div>

    {/* 5. Footer */}
    <div className="font-black text-[13px] text-black tracking-wide pb-1">
      tapaway.co
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
