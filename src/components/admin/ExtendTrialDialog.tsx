import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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

const PRESETS = [3, 5, 7, 14];

const MS_DAY = 1000 * 60 * 60 * 24;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const addDays = (base: Date, days: number) => {
  const c = new Date(base);
  c.setDate(c.getDate() + days);
  return c;
};

const ExtendTrialDialog = ({ target, onClose, onSaved }: Props) => {
  const [days, setDays] = useState<number>(3);
  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setDays(3);
      setPickedDate(undefined);
      setReason("");
    }
  }, [target]);

  const targets = useMemo(
    () => (target ? (Array.isArray(target) ? target : [target]) : []),
    [target]
  );
  const isBulk = targets.length > 1;

  // Base the delta on the current trial end (or today when there is none).
  const baseDate = useMemo(() => {
    const iso = targets[0]?.trial_ends_at ?? null;
    const base = iso ? new Date(iso) : new Date();
    return startOfDay(base);
  }, [targets]);

  // Days that will actually be sent to the RPC.
  const effectiveDays = useMemo(() => {
    if (!isBulk && pickedDate) {
      return Math.round((startOfDay(pickedDate).getTime() - baseDate.getTime()) / MS_DAY);
    }
    return days;
  }, [isBulk, pickedDate, baseDate, days]);

  const resultDate = useMemo(() => {
    if (!isBulk && pickedDate) return startOfDay(pickedDate);
    return addDays(baseDate, days);
  }, [isBulk, pickedDate, baseDate, days]);

  if (!target) return null;

  const submit = async () => {
    if (!effectiveDays || effectiveDays <= 0) {
      toast.error("Pick a date after the current trial end");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        targets.map((t) =>
          supabase.rpc("admin_extend_trial", {
            _profile_id: t.id,
            _days: effectiveDays,
            _reason: reason.trim() || null,
          })
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      toast.success(
        isBulk
          ? `Extended ${targets.length} trials by +${effectiveDays} day${effectiveDays === 1 ? "" : "s"}`
          : `Trial now ends ${fmtDate(resultDate)}`
      );
      onSaved?.(targets.map((t) => t.id), effectiveDays);
      onClose();
    } catch (e) {
      toast.error("Extend failed: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Extend trial
          </DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <>Extend {targets.length} trials at once by the same number of days.</>
            ) : (
              <>
                Add days or pick an exact end date for{" "}
                <span className="font-medium">{targets[0].label}</span>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Quick add
            </div>
            <div className="flex gap-2">
              {PRESETS.map((p) => {
                const active = !pickedDate && days === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPickedDate(undefined);
                      setDays(p);
                    }}
                    disabled={saving}
                    className={`flex-1 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                      active
                        ? "bg-emerald-500 text-[#0a0e1a] border-emerald-400"
                        : "bg-white/[0.03] text-foreground/80 border-white/10 hover:bg-white/[0.06]"
                    }`}
                  >
                    +{p}d
                  </button>
                );
              })}
            </div>
          </div>

          {!isBulk && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5">
                Or pick an exact end date
              </div>
              <div className="rounded-lg border border-white/10 p-1 flex justify-center">
                <Calendar
                  mode="single"
                  selected={pickedDate}
                  onSelect={(d) => setPickedDate(d ?? undefined)}
                  disabled={(d) => startOfDay(d) <= startOfDay(new Date())}
                  className="p-2 pointer-events-auto"
                />
              </div>
            </div>
          )}

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
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current trial ends</span>
                <span className="font-medium">{fmt(targets[0].trial_ends_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New trial ends</span>
                <span className="font-medium text-emerald-500">{fmtDate(resultDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className="font-medium">
                  {effectiveDays > 0 ? `+${effectiveDays} day${effectiveDays === 1 ? "" : "s"}` : "—"}
                </span>
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
            disabled={saving || effectiveDays <= 0}
            className="bg-emerald-500 hover:bg-emerald-400 text-[#0a0e1a]"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isBulk ? `Extend ${targets.length} trials` : "Update trial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendTrialDialog;
