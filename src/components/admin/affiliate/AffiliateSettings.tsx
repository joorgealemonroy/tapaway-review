import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const AffiliateSettings = () => {
  const [freeBase, setFreeBase] = useState("3.00");
  const [freeBonus, setFreeBonus] = useState("5.00");
  const [paidBase, setPaidBase] = useState("5.00");
  const [paidBonus, setPaidBonus] = useState("8.00");
  const [bonusThreshold, setBonusThreshold] = useState("25");
  const [payoutMin, setPayoutMin] = useState("20.00");
  const [programEnabled, setProgramEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("affiliate_settings")
        .select("*")
        .limit(1)
        .single();

      if (data) {
        setSettingsId(data.id);
        setFreeBase(String((data as any).commission_free_base ?? "3.00"));
        setFreeBonus(String((data as any).commission_free_bonus ?? "5.00"));
        setPaidBase(String((data as any).commission_paid_base ?? "5.00"));
        setPaidBonus(String((data as any).commission_paid_bonus ?? "8.00"));
        setBonusThreshold(String((data as any).bonus_threshold ?? "25"));
        setPayoutMin(String(data.payout_minimum));
        setProgramEnabled(data.program_enabled);
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    if (!settingsId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("affiliate_settings")
        .update({
          commission_free_base: parseFloat(freeBase),
          commission_free_bonus: parseFloat(freeBonus),
          commission_paid_base: parseFloat(paidBase),
          commission_paid_bonus: parseFloat(paidBonus),
          bonus_threshold: parseInt(bonusThreshold),
          payout_minimum: parseFloat(payoutMin),
          program_enabled: programEnabled,
        } as any)
        .eq("id", settingsId);

      if (error) throw error;
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-md">
      <h3 className="font-semibold text-foreground">Free Signup Commissions</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base Rate ($) — first {bonusThreshold}</Label>
          <Input type="number" min={0} step={0.5} value={freeBase} onChange={e => setFreeBase(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bonus Rate ($) — after {bonusThreshold}</Label>
          <Input type="number" min={0} step={0.5} value={freeBonus} onChange={e => setFreeBonus(e.target.value)} />
        </div>
      </div>

      <h3 className="font-semibold text-foreground">Paid Signup Commissions</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base Rate ($) — first {bonusThreshold}</Label>
          <Input type="number" min={0} step={0.5} value={paidBase} onChange={e => setPaidBase(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bonus Rate ($) — after {bonusThreshold}</Label>
          <Input type="number" min={0} step={0.5} value={paidBonus} onChange={e => setPaidBonus(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Bonus Threshold (referrals before rate bump)</Label>
        <Input type="number" min={1} step={1} value={bonusThreshold} onChange={e => setBonusThreshold(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Minimum Payout Threshold ($)</Label>
        <Input type="number" min={0} step={1} value={payoutMin} onChange={e => setPayoutMin(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Program Enabled</Label>
        <Switch checked={programEnabled} onCheckedChange={setProgramEnabled} />
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Settings
      </Button>
    </div>
  );
};
