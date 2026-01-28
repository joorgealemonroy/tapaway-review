import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";

type Status = "verifying" | "setup" | "saving" | "success" | "error";

const MagicLinkVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [validPassword, setValidPassword] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No magic link token provided");
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (token: string) => {
    try {
      // Validation mode - just check if token is valid, don't consume it
      const { data, error } = await supabase.functions.invoke("verify-magic-link", {
        body: { token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.valid) {
        // Token is valid - show password setup form
        setEmail(data.email || "");
        setStatus("setup");
      } else {
        throw new Error("Invalid token response");
      }
    } catch (err) {
      console.error("Magic link validation error:", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to verify magic link");
    }
  };

  const handlePasswordChange = useCallback((password: string | null) => {
    setValidPassword(password);
  }, []);

  const handleSetPassword = async () => {
    if (!validPassword || !token) return;

    setStatus("saving");
    try {
      // Complete mode - set password and get session
      const { data, error } = await supabase.functions.invoke("verify-magic-link", {
        body: { token, newPassword: validPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.session) {
        // Set the session in Supabase
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) throw sessionError;

        setStatus("success");

        // Redirect to personal dashboard after a brief delay
        setTimeout(() => {
          navigate("/personal/dashboard?welcome=true", { replace: true });
        }, 1500);
      } else {
        throw new Error("No session returned");
      }
    } catch (err) {
      console.error("Password setup error:", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to set password");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full">
        {/* Verifying State */}
        {status === "verifying" && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#6BCB77] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Verifying your link...</h1>
            <p className="text-zinc-400">Please wait while we verify your magic link.</p>
          </div>
        )}

        {/* Password Setup State */}
        {status === "setup" && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#6BCB77]/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-[#6BCB77]" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Welcome to TapAway!</h1>
              <p className="text-zinc-400">
                Create a password for <span className="text-white font-medium">{email}</span>
              </p>
            </div>

            <div className="space-y-6">
              <PasswordChecklistSection onValidPassword={handlePasswordChange} />

              <Button
                onClick={handleSetPassword}
                disabled={!validPassword}
                className="w-full bg-[#6BCB77] hover:bg-[#5ab868] text-black font-medium h-12"
              >
                Continue to Dashboard
              </Button>

              <p className="text-xs text-zinc-500 text-center">
                You can close this tab and come back later — your link stays valid for 24 hours.
              </p>
            </div>
          </div>
        )}

        {/* Saving State */}
        {status === "saving" && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#6BCB77] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Setting up your account...</h1>
            <p className="text-zinc-400">Just a moment while we save your password.</p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-[#6BCB77] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">You're all set!</h1>
            <p className="text-zinc-400">Redirecting to your dashboard...</p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Unable to continue</h1>
            <p className="text-zinc-400 mb-6">{errorMessage || "The magic link is invalid or has expired."}</p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-[#6BCB77] hover:bg-[#5ab868] text-black font-medium"
              >
                Go to Login
              </Button>
              <p className="text-xs text-zinc-500">
                Need a new link? Contact your admin or support.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MagicLinkVerify;
