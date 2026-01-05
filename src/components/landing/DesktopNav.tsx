import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import { ProductNavToggle } from "./ProductNavToggle";

export const DesktopNav = () => {
  const { user } = useAuth();
  const { isSalesRep } = useSalesRep();
  const location = useLocation();
  
  const isPersonal = location.pathname === "/personal";
  const dashboardLink = isSalesRep ? "/rep" : isPersonal ? "/me" : "/dashboard";

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
            <ProductNavToggle />
          </div>
          <div className="flex items-center gap-3">
            {!isPersonal && (
              <Link
                to="/personal"
                className="px-4 py-2 rounded-lg font-medium text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Personal Cards
              </Link>
            )}
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
                  to={isPersonal ? "/personal/signup" : "/start"}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  {isPersonal ? "Get Your Card" : "Start Free Trial"}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
