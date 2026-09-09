import { Activity, MessageSquare, MessageCircle, UtensilsCrossed, MoreHorizontal, BarChart3, Settings, HelpCircle, CreditCard } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface BusinessMobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDemoView?: boolean;
}

const PRIMARY_TABS = [
  { value: "overview", label: "Overview", icon: Activity },
  { value: "replies", label: "Replies", icon: MessageSquare },
  { value: "menu", label: "Menu", icon: UtensilsCrossed },
];

const MORE_TABS_FULL = [
  { value: "engagement", label: "Engagement", icon: BarChart3, description: "Promotions & polls" },
  { value: "sms", label: "SMS", icon: MessageCircle, description: "Text your customers" },
  { value: "settings", label: "Settings", icon: Settings, description: "Hub links & branding" },
  { value: "support", label: "Support", icon: HelpCircle, description: "Get help from TapAway" },
  { value: "billing", label: "Billing", icon: CreditCard, description: "Plan & invoices" },
];

const MORE_TABS_DEMO = [
  { value: "engagement", label: "Engagement", icon: BarChart3, description: "Promotions & polls" },
];

export const BusinessMobileNav = ({ activeTab, onTabChange, isDemoView = false }: BusinessMobileNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const MORE_TABS = isDemoView ? MORE_TABS_DEMO : MORE_TABS_FULL;
  const isMoreActive = MORE_TABS.some(tab => tab.value === activeTab);

  const handleTabClick = (value: string) => {
    onTabChange(value);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleMoreTabClick = (value: string) => {
    onTabChange(value);
    setMoreOpen(false);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
        <div className="flex items-stretch justify-around h-16">
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabClick(tab.value)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-1 min-h-[64px] min-w-[64px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className={cn("text-xs font-medium", isActive && "text-primary")}>{tab.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1 min-h-[64px] min-w-[64px] transition-colors relative",
              isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "text-primary")} />
            <span className={cn("text-xs font-medium", isMoreActive && "text-primary")}>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">More Options</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {MORE_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleMoreTabClick(tab.value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl transition-colors min-h-[60px]",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                    isActive ? "bg-primary/20" : "bg-muted"
                  )}>
                    <tab.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={cn("font-medium", isActive && "text-primary")}>{tab.label}</p>
                    <p className="text-xs text-muted-foreground">{tab.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
