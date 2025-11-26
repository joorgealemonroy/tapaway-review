import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const hasMinLength = (value: string) => value.length >= 8;
const hasNumber = (value: string) => /[0-9]/.test(value);
const hasSymbol = (value: string) => /[!?#@\$%\^&\*]/.test(value);

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(() => {
    return {
      minLength: hasMinLength(password),
      number: hasNumber(password),
      symbol: hasSymbol(password),
      match: password.length > 0 && password === confirm,
    };
  }, [password, confirm]);

  const allValid =
    checks.minLength && checks.number && checks.symbol && checks.match;

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setMessage("Password updated. Redirecting to login…");

      setTimeout(() => {
        window.location.href = "/auth";
      }, 1500);
    } catch (e: any) {
      setError(
        e.message ?? "Unable to update password. Please try the link again."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderCheck = (ok: boolean, label: string) => (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={
          "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] " +
          (ok
            ? "bg-green-100 text-green-700"
            : "bg-muted text-muted-foreground")
        }
      >
        {ok ? "✓" : "–"}
      </span>
      <span className={ok ? "text-green-700" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-sm border border-border px-6 py-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              T
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Set a new password
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose a strong password for your TapAway account.
              </p>
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

          <form className="space-y-4" onSubmit={updatePassword}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                Password must include:
              </p>
              <div className="space-y-1">
                {renderCheck(checks.minLength, "At least 8 characters")}
                {renderCheck(checks.number, "At least 1 number")}
                {renderCheck(
                  checks.symbol,
                  "At least 1 symbol (! ? # @ $ % ^ & *)"
                )}
                {renderCheck(checks.match, "Passwords match")}
              </div>
            </div>

            <Button
              type="submit"
              disabled={!allValid || saving}
              className="w-full"
            >
              {saving ? "Saving…" : "Save new password"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          If this page doesn&apos;t work, try opening your reset link in a
          fresh browser tab.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
