import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";

export default function RepSetupPassword() {
  const navigate = useNavigate();
  const [validPassword, setValidPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state changes - Supabase handles the hash automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, "Session:", !!session);
        
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          if (session) {
            setHasSession(true);
            setCheckingSession(false);
          }
        }
      }
    );

    // Also check for existing session on mount
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }
      setCheckingSession(false);
    };

    // Small delay to let Supabase process URL hash if present
    setTimeout(checkExistingSession, 500);

    return () => subscription.unsubscribe();
  }, []);

  // Check URL for error params (Supabase redirects with error in hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const errorDesc = params.get("error_description") || params.get("error");
      if (errorDesc) {
        setError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
        setCheckingSession(false);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPassword) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: validPassword });
      
      if (error) throw error;

      toast.success("Password set successfully! Welcome to TapAway.");
      navigate("/rep");
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast.error(error.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Setting up your account...</CardTitle>
            <CardDescription>Please wait while we verify your link.</CardDescription>
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
            <CardTitle className="text-destructive">Link Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              This link may have expired or already been used. Please contact support for a new invite.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Session Not Found</CardTitle>
            <CardDescription>
              Unable to verify your invite link. This may happen if the link expired or was already used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              If you're a new sales rep, please contact tap@tapaway.co for a new invite.
            </p>
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
            Set your password to access the Sales Rep Portal
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
