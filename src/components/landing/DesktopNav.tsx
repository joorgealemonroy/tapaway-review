import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import { Button } from "@/components/ui/button";

export const DesktopNav = () => {
  const { user } = useAuth();
  const { isSalesRep } = useSalesRep();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tapaway_dashboard_theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('tapaway_dashboard_theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  
  const dashboardLink = isSalesRep ? "/rep" : "/dashboard";

  return (
    <nav className="hidden md:block sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-6">
            <a 
              href="https://tapaway.co" 
              className="font-black text-xl tracking-tight text-foreground"
            >
              TapAway
            </a>
            
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setIsDark(!isDark)}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {user ? (
              <Link
                to={dashboardLink}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="px-4 py-2 rounded-lg font-medium text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/start"
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
