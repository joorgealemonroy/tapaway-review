import { useState } from "react";
import { Check } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  fullName: string;
  username: string;
  profilePhotoUrl: string | null;
  cardHeadline?: string;
}

export const TapAwayCardPreview = ({ 
  fullName, 
  username, 
  profilePhotoUrl,
  cardHeadline = "Tap to Connect &\nCollaborate"
}: Props) => {
  const [side, setSide] = useState<"front" | "back">("front");

  const profileUrl = `tapaway.co/${username || "yourname"}`;

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSide("front")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            side === "front"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Front
        </button>
        <button
          onClick={() => setSide("back")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            side === "back"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Back
        </button>
      </div>

      {/* Card - EXACT 2.3" x 3.35" aspect ratio (0.687) */}
      <div 
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 shadow-lg mx-auto"
        style={{ 
          aspectRatio: "2.3/3.35",
          maxWidth: "280px",
          width: "100%",
        }}
      >
        {side === "front" ? (
          /* Front of card - PIXEL-PERFECT match to reference */
          <div className="absolute inset-0 bg-[#f5f5f5] rounded-2xl flex flex-col items-center pt-[8%] px-[8%] pb-[6%]">
            {/* Top row: Name + Verified checkmark - same line */}
            <div className="w-full flex items-center justify-center gap-2 mb-[4%]">
              {fullName && (
                <span 
                  className="font-bold text-[#1a1a1a] truncate"
                  style={{ fontSize: "clamp(16px, 5vw, 22px)" }}
                >
                  {fullName}
                </span>
              )}
              <div className="h-8 w-8 bg-[#1DA1F2] rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="h-5 w-5 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Large green circle with profile photo - centered */}
            <div 
              className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 mt-2"
              style={{
                width: "72%",
                aspectRatio: "1/1",
                backgroundColor: "#6BCB77",
              }}
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={fullName || "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            {/* Headline text - exactly matching reference typography */}
            <p 
              className="text-center mt-[12%] px-2 leading-tight"
              style={{
                fontSize: "clamp(13px, 4vw, 16px)",
                fontWeight: 700,
                color: "#1a1a1a",
                whiteSpace: "pre-line",
              }}
            >
              {cardHeadline}
            </p>

            {/* Spacer */}
            <div className="flex-1 min-h-[4%]" />

            {/* NFC + QR icons row with center divider */}
            <div className="flex items-center justify-center gap-[6%] mb-[4%]">
              {/* NFC/Phone tap icon - matching reference illustration style */}
              <svg 
                viewBox="0 0 80 80" 
                fill="none" 
                className="text-[#1a1a1a]"
                style={{ width: "18%", aspectRatio: "1/1" }}
              >
                {/* Hand outline */}
                <ellipse cx="28" cy="68" rx="18" ry="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                {/* Phone body */}
                <rect x="12" y="14" width="32" height="50" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                {/* Screen area */}
                <rect x="16" y="20" width="24" height="36" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                {/* Checkmark circle on screen */}
                <circle cx="28" cy="38" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M23 38l4 4 8-8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                {/* NFC waves */}
                <path d="M52 32c5 3 8 8 8 14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M58 26c7 4 12 12 12 20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </svg>
              
              {/* Vertical divider - matching reference thickness */}
              <div 
                className="bg-[#ccc]" 
                style={{ width: "1px", height: "15%" }}
              />
              
              {/* QR Code - matching reference size */}
              <div className="bg-white p-[3%] rounded" style={{ width: "18%" }}>
                <QRCode 
                  value={`https://${profileUrl}`}
                  size={100}
                  level="L"
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            </div>

            {/* Bottom tagline - exact match */}
            <p 
              className="text-center"
              style={{
                fontSize: "clamp(11px, 3.2vw, 13px)",
                fontWeight: 700,
                color: "#1a1a1a",
                marginBottom: "2%",
              }}
            >
              All your links. One tap.
            </p>

            {/* TapAway.co footer - matching reference opacity/style */}
            <p 
              className="text-center"
              style={{
                fontSize: "clamp(9px, 2.8vw, 11px)",
                fontWeight: 500,
                color: "#888",
              }}
            >
              TapAway.co
            </p>
          </div>
        ) : (
          /* Back of card - clean QR focus, same aspect ratio */
          <div className="absolute inset-0 bg-[#f5f5f5] rounded-2xl flex flex-col items-center justify-center gap-[6%] p-[10%]">
            {/* Large QR Code */}
            <div className="bg-white p-[4%] rounded-xl shadow-sm" style={{ width: "65%" }}>
              <QRCode 
                value={`https://${profileUrl}`}
                size={200}
                level="M"
                style={{ width: "100%", height: "auto" }}
              />
            </div>
            <div className="text-center">
              <p 
                className="font-semibold text-[#1a1a1a]"
                style={{ fontSize: "clamp(12px, 3.5vw, 14px)" }}
              >
                Scan to connect
              </p>
              <p 
                className="text-[#888] mt-1"
                style={{ fontSize: "clamp(10px, 3vw, 12px)" }}
              >
                {profileUrl}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
