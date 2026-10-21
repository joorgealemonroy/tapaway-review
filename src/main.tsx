import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Install project-wide auth guard BEFORE React renders anything.
// This blocks any accidental calls to signUp, signInWithOtp, resetPasswordForEmail, verifyOtp.
import { installAuthGuard } from "./lib/authGuard";
installAuthGuard();

import { isStorefrontPath } from "./lib/storefrontNavigation";
import { clearRetiredTracking } from "./lib/retiredTracking";
clearRetiredTracking();
if (isStorefrontPath(location.pathname)) document.documentElement.style.setProperty("--app-bg", "#fff");

if (location.pathname.startsWith("/admin")) document.documentElement.dataset.adminSurface = "true";

// Dashboard preference must not darken public storefront loading screens.
try {
  if (localStorage.getItem('tapaway_dashboard_theme') !== 'light') document.documentElement.classList.add('dark');
} catch { /* Storage-blocked visitors can still use the storefront. */ }

createRoot(document.getElementById("root")!).render(<App />);
