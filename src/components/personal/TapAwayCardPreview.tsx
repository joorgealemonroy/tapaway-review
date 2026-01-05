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

      {/* Card - EXACT match to reference: 2x3.5 aspect ratio */}
      <div 
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 shadow-lg mx-auto"
        style={{ 
          aspectRatio: "2/3.5",
          maxWidth: "280px",
          width: "100%",
        }}
      >
        {side === "front" ? (
          /* Front of card - PIXEL-PERFECT match to reference */
          <div className="absolute inset-0 bg-[#f5f5f5] rounded-2xl flex flex-col items-center">
            {/* Verified badge - top right positioned exactly like reference */}
            <div className="absolute top-4 right-4">
              <div className="h-8 w-8 bg-[#1DA1F2] rounded-full flex items-center justify-center shadow-sm">
                <Check className="h-5 w-5 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Large green circle - centered, matching reference size ratio */}
            <div 
              className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 mt-12"
              style={{
                width: "55%",
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
              className="text-center mt-6 px-6 leading-tight"
              style={{
                fontSize: "clamp(14px, 4.5vw, 18px)",
                fontWeight: 700,
                color: "#1a1a1a",
                whiteSpace: "pre-line",
              }}
            >
              {cardHeadline}
            </p>

            {/* Spacer to push bottom content down */}
            <div className="flex-1 min-h-4" />

            {/* NFC + QR icons row - exact positioning from reference */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {/* NFC/Phone tap icon - matching reference illustration style */}
              <svg 
                width="56" 
                height="56" 
                viewBox="0 0 80 80" 
                fill="none" 
                className="text-[#1a1a1a]"
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
              
              {/* Vertical divider - matching reference */}
              <div className="h-12 w-px bg-[#ccc]" />
              
              {/* QR Code - matching reference size */}
              <div className="bg-white p-1 rounded">
                <QRCode 
                  value={`https://${profileUrl}`}
                  size={48}
                  level="L"
                />
              </div>
            </div>

            {/* Bottom tagline - exact match */}
            <p 
              className="text-center mb-2"
              style={{
                fontSize: "clamp(12px, 3.5vw, 14px)",
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              All your links. One tap.
            </p>

            {/* TapAway.co footer - matching reference opacity/style */}
            <p 
              className="text-center mb-4"
              style={{
                fontSize: "clamp(10px, 3vw, 12px)",
                fontWeight: 500,
                color: "#888",
              }}
            >
              TapAway.co
            </p>
          </div>
        ) : (
          /* Back of card - clean QR focus */
          <div className="absolute inset-0 bg-[#f5f5f5] rounded-2xl flex flex-col items-center justify-center gap-5 p-6">
            {/* Large QR Code */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <QRCode 
                value={`https://${profileUrl}`}
                size={140}
                level="M"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#1a1a1a] mb-1">Scan to connect</p>
              <p className="text-xs text-[#888]">
                {profileUrl}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
