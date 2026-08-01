import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";
import { Loader2 } from "lucide-react";
import { LegalFooter } from "@/components/compliance/LegalFooter";


const PAYWALL_PATH = "/onboarding";

type Mode = "login" | "forgot" | "post-checkout-signup" | "post-checkout-login";

interface StripeSessionData {
  email: string;
  alreadyHasUser: boolean;
  mustSetPassword: boolean;
  userId: string | null;
  customerName?: string;
  paymentStatus?: string;
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Post-checkout state
  const [checkingSession, setCheckingSession] = useState(false);
  const [stripeSessionData, setStripeSessionData] = useState<StripeSessionData | null>(null);
  const [validPassword, setValidPassword] = useState<string | null>(null);

  // Forgot-password (custom OTP) state
  const [forgotStep, setForgotStep] = useState<"send" | "verify">("send");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotValidPassword, setForgotValidPassword] = useState<string | null>(null);

  // OAuth state
  const [oauthLoading, setOauthLoading] = useState(false);

  // Get redirect destination from URL params
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Detect OAuth return — if user already has a session on mount in login mode, auto-redirect
  useEffect(() => {
    const checkOAuthReturn = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mode === "login" && !checkingSession) {
        console.log("[Auth] OAuth return detected, determining redirect...");
        const destination = await determineRedirectDestination();
        navigate(destination);
      }
    };
    checkOAuthReturn();
  }, []);

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(true);
    setError(null);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`,
      });
      if (error) {
        setError("Sign-in failed. Please try again.");
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setOauthLoading(false);
    }
  };

  // Check if this is a post-checkout flow
  useEffect(() => {
    const checkPostCheckoutFlow = async () => {
      // Parse redirect to check for session_id
      if (!redirectTo.includes("/onboarding")) {
        return;
      }

      // Extract session_id from redirect param
      let sessionId: string | null = null;
      try {
        // The redirect might be URL-encoded
        const decodedRedirect = decodeURIComponent(redirectTo);
        const redirectUrl = new URL(decodedRedirect, window.location.origin);
        sessionId = redirectUrl.searchParams.get("session_id");
      } catch {
        // Try simple regex extraction
        const match = redirectTo.match(/session_id=([^&]+)/);
        sessionId = match ? match[1] : null;
      }

      if (!sessionId) {
        console.log("[Auth] No session_id found in redirect, using normal login flow");
        return;
      }

      console.log("[Auth] Detected post-checkout flow with session_id:", sessionId);
      setCheckingSession(true);

      try {
        const { data, error } = await supabase.functions.invoke("lookup-stripe-session", {
          body: { sessionId },
        });

        if (error) {
          console.error("[Auth] Error looking up Stripe session:", error);
          setError("We couldn't verify your payment session. Please contact support at tap@tapaway.co");
          setCheckingSession(false);
          return;
        }

        if (!data?.email) {
          console.error("[Auth] No email returned from Stripe session");
          setError("We couldn't find your email from the payment. Please contact support at tap@tapaway.co");
          setCheckingSession(false);
          return;
        }

        console.log("[Auth] Stripe session lookup result:", data);
        setStripeSessionData(data);
        setEmail(data.email);

        // Key logic: if mustSetPassword is true, show password setup
        // Otherwise show login (they have a real password already)
        if (data.mustSetPassword) {
          setMode("post-checkout-signup");
        } else if (data.alreadyHasUser) {
          setMode("post-checkout-login");
        } else {
          // No user at all - this shouldn't happen if webhook ran, but handle it
          setMode("post-checkout-signup");
        }
      } catch (err) {
        console.error("[Auth] Failed to check Stripe session:", err);
        setError("We couldn't verify your payment session. Please contact support at tap@tapaway.co");
      } finally {
        setCheckingSession(false);
      }
    };

    checkPostCheckoutFlow();
  }, [redirectTo]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      setMessage("Logged in successfully. Redirecting…");

      // Determine redirect destination based on role
      const destination = await determineRedirectDestination();
      console.log("[Auth] Redirecting to:", destination);
      navigate(destination);
    } catch (e: any) {
      setError(e.message ?? "Unable to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine redirect destination based on role
  const determineRedirectDestination = async (): Promise<string> => {
    // If there's a redirect param (e.g., from onboarding flow), always honor it
    const hasExplicitRedirect = searchParams.get("redirect");
    if (hasExplicitRedirect) {
      return redirectTo;
    }

    // Get current user to check roles
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return "/dashboard";
    }

    // Check if admin (via email or app_metadata)
    const ADMIN_EMAILS = ["tap@tapaway.co"];
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "") || user.app_metadata?.role === "admin";
    if (isAdmin) {
      return "/admin";
    }

    // Check if sales rep (via sales_reps table)
    const { data: salesRepData } = await supabase
      .from("sales_reps")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    
    if (salesRepData) {
      return "/rep";
    }

   // Check for business restaurant and personal profile
   const [restaurantResult, personalResult] = await Promise.all([
     supabase
       .from("restaurants")
       .select("id, onboarding_completed, subscription_status")
       .eq("owner_id", user.id)
       .maybeSingle(),
     supabase
       .from("personal_profiles")
       .select("id")
       .eq("user_id", user.id)
       .maybeSingle()
   ]);

   const restaurant = restaurantResult.data;
   const personal = personalResult.data;

   const hasValidBusiness = restaurant && 
     restaurant.onboarding_completed && 
     (restaurant.subscription_status === 'active' || 
      restaurant.subscription_status === 'trialing' ||
      restaurant.subscription_status === 'pending_payment' ||
      restaurant.subscription_status === 'pending_setup');
   const hasPersonal = !!personal;

   // If user has both, let them choose
    if (hasValidBusiness && hasPersonal) {
      return "/dashboard";
    }
   // Valid business account
   if (hasValidBusiness) {
     return "/dashboard";
   }
   // Personal profile only
   if (hasPersonal) {
     return "/dashboard";
   }
   // Has restaurant but blocked subscription
   if (restaurant && !hasValidBusiness) {
     return "/onboarding";
   }
   // No accounts at all
   return "/onboarding";
  };

  // Extract session_id from redirect for password setting
  const getSessionIdFromRedirect = (): string | null => {
    try {
      const decodedRedirect = decodeURIComponent(redirectTo);
      const redirectUrl = new URL(decodedRedirect, window.location.origin);
      return redirectUrl.searchParams.get("session_id");
    } catch {
      const match = redirectTo.match(/session_id=([^&]+)/);
      return match ? match[1] : null;
    }
  };

  const onPostCheckoutSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validPassword) {
      setError("Please enter a valid password that meets all requirements.");
      return;
    }

    if (!stripeSessionData?.email) {
      setError("Missing email from payment session. Please contact support at tap@tapaway.co");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      // If user already exists with must_set_password flag, update their password via edge function
      if (stripeSessionData.alreadyHasUser && stripeSessionData.userId) {
        console.log("[Auth] Existing user needs password - calling set-user-password");
        
        const sessionId = getSessionIdFromRedirect();
        const { error: setPasswordError } = await supabase.functions.invoke("set-user-password", {
          body: { 
            userId: stripeSessionData.userId, 
            password: validPassword,
            sessionId,
          },
        });

        if (setPasswordError) {
          console.error("[Auth] Failed to set password:", setPasswordError);
          throw new Error(setPasswordError.message || "Failed to set password");
        }

        console.log("[Auth] Password set successfully, signing in...");
      } else {
        // Never create users via client signUp here (it can trigger default auth emails)
        console.warn("[Auth] No user found after checkout; redirecting to onboarding for custom verification");
        window.location.href = `/onboarding?source=stripe&email=${encodeURIComponent(stripeSessionData.email)}`;
        return;
      }

      // Sign in with the new password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: stripeSessionData.email,
        password: validPassword,
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Password set! Redirecting to onboarding…");
      
      console.log("[Auth] Redirecting to:", redirectTo);
      window.location.href = redirectTo;
    } catch (e: any) {
      console.error("[Auth] Signup/password set error:", e);
      setError(e.message ?? "Unable to set password. Please contact support at tap@tapaway.co");
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        setError("Please enter your email address.");
        return;
      }

      if (forgotStep === "send") {
        console.info("[Auth][OTP] send-custom-otp (password reset)", {
          email: normalizedEmail,
          ts: new Date().toISOString(),
          provider: "resend",
        });

        const { data, error } = await supabase.functions.invoke("send-custom-otp", {
          body: { email: normalizedEmail },
        });

        if (error || (data as any)?.error) {
          throw new Error((data as any)?.error || error?.message || "Failed to send code");
        }

        setForgotStep("verify");
        setMessage("Check your email for a 6-digit code.");
        return;
      }

      // Verify step
      if (!forgotCode.trim() || forgotCode.trim().length < 6) {
        setError("Enter the 6-digit code we emailed you.");
        return;
      }

      if (!forgotValidPassword) {
        setError("Please enter a valid password that meets all requirements.");
        return;
      }

      console.info("[Auth][OTP] verify-custom-otp (password reset)", {
        email: normalizedEmail,
        ts: new Date().toISOString(),
      });

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-custom-otp", {
        body: { email: normalizedEmail, code: forgotCode.trim(), password: forgotValidPassword },
      });

      if (verifyError || (verifyData as any)?.error) {
        throw new Error((verifyData as any)?.error || verifyError?.message || "Invalid or expired code");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: forgotValidPassword,
      });

      if (signInError) {
        throw signInError;
      }

      setMessage("Password updated. Redirecting…");
      navigate("/dashboard");
    } catch (e: any) {
      setError(e.message ?? "Unable to reset password right now.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking Stripe session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-sm border border-border px-6 py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your payment...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine title and subtitle based on mode
  const getTitleAndSubtitle = () => {
    switch (mode) {
      case "post-checkout-signup":
        return {
          title: "Payment received 🎉",
          subtitle: "Let's create your TapAway login so you can finish setting up your review hubs.",
        };
      case "post-checkout-login":
        return {
          title: "Welcome back!",
          subtitle: "Looks like you already have an account. Log in to continue to onboarding.",
        };
      case "forgot":
        return {
          title: "Reset your password",
          subtitle: "We'll email you a link to set a new password.",
        };
      default:
        return {
          title: "Welcome back",
          subtitle: "Log in to your TapAway dashboard.",
        };
    }
  };

  const { title, subtitle } = getTitleAndSubtitle();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-border px-6 py-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              T
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {message && (
            <div className="text-xs rounded-md bg-green-50 text-green-700 px-3 py-2">
              {message}
            </div>
          )}
          {error && (
            <div className="text-xs rounded-md bg-red-50 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          {/* Post-checkout signup form */}
          {mode === "post-checkout-signup" && (
            <form className="space-y-4" onSubmit={onPostCheckoutSignup}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">This is the email from your payment.</p>
              </div>

              <PasswordChecklistSection onValidPassword={setValidPassword} />

              <Button type="submit" disabled={loading || !validPassword} className="w-full">
                {loading ? "Creating account…" : "Create account & continue"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <button 
                  type="button" 
                  onClick={() => setMode("post-checkout-login")} 
                  className="text-foreground hover:underline"
                >
                  Log in instead
                </button>
              </p>
            </form>
          )}

          {/* Post-checkout login form */}
          {mode === "post-checkout-login" && (
            <form className="space-y-4" onSubmit={onLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="you@restaurant.com" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>

              <div className="flex items-center justify-end text-xs text-muted-foreground">
                <button 
                  type="button" 
                  onClick={() => {
                    setMode("forgot");
                    setForgotStep("send");
                    setForgotCode("");
                    setForgotValidPassword(null);
                    setMessage(null);
                    setError(null);
                  }} 
                  className="text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in & continue"}
              </Button>
            </form>
          )}

          {/* Standard login form */}
          {mode === "login" && (
            <form className="space-y-4" onSubmit={onLogin}>
              {/* OAuth buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={oauthLoading}
                  onClick={() => handleOAuth("google")}
                >
                  {oauthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  className="w-full bg-black text-white hover:bg-black/90"
                  disabled={oauthLoading}
                  onClick={() => handleOAuth("apple")}
                >
                  {oauthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  Continue with Apple
                </Button>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  or sign in with email
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="you@restaurant.com" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={e => setRememberMe(e.target.checked)} 
                    className="rounded border-input" 
                  />
                  <span>Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setMode("forgot");
                    setForgotStep("send");
                    setForgotCode("");
                    setForgotValidPassword(null);
                    setMessage(null);
                    setError(null);
                  }} 
                  className="text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="space-y-3">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>

                {/* Continue setup button for users who hit auth during setup */}
                {redirectTo.includes('/onboarding') && (
                  <Button 
                    type="button"
                    onClick={() => window.location.href = '/onboarding?source=resume'}
                    className="w-full"
                  >
                    Continue setup
                  </Button>
                )}

                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    window.location.href = PAYWALL_PATH;
                  }} 
                  className="w-full"
                >
                  Create an account
                </Button>
              </div>
            </form>
          )}

          {/* Forgot password form (custom OTP; no default auth emails) */}
          {mode === "forgot" && (
            <form className="space-y-4" onSubmit={onForgot}>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input 
                  id="forgot-email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="you@restaurant.com" 
                  disabled={forgotStep === "verify"}
                />
              </div>

              {forgotStep === "verify" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-code">6-digit code</Label>
                    <Input
                      id="forgot-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>

                  <PasswordChecklistSection onValidPassword={setForgotValidPassword} />
                </>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {forgotStep === "send"
                  ? (loading ? "Sending code…" : "Send reset code")
                  : (loading ? "Resetting…" : "Verify code & reset password")}
              </Button>

              {forgotStep === "verify" && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep("send");
                    setForgotCode("");
                    setForgotValidPassword(null);
                    setMessage(null);
                    setError(null);
                  }}
                  className="w-full text-xs text-muted-foreground hover:underline text-center"
                >
                  Use a different email
                </button>
              )}

              <button 
                type="button" 
                onClick={() => {
                  // Go back to the appropriate mode
                  setMode(stripeSessionData?.alreadyHasUser ? "post-checkout-login" : 
                          stripeSessionData ? "post-checkout-signup" : "login");
                  setMessage(null);
                  setError(null);
                }} 
                className="w-full text-xs text-muted-foreground hover:underline text-center"
              >
                Back to login
              </button>

              {!stripeSessionData && (
                <button 
                  type="button" 
                  onClick={() => {
                    window.location.href = PAYWALL_PATH;
                  }} 
                  className="w-full text-xs text-muted-foreground hover:underline text-center"
                >
                  Create an account
                </button>
              )}
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Having trouble?{" "}
          <a href="mailto:tap@tapaway.co" className="underline decoration-dotted">tap@tapaway.co</a>
        </p>

        <LegalFooter className="pt-2 pb-0" />
      </div>

    </div>
  );
};

export default Auth;
