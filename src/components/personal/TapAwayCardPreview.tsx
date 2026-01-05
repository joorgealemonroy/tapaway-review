import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  fullName: string;
  username: string;
  profilePhotoUrl: string | null;
}

export const TapAwayCardPreview = ({ fullName, username, profilePhotoUrl }: Props) => {
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

      {/* Card - matching reference design exactly */}
      <div 
        className="relative rounded-2xl overflow-hidden transition-transform duration-300 shadow-lg"
        style={{ 
          aspectRatio: "2.5/3.5",
        }}
      >
        {side === "front" ? (
          /* Front of card - matching uploaded reference exactly */
          <div className="absolute inset-0 bg-[#f0f0f0] rounded-2xl flex flex-col items-center px-6 pt-6 pb-8">
            {/* Top row: Name + Verified badge */}
            <div className="w-full flex items-center justify-end gap-2 mb-4">
              <span className="text-sm font-semibold text-foreground truncate max-w-[60%]">
                {fullName || "Your Name"}
              </span>
              <div className="h-7 w-7 bg-[#1DA1F2] rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Large circular profile photo - replaces green circle */}
            <div 
              className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                width: "clamp(120px, 45vw, 160px)",
                height: "clamp(120px, 45vw, 160px)",
                backgroundColor: profilePhotoUrl ? "transparent" : "#6BCB77",
              }}
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-white">
                  {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                </span>
              )}
            </div>

            {/* Tagline */}
            <p className="text-base font-bold text-foreground text-center mt-6 mb-auto leading-tight">
              Tap to Connect &<br />Collaborate
            </p>

            {/* NFC + QR icons row */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {/* NFC/Phone tap icon - simplified version matching reference */}
              <svg width="52" height="52" viewBox="0 0 64 64" fill="none" className="text-foreground">
                {/* Phone body */}
                <rect x="8" y="12" width="28" height="44" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                {/* Screen */}
                <rect x="12" y="18" width="20" height="30" rx="1" stroke="currentColor" strokeWidth="1" fill="none"/>
                {/* Checkmark in circle on screen */}
                <circle cx="22" cy="33" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M18 33l3 3 6-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                {/* NFC waves */}
                <path d="M42 28c4 2 6 6 6 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M46 24c6 3 10 10 10 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                {/* Hand holding phone */}
                <ellipse cx="22" cy="58" rx="14" ry="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              </svg>
              
              <div className="h-10 w-px bg-gray-300" />
              
              {/* QR Code */}
              <div className="bg-white p-1.5 rounded">
                <QRCode 
                  value={`https://${profileUrl}`}
                  size={42}
                  level="L"
                />
              </div>
            </div>

            {/* Bottom tagline */}
            <p className="text-sm font-bold text-foreground mb-1">
              All your links. One tap.
            </p>

            {/* TapAway.co */}
            <p className="text-xs text-muted-foreground font-medium">
              TapAway.co
            </p>
          </div>
        ) : (
          /* Back of card */
          <div className="absolute inset-0 bg-background border border-border rounded-2xl flex flex-col items-center justify-center gap-5 p-8">
            {/* Larger QR Code */}
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <QRCode 
                value={`https://${profileUrl}`}
                size={120}
                level="M"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-1">Scan to connect</p>
              <p className="text-xs text-muted-foreground">
                {profileUrl}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
