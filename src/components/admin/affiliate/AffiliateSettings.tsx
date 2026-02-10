import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const AffiliateSettings = () => {
  const [commissionRate, setCommissionRate] = useState("5.00");
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
        setCommissionRate(String(data.commission_per_referral));
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
          commission_per_referral: parseFloat(commissionRate),
          payout_minimum: parseFloat(payoutMin),
          program_enabled: programEnabled,
        })
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
      <div className="space-y-2">
        <Label>Commission per Referral ($)</Label>
        <Input type="number" min={0} step={0.5} value={commissionRate} onChange={e => setCommissionRate(e.target.value)} />
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
