import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";

export default function RepSetupPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [validPassword, setValidPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupToken = searchParams.get("setupToken");

  useEffect(() => {
    const verifyToken = async () => {
      if (!setupToken) {
        setError("Invalid setup link. Please use the link from your welcome email.");
        setVerifying(false);
        return;
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke("verify-rep-setup-token", {
          body: { setupToken },
        });

        if (invokeError) {
          console.error("Token verification error:", invokeError);
          setError("Failed to verify setup link. Please try again or contact support.");
          setVerifying(false);
          return;
        }

        if (data.error) {
          setError(data.error);
          setVerifying(false);
          return;
        }

        if (data.valid) {
          setTokenValid(true);
          setUserEmail(data.email);
        } else {
          setError("Invalid setup link.");
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setError("Failed to verify setup link. Please try again or contact support.");
      }
      setVerifying(false);
    };

    verifyToken();
  }, [setupToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPassword || !setupToken) return;

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-rep-setup-token", {
        body: { setupToken, newPassword: validPassword },
      });

      if (invokeError) {
        throw new Error("Failed to set password. Please try again.");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.email) {
        // Sign in with the new password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: validPassword,
        });

        if (signInError) {
          console.error("Sign in error:", signInError);
          toast.success("Password set! Please log in with your new password.");
          navigate("/auth");
          return;
        }

        toast.success("Welcome to TapAway! 🎉");
        navigate("/rep");
      }
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast.error(error.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Verifying your link...</CardTitle>
            <CardDescription>Please wait while we set up your account.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Setup Error</CardTitle>
            <CardDescription className="text-base mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Email us at tap@tapaway.co
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full" variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This setup link is not valid. Please use the link from your welcome email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to TapAway! 🎉</CardTitle>
          <CardDescription>
            {userEmail ? (
              <>Set your password for <strong>{userEmail}</strong></>
            ) : (
              "Set your password to access the Sales Rep Portal"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordChecklistSection onValidPassword={setValidPassword} />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!validPassword || loading}
            >
              {loading ? "Setting up..." : "Set Password & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
