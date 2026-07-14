import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface ExpiredHubGateProps {
  businessName: string;
  restaurantId: string;
}

export const ExpiredHubGate = ({ businessName, restaurantId }: ExpiredHubGateProps) => {
  const navigate = useNavigate();

  const handleUnlock = () => {
    navigate(`/paywall?restaurant=${restaurantId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative">
      {/* Wordmark top-left */}
      <div className="absolute top-0 left-0 px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">TapAway</span>
      </div>

      {/* Centered content */}
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-8 w-16 h-16 rounded-full bg-[#111827] border border-white/10 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-4">
            Review Page Paused
          </h1>

          <p className="text-gray-400 leading-relaxed mb-10 max-w-sm mx-auto">
            This TapAway custom digital profile is currently inactive. If you are
            the owner of <span className="text-white">{businessName}</span> and
            want to reactivate your review card, tap the button below.
          </p>

          <Button
            onClick={handleUnlock}
            size="lg"
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8"
          >
            Unlock My Hub
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpiredHubGate;
