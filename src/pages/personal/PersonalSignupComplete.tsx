import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SuccessScreen } from "@/components/personal/signup/SuccessScreen";

const PersonalSignupComplete = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAndComplete = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setError("No session ID found");
        setLoading(false);
        return;
      }

      try {
        const { data, error: verifyError } = await supabase.functions.invoke(
          "verify-personal-checkout",
          { body: { sessionId } }
        );

        if (verifyError) throw verifyError;
        
        if (!data?.success) {
          throw new Error(data?.error || "Verification failed");
        }

        setUsername(data.username);
        
        // If user needs to set up password, send magic link
        if (data.needsPasswordSetup && data.email) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email: data.email,
            options: {
              emailRedirectTo: `${window.location.origin}/personal/dashboard`,
            },
          });

          if (otpError) {
            console.error("Failed to send magic link:", otpError);
          } else {
            toast.success("Check your email to access your dashboard!");
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError(err instanceof Error ? err.message : "Failed to verify payment");
        toast.error("Something went wrong. Please contact support.");
      } finally {
        setLoading(false);
      }
    };

    verifyAndComplete();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <a href="/personal/signup" className="text-primary hover:underline">
          Try again
        </a>
      </div>
    );
  }

  if (username) {
    return <SuccessScreen username={username} />;
  }

  return null;
};

export default PersonalSignupComplete;
