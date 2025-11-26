import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const hasMinLength = (value: string) => value.length >= 8;
const hasNumber = (value: string) => /[0-9]/.test(value);
const hasSymbol = (value: string) => /[!?#@\$%\^&\*]/.test(value);

type PasswordChecklistProps = {
  onValidPassword?: (password: string) => void;
};

const PasswordChecklistSection = ({
  onValidPassword,
}: PasswordChecklistProps) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

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

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (onValidPassword && allValid && value === confirm) {
      onValidPassword(value);
    }
  };

  const handleConfirmChange = (value: string) => {
    setConfirm(value);
    if (onValidPassword && allValid && password === value) {
      onValidPassword(password);
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
    <section className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="create-password">Create a password</Label>
        <Input
          id="create-password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder="••••••••••"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password-checklist">Confirm password</Label>
        <Input
          id="confirm-password-checklist"
          type="password"
          value={confirm}
          onChange={(e) => handleConfirmChange(e.target.value)}
          placeholder="••••••••••"
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
    </section>
  );
};

export default PasswordChecklistSection;
