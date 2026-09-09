import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * /auth/set-password — landing page for the "get dashboard access" email.
 * Exchanges the recovery token for a session, sets the password, and drops
 * the customer straight into their dashboard.
 */
const SetPassword = () => {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [validPassword, setValidPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const establishSession = async () => {
      try {
        // Supabase may deliver the recovery token as a hash fragment or as a
        // ?code= query param depending on the flow. Handle both.
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (tokenHash) {
          await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
        }

        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setHasSession(!!data.session);
          setChecking(false);
        }
      } catch (e) {
        console.error("[SetPassword] session exchange failed:", e);
        if (!cancelled) {
          setHasSession(false);
          setChecking(false);
        }
      }
    };

    establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const onValidPassword = useCallback((pw: string | null) => setValidPassword(pw), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPassword) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: validPassword });
      if (updateError) throw updateError;
      window.location.href = "/dashboard";
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't set your password. Please request a new link."
      );
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-muted/30">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-border px-6 py-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Set your password</h1>
            <p className="text-sm text-muted-foreground">
              Pick a password and we'll take you straight to your dashboard.
            </p>
          </div>

          {checking ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                This link has expired or has already been used. Request a fresh one and we'll email
                it right over.
              </p>
              <Button className="w-full" onClick={() => { window.location.href = "/support"; }}>
                Get a new link
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <PasswordChecklistSection onValidPassword={onValidPassword} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={!validPassword || saving}>
                {saving ? "Saving…" : "Save password & continue"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
