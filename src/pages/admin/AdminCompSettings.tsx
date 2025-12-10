import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

interface CompSettings {
  id: string;
  base_commission_per_close: number;
  bonus_amount: number;
  bonus_threshold_closes: number;
  bonus_period: string;
}

const AdminCompSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [settings, setSettings] = useState<CompSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [baseCommission, setBaseCommission] = useState('50');
  const [bonusAmount, setBonusAmount] = useState('500');
  const [bonusThreshold, setBonusThreshold] = useState('30');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
  }, [adminLoading, isAdmin, navigate]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('rep_compensation_settings')
          .select('*')
          .limit(1)
          .single();

        if (error) throw error;

        setSettings(data);
        setBaseCommission(String(data.base_commission_per_close));
        setBonusAmount(String(data.bonus_amount));
        setBonusThreshold(String(data.bonus_threshold_closes));
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const handleSave = async () => {
    if (!settings) return;

    const base = parseFloat(baseCommission);
    const bonus = parseFloat(bonusAmount);
    const threshold = parseInt(bonusThreshold);

    if (isNaN(base) || base < 0) {
      toast.error('Invalid base commission amount');
      return;
    }
    if (isNaN(bonus) || bonus < 0) {
      toast.error('Invalid bonus amount');
      return;
    }
    if (isNaN(threshold) || threshold < 1) {
      toast.error('Invalid bonus threshold');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('rep_compensation_settings')
        .update({
          base_commission_per_close: base,
          bonus_amount: bonus,
          bonus_threshold_closes: threshold,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Compensation Settings</h1>
              <p className="text-sm text-muted-foreground">Configure rep payouts</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
            <CardDescription>
              These settings apply to all sales reps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="base">Base Commission Per Close ($)</Label>
              <Input
                id="base"
                type="number"
                min="0"
                step="1"
                value={baseCommission}
                onChange={(e) => setBaseCommission(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Amount earned for each closed restaurant (any plan)
              </p>
            </div>

            <div>
              <Label htmlFor="bonus">Bonus Amount ($)</Label>
              <Input
                id="bonus"
                type="number"
                min="0"
                step="1"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Extra bonus when rep hits the close threshold
              </p>
            </div>

            <div>
              <Label htmlFor="threshold">Bonus Threshold (closes)</Label>
              <Input
                id="threshold"
                type="number"
                min="1"
                step="1"
                value={bonusThreshold}
                onChange={(e) => setBonusThreshold(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of closes per month to earn bonus (bonus awarded at each multiple)
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Current structure:</strong> ${baseCommission} per close, plus ${bonusAmount} bonus for every {bonusThreshold} closes in a calendar month.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
};

export default AdminCompSettings;
