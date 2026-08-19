import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const rules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "At least 1 number", test: (v: string) => /[0-9]/.test(v) },
  { label: "At least 1 symbol (! ? # @ $ % ^ & *)", test: (v: string) => /[!?#@$%^&*]/.test(v) },
];

const ChangePasswordCard = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const passesRules = rules.every((r) => r.test(newPassword));
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && passesRules && matches && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      // Re-authenticate with the current password before allowing the change.
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) {
        toast.error("You must be signed in to change your password.");
        return;
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        toast.error("Current password is incorrect.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <KeyRound className="h-4 w-4 text-primary" />
        <div>
          <div className="text-sm font-medium text-white/90">Change password</div>
          <div className="text-xs text-white/40">
            Updates the password for the account you're signed in with.
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="admin-current-password" className="text-xs text-white/60">
            Current password
          </Label>
          <Input
            id="admin-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••••"
            className="bg-white/[0.03] border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-new-password" className="text-xs text-white/60">
            New password
          </Label>
          <Input
            id="admin-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••••"
            className="bg-white/[0.03] border-white/10 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-confirm-password" className="text-xs text-white/60">
            Confirm new password
          </Label>
          <Input
            id="admin-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••"
            className="bg-white/[0.03] border-white/10 text-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {[...rules.map((r) => ({ label: r.label, ok: r.test(newPassword) })), { label: "Passwords match", ok: matches }].map(
          (c) => (
            <span
              key={c.label}
              className={`text-[11px] ${c.ok ? "text-emerald-400" : "text-white/35"}`}
            >
              {c.ok ? "✓" : "–"} {c.label}
            </span>
          )
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} size="sm">
        {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
        Update password
      </Button>
    </form>
  );
};

export default ChangePasswordCard;
