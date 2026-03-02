import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Install project-wide auth guard BEFORE React renders anything.
// This blocks any accidental calls to signUp, signInWithOtp, resetPasswordForEmail, verifyOtp.
import { installAuthGuard } from "./lib/authGuard";
installAuthGuard();

// Apply theme before React renders to prevent flash of light mode
if (localStorage.getItem('tapaway_dashboard_theme') !== 'light') {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
