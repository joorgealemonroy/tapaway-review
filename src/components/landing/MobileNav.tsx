import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, LayoutDashboard, UserPlus, Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export const MobileNav = () => {
  const { user, signOut } = useAuth();
  const { isSalesRep } = useSalesRep();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tapaway_dashboard_theme') !== 'light');
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tapaway_dashboard_theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  
  const dashboardLink = isSalesRep ? "/rep" : "/select-dashboard";

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <nav className="md:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      {/* Row 1: Logo + Menu */}
      <div className="flex items-center justify-between px-4 h-14">
        <a 
          href="https://tapaway.co" 
          className="font-black text-xl tracking-tight text-foreground"
        >
          TapAway
        </a>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button 
              className="flex items-center justify-center w-11 h-11 -mr-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <span className="font-bold text-foreground">Menu</span>
              </div>
              
              {/* Menu Items */}
              <div className="flex-1 py-4 px-4 space-y-1">
                {user ? (
                  <>
                    <Link
                      to={dashboardLink}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-foreground font-medium hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground font-medium hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90 active:bg-foreground/80 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/start"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-foreground text-foreground font-semibold hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                      <UserPlus className="w-5 h-5" />
                      Start Free Trial
                    </Link>
                  </>
                )}
              </div>
              
              {/* Dark Mode Toggle */}
              <div className="border-t border-border px-4 py-2">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl">
                  {isDark ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
                  <span className="flex-1 font-medium text-foreground">Dark Mode</span>
                  <Switch checked={isDark} onCheckedChange={setIsDark} />
                </div>
              </div>

              {/* Footer Links */}
              <div className="border-t border-border px-4 py-4">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <a href="/terms" className="hover:text-foreground">Terms</a>
                  <a href="/privacy" className="hover:text-foreground">Privacy</a>
                  <a href="/refund" className="hover:text-foreground">Refund</a>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
    </nav>
  );
};
