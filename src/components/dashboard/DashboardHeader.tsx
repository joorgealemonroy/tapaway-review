import { Button } from "@/components/ui/button";
import { ExternalLink, LogOut } from "lucide-react";
import { DashboardSwitcher } from "./DashboardSwitcher";

interface DashboardHeaderProps {
  restaurantName: string;
  customSlug: string | null;
  onSignOut: () => void;
}

export const DashboardHeader = ({ restaurantName, customSlug, onSignOut }: DashboardHeaderProps) => {
  const hubUrl = customSlug ? `https://tapaway.co/${customSlug}` : null;

  return (
    <div className="sticky top-0 z-50 gradient-header border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-base">TapAway</span>
              <span className="text-white/70 text-xs">{restaurantName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <DashboardSwitcher currentType="business" variant="header" />
            {hubUrl && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => window.open(hubUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Hub
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
              onClick={onSignOut}
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};