import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PasswordChecklistSection from "@/components/PasswordChecklistSection";
import { Loader2, ShieldCheck } from "lucide-react";
import { verifyTokenHash } from "@/lib/authGuard";
import { clearAuthUrlCredentials } from "@/lib/clientSecurity";

/**
 * /auth/set-password. Landing page for the "get dashboard access" email.
 * Exchanges the recovery token for a session, sets the password, and drops
 * the customer straight into their dashboard.
 */
const SetPassword = () => {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [validPassword, setValidPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recoveryCheck = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Share a single exchange across React remount effects. One-time links
    // must not be consumed twice, or fall back to another signed-in account.
    recoveryCheck.current ??= (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
      try {
        if ((accessToken && !refreshToken) || (!accessToken && refreshToken) || hash.has("error") || url.searchParams.has("error")) return false;
        // Let Supabase finish its built-in URL handling before a manual
        // exchange. Otherwise PKCE/implicit recovery gets consumed twice.
        const initialized = await supabase.auth.initialize();
        if (initialized.error) throw initialized.error;
        if (tokenHash) {
          const result = await verifyTokenHash(tokenHash, "recovery");
          if (result.error) throw result.error;
        } else if (code && new URL(window.location.href).searchParams.has("code")) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        } else if (accessToken && refreshToken && new URLSearchParams(window.location.hash.replace(/^#/, "")).has("access_token")) {
          const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (result.error) throw result.error;
        }
        const { data, error: userError } = await supabase.auth.getUser();
        return !userError && !!data.user;
      } catch {
        return false;
      } finally {
        clearAuthUrlCredentials();
      }
    })();
    recoveryCheck.current.then(valid => {
      if (!cancelled) { setHasSession(valid); setChecking(false); }
    });
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
