import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CalendarClock } from "lucide-react";

export type ExtendTrialTarget = {
  id: string;
  label: string;
  trial_ends_at: string | null;
};

interface Props {
  target: ExtendTrialTarget | ExtendTrialTarget[] | null;
  onClose: () => void;
  onSaved?: (ids: string[], days: number) => void;
}

const PRESETS = [2, 3, 5];

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const ExtendTrialDialog = ({ target, onClose, onSaved }: Props) => {
  const [days, setDays] = useState<number>(3);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setDays(3);
      setReason("");
    }
  }, [target]);

  if (!target) return null;
  const targets = Array.isArray(target) ? target : [target];
  const isBulk = targets.length > 1;

  const previewNewDate = (iso: string | null) => {
    const base = iso ? new Date(iso) : new Date();
    base.setDate(base.getDate() + days);
    return fmt(base.toISOString());
  };

  const submit = async () => {
    if (!days || days <= 0) {
      toast.error("Enter a positive number of days");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        targets.map((t) =>
          supabase.rpc("admin_extend_trial", {
            _profile_id: t.id,
            _days: days,
            _reason: reason.trim() || null,
          })
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success(
        isBulk
          ? `Extended ${targets.length} trials by +${days} day${days === 1 ? "" : "s"}`
          : `Trial extended by +${days} day${days === 1 ? "" : "s"}`
      );
      onSaved?.(targets.map((t) => t.id), days);
      onClose();
    } catch (e) {
      toast.error("Extend failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Extend trial
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <>Extend {targets.length} trials at once. Tuned for the 5-day trial model.</>
            ) : (
              <>
                Add days to <span className="font-medium">{targets[0].label}</span>'s trial so
                printing time doesn't eat into the client's 5-day window.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Preset
            </div>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDays(p)}
                  disabled={saving}
                  className={`flex-1 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                    days === p
                      ? "bg-emerald-500 text-[#0a0e1a] border-emerald-400"
                      : "bg-white/[0.03] text-white/80 border-white/10 hover:bg-white/[0.06]"
                  }`}
                >
                  +{p} {p === 1 ? "day" : "days"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Custom days
            </label>
            <Input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 0)))}
              disabled={saving}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Reason (optional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Waiting on cards to print & ship"
              rows={2}
              maxLength={280}
              disabled={saving}
            />
          </div>

          {!isBulk && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-white/70 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-white/50">Current trial ends</span>
                <span className="font-medium">{fmt(targets[0].trial_ends_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">New trial ends</span>
                <span className="font-medium text-emerald-300">{previewNewDate(targets[0].trial_ends_at)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Extend {isBulk ? `${targets.length} trials` : "trial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendTrialDialog;
