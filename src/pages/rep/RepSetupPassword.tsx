import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";
import SalesPartnerAgreement from "@/components/rep/SalesPartnerAgreement";
import AgreementHighlights from "@/components/rep/AgreementHighlights";

export default function RepSetupPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [validPassword, setValidPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState("");

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
          setError("Failed to verify setup link. Please try again or contact support.");
          setVerifying(false);
          return;
        }

        if (data?.error) {
          setError(data.error);
          setVerifying(false);
          return;
        }

        if (data?.valid) {
          setTokenValid(true);
          setUserEmail(data.email);
        } else {
          setError("This setup link is invalid or has expired.");
        }
      } catch {
        setError("Failed to verify setup link. Please try again or contact support.");
      }
      setVerifying(false);
    };

    verifyToken();
  }, [setupToken]);

  const isSignatureValid = signatureName.trim().split(/\s+/).length >= 2;
  const canSubmit = validPassword && agreementAccepted && isSignatureValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !setupToken) return;

    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-rep-setup-token", {
        body: { 
          setupToken, 
          newPassword: validPassword,
          agreementAccepted,
          signatureName: signatureName.trim(),
        },
      });

      if (invokeError) {
        throw new Error("Failed to set password. Please try again.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: validPassword,
        });

        if (signInError) {
          toast.success("Password set! Please log in with your new password.");
          navigate("/auth");
          return;
        }

        toast.success("Welcome to TapAway! 🎉");
        navigate("/rep");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to set password";
      toast.error(message);
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
      <Card className="w-full max-w-2xl">
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Create Your Password</h3>
              <PasswordChecklistSection onValidPassword={setValidPassword} />
            </div>

            {/* Agreement Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-foreground">Sales Partner Agreement</h3>
              <p className="text-sm text-muted-foreground">
                Before activating your Sales Partner account, please review and accept the TapAway Sales Partner Agreement.
              </p>
              
              <AgreementHighlights />
              
              <SalesPartnerAgreement />

              {/* Agreement Checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="agreement"
                  checked={agreementAccepted}
                  onCheckedChange={(checked) => setAgreementAccepted(checked === true)}
                  className="mt-1"
                />
                <Label htmlFor="agreement" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the TapAway Sales Partner Independent Contractor Agreement
                </Label>
              </div>

              {/* Digital Signature */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="signature" className="text-sm font-medium">
                  Digital Signature (type your full legal name)
                </Label>
                <Input
                  id="signature"
                  type="text"
                  placeholder="e.g., John Michael Smith"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="font-serif italic"
                />
                {signatureName && !isSignatureValid && (
                  <p className="text-xs text-destructive">
                    Please enter your full legal name (at least first and last name)
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={!canSubmit || loading}
            >
              {loading ? "Setting up..." : "Accept Agreement & Continue"}
            </Button>

            {!agreementAccepted && (
              <p className="text-xs text-center text-muted-foreground">
                You must accept the Sales Partner Agreement to activate your account.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
