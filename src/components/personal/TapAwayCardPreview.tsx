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

      {/* Card - matching reference design */}
      <div 
        className="relative rounded-2xl overflow-hidden transition-transform duration-300"
        style={{ 
          aspectRatio: "2.5/3.5",
          perspective: "1000px" 
        }}
      >
        {side === "front" ? (
          /* Front of card - matching reference design exactly */
          <div className="absolute inset-0 bg-[#f5f5f5] rounded-2xl flex flex-col items-center px-6 py-8">
            {/* Verified badge in top right */}
            <div className="absolute top-6 right-6">
              <div className="h-8 w-8 bg-[#1DA1F2] rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* Large circular profile photo area - green circle like reference */}
            <div className="mt-4 mb-6">
              <div 
                className="rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  width: "min(55vw, 180px)",
                  height: "min(55vw, 180px)",
                  backgroundColor: "#6BCB77",
                }}
              >
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-white">
                    {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
            </div>

            {/* Name with verified badge inline */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-foreground">
                {fullName || "Your Name"}
              </h2>
              <CheckCircle2 className="h-5 w-5 text-[#1DA1F2]" />
            </div>

            {/* Tagline */}
            <p className="text-base font-semibold text-foreground text-center mb-6">
              Tap to Connect &<br />Collaborate
            </p>

            {/* NFC + QR icons row */}
            <div className="flex items-center gap-4 mb-4">
              {/* NFC/Phone tap icon */}
              <div className="flex items-center">
                <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="opacity-80">
                  <rect x="16" y="8" width="24" height="44" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                  <circle cx="28" cy="30" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M22 30a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-45 28 30)" />
                  <path d="M18 30a10 10 0 0 1 20 0" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(-45 28 30)" />
                  <path d="M14 30a14 14 0 0 1 28 0" stroke="currentColor" strokeWidth="1.5" fill="none" transform="rotate(-45 28 30)" />
                  <circle cx="28" cy="16" r="2" fill="currentColor"/>
                </svg>
              </div>
              
              <div className="h-12 w-px bg-border" />
              
              {/* QR Code */}
              <div className="bg-white p-2 rounded-lg">
                <QRCode 
                  value={`https://${profileUrl}`}
                  size={44}
                  level="L"
                />
              </div>
            </div>

            {/* Tagline text */}
            <p className="text-sm font-semibold text-foreground mb-2">
              All your links. One tap.
            </p>

            {/* TapAway.co */}
            <p className="text-xs text-muted-foreground">
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
