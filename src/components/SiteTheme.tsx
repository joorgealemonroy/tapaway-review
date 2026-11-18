import { useLayoutEffect, useState } from "react";
import { matchRoutes, type RouteObject, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import "./site-theme.css";

const preferenceKey = "tapaway-site-theme";

export function SiteTheme({ routes }: { routes: RouteObject[] }) {
  const location = useLocation();
  const isHub = matchRoutes(routes, location)?.at(-1)?.route.handle?.hub === true;
  const [prefersDark, setPrefersDark] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) === "dark";
    } catch {
      return false;
    }
  });
  const dark = prefersDark && !isHub;

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);

  function toggleTheme() {
    setPrefersDark(!prefersDark);
    try {
      localStorage.setItem(preferenceKey, prefersDark ? "light" : "dark");
    } catch {
      // Keep the preference for the current visit when storage is unavailable.
    }
  }

  return (
    <>
      <Toaster theme={dark ? "dark" : "light"} />
      {!isHub && (
        <button className="site-theme-toggle" type="button" onClick={toggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          {dark ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
        </button>
      )}
    </>
  );
}
