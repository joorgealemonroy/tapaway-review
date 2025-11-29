import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const PAYWALL_PATH = "/paywall";
type Mode = "login" | "forgot";
const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      setMessage("Logged in successfully. Redirecting…");

      // Redirect to root - it will handle routing based on subscription status
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message ?? "Unable to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };
  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo
      });
      if (error) throw error;
      setMessage("If an account exists with that email, we've sent a reset link.");
    } catch (e: any) {
      setError(e.message ?? "Unable to send reset email right now.");
    } finally {
      setLoading(false);
    }
  };
  const title = mode === "login" ? "Welcome back" : "Reset your password";
  const subtitle = mode === "login" ? "Log in to your TapAway dashboard." : "We'll email you a link to set a new password.";
  return <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
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

          {message && <div className="text-xs rounded-md bg-green-50 text-green-700 px-3 py-2">
              {message}
            </div>}
          {error && <div className="text-xs rounded-md bg-red-50 text-red-700 px-3 py-2">
              {error}
            </div>}

          {mode === "login" && <form className="space-y-4" onSubmit={onLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@restaurant.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="rounded border-input" />
                  <span>Remember me</span>
                </label>
                <button type="button" onClick={() => {
              setMode("forgot");
              setMessage(null);
              setError(null);
            }} className="text-foreground hover:underline">
                  Forgot password?
                </button>
              </div>

              <div className="space-y-3">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>

                <Button type="button" variant="outline" onClick={() => {
              window.location.href = PAYWALL_PATH;
            }} className="w-full">
                  Create an account
                </Button>
              </div>
            </form>}

          {mode === "forgot" && <form className="space-y-4" onSubmit={onForgot}>
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@restaurant.com" />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending link…" : "Send reset link"}
              </Button>

              <button type="button" onClick={() => {
            setMode("login");
            setMessage(null);
            setError(null);
          }} className="w-full text-xs text-muted-foreground hover:underline text-center">
                Back to login
              </button>

              <button type="button" onClick={() => {
            window.location.href = PAYWALL_PATH;
          }} className="w-full text-xs text-muted-foreground hover:underline text-center">
                Create an account
              </button>
            </form>}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Having trouble?{" "}
          <a href="mailto:support@tapaway.co" className="underline decoration-dotted">tap@tapaway.co</a>
        </p>
      </div>
    </div>;
};
export default Auth;