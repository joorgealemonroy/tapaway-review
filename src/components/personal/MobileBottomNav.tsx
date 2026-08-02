import { Link2, Palette, BarChart3, MoreHorizontal, Mail, MessageSquare, Sparkles, Users, ShoppingBag, CreditCard, Moon, Sun, ArrowLeftRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ProfileInfo {
  id: string;
  username: string;
}

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAffiliate?: boolean;
  allProfiles?: ProfileInfo[];
  activeProfileId?: string;
  onSwitchProfile?: (profileId: string) => void;
  isTrialing?: boolean;
}
 
 const PRIMARY_TABS = [
   { value: "links", label: "Links", icon: Link2 },
   { value: "design", label: "Design", icon: Palette },
   { value: "analytics", label: "Stats", icon: BarChart3 },
 ];
 
const BASE_MORE_TABS = [
  { value: "shop", label: "Shop", icon: ShoppingBag, description: "Sell digital products" },
  { value: "leads", label: "Leads", icon: Mail, description: "View email captures" },
  { value: "sms", label: "SMS", icon: MessageSquare, description: "Text your subscribers" },
  { value: "plan", label: "Plan", icon: Sparkles, description: "Subscription & billing" },
  { value: "cards", label: "Cards", icon: CreditCard, description: "Request NFC cards" },
];

 
export const MobileBottomNav = ({ activeTab, onTabChange, isAffiliate, allProfiles = [], activeProfileId, onSwitchProfile, isTrialing = false }: MobileBottomNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tapaway_dashboard_theme') !== 'light');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tapaway_dashboard_theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  
  const MORE_TABS = [
    ...BASE_MORE_TABS.filter(t => !(isTrialing && t.value === "cards")),
    ...(isAffiliate ? [{ value: "affiliate", label: "Affiliate", icon: Users, description: "Your affiliate dashboard" }] : []),
  ];
   
   const isMoreActive = MORE_TABS.some(tab => tab.value === activeTab);
   
   const handleTabClick = (value: string) => {
     onTabChange(value);
     // Haptic feedback
     if (navigator.vibrate) {
       navigator.vibrate(10);
     }
   };
   
  const handleMoreTabClick = (value: string) => {
    if (value === "affiliate") {
      navigate("/affiliate");
      setMoreOpen(false);
      return;
    }
    onTabChange(value);
    setMoreOpen(false);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };
 
   return (
     <>
       {/* Bottom Navigation Bar - Only visible on mobile */}
       <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-pb">
         <div className="flex items-stretch justify-around h-16">
           {PRIMARY_TABS.map((tab) => {
             const isActive = activeTab === tab.value;
             return (
                <button
                  key={tab.value}
                  id={`mobile-nav-${tab.value}`}
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
           
           {/* More button */}
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
 
       {/* More Sheet */}
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

             {/* Switch Profile — hidden while trialing */}
             {!isTrialing && allProfiles.length > 1 && onSwitchProfile && (
               <div className="border-t border-border mt-2 pt-2">
                 {allProfiles.length === 2 ? (
                   (() => {
                     const otherProfile = allProfiles.find(p => p.id !== activeProfileId);
                     return (
                       <button
                         onClick={() => {
                           if (otherProfile) {
                             onSwitchProfile(otherProfile.id);
                             setMoreOpen(false);
                           }
                         }}
                         className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-muted"
                       >
                         <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                           <ArrowLeftRight className="h-5 w-5 text-primary" />
                         </div>
                         <div className="flex-1 text-left">
                           <p className="font-medium">Switch Profile</p>
                           <p className="text-xs text-muted-foreground">Switch to @{otherProfile?.username}</p>
                         </div>
                       </button>
                     );
                   })()
                 ) : (
                   <div>
                     <div className="flex items-center gap-4 p-4">
                       <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                         <ArrowLeftRight className="h-5 w-5 text-primary" />
                       </div>
                       <div className="flex-1 text-left">
                         <p className="font-medium">Switch Profile</p>
                         <p className="text-xs text-muted-foreground">Select an account</p>
                       </div>
                     </div>
                     <div className="pl-14 pr-4 pb-2 space-y-1">
                       {allProfiles.filter(p => p.id !== activeProfileId).map((p) => (
                         <button
                           key={p.id}
                           onClick={() => {
                             onSwitchProfile(p.id);
                             setMoreOpen(false);
                           }}
                           className="w-full text-left px-4 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors"
                         >
                           @{p.username}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}

             {/* Dark Mode Toggle */}
             <div className="border-t border-border mt-2 pt-2">
               <div className="flex items-center gap-4 p-4 rounded-xl">
                 <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                   {isDark ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                 </div>
                 <div className="flex-1 text-left">
                   <p className="font-medium">Dark Mode</p>
                   <p className="text-xs text-muted-foreground">Switch appearance</p>
                 </div>
                 <Switch checked={isDark} onCheckedChange={setIsDark} />
               </div>
             </div>
          </SheetContent>
       </Sheet>
     </>
   );
 };