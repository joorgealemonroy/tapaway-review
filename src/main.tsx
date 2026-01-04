import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Install project-wide auth guard BEFORE React renders anything.
// This blocks any accidental calls to signUp, signInWithOtp, resetPasswordForEmail, verifyOtp.
import { installAuthGuard } from "./lib/authGuard";
installAuthGuard();

createRoot(document.getElementById("root")!).render(<App />);
