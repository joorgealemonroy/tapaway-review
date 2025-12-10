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
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");

      if (!token) {
        // Check if already has session (maybe came from a different flow)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          setVerifying(false);
          return;
        }
        setError("Invalid or missing token. Please use the link from your email.");
        setVerifying(false);
        return;
      }

      try {
        // Verify the token directly
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: (type as "recovery" | "signup" | "email") || "recovery",
        });

        if (verifyError) {
          console.error("Token verification error:", verifyError);
          setError("This link has expired or already been used. Please contact support for a new invite.");
          setVerifying(false);
          return;
        }

        if (data.session) {
          setSessionReady(true);
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setError("Failed to verify your link. Please try again or contact support.");
      }
      setVerifying(false);
    };

    verifyToken();
  }, [searchParams]);

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
            <CardTitle className="text-destructive">Link Error</CardTitle>
            <CardDescription>{error}</CardDescription>
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

  if (!sessionReady) {
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