import { useState } from "react";
import { CheckCircle2, Wifi } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  fullName: string;
  username: string;
  profilePhotoUrl: string | null;
}

export const TapAwayCardPreview = ({ fullName, username, profilePhotoUrl }: Props) => {
  const [side, setSide] = useState<"front" | "back">("front");

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

      {/* Card */}
      <div 
        className="relative aspect-[1.586/1] rounded-2xl overflow-hidden transition-transform duration-300"
        style={{ perspective: "1000px" }}
      >
        {side === "front" ? (
          /* Front of card */
          <div className="absolute inset-0 bg-foreground rounded-2xl p-5 flex flex-col justify-between">
            {/* Top row: NFC icon */}
            <div className="flex justify-end">
              <div className="flex items-center gap-1.5 opacity-60">
                <Wifi className="h-4 w-4 text-background rotate-45" />
              </div>
            </div>

            {/* Bottom section */}
            <div className="space-y-3">
              {/* Profile row */}
              <div className="flex items-center gap-3">
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={fullName}
                    className="h-12 w-12 rounded-full object-cover border-2 border-background/20"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-background/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-background">
                      {fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm text-background flex items-center gap-1">
                    {fullName || "Your Name"}
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  </p>
                </div>
              </div>

              {/* Tagline & URL */}
              <div>
                <p className="text-xs text-background/70">Tap to Connect & Collaborate</p>
                <p className="text-xs text-background/50 mt-0.5">
                  tapaway.co/{username || "yourname"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Back of card */
          <div className="absolute inset-0 bg-background border border-border rounded-2xl flex flex-col items-center justify-center gap-4 p-6">
            {/* QR Code */}
            <div className="bg-white p-3 rounded-xl">
              <QRCode 
                value={`https://tapaway.co/${username || "yourname"}`}
                size={80}
                level="M"
              />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Scan to connect</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                tapaway.co/{username || "yourname"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
