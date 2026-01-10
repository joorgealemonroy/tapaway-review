import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const MagicLinkVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("No magic link token provided");
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-magic-link", {
        body: { token },
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
          navigate("/personal/dashboard", { replace: true });
        }, 1500);
      } else {
        throw new Error("No session returned");
      }
    } catch (err) {
      console.error("Magic link verification error:", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to verify magic link");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#6BCB77] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Signing you in...</h1>
            <p className="text-zinc-400">Please wait while we verify your magic link.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-[#6BCB77] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">You're signed in!</h1>
            <p className="text-zinc-400">Redirecting to your dashboard...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-white mb-2">Unable to sign in</h1>
            <p className="text-zinc-400 mb-6">{errorMessage || "The magic link is invalid or has expired."}</p>
            <Button
              onClick={() => navigate("/auth")}
              className="bg-[#6BCB77] hover:bg-[#5ab868] text-black font-medium"
            >
              Go to Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default MagicLinkVerify;
