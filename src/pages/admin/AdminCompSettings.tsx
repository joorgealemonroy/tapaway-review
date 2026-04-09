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
  restaurant_annual_upfront: number;
  restaurant_annual_recurring: number;
  restaurant_monthly_upfront: number;
  restaurant_monthly_recurring: number;
  lite_annual_upfront: number;
  lite_annual_recurring: number;
  lite_monthly_upfront: number;
  lite_monthly_recurring: number;
  bonus_amount: number;
  bonus_point_threshold: number;
  restaurant_point_value: number;
  lite_point_value: number;
  clawback_days: number;
}

const FIELDS: { key: keyof Omit<CompSettings, 'id'>; label: string; group: string; step?: string }[] = [
  { key: 'restaurant_annual_upfront', label: 'Annual Upfront ($)', group: 'Venue Pack (Restaurant)', step: '1' },
  { key: 'restaurant_annual_recurring', label: 'Annual Recurring ($)', group: 'Venue Pack (Restaurant)', step: '1' },
  { key: 'restaurant_monthly_upfront', label: 'Monthly Upfront ($)', group: 'Venue Pack (Restaurant)', step: '1' },
  { key: 'restaurant_monthly_recurring', label: 'Monthly Recurring ($)', group: 'Venue Pack (Restaurant)', step: '0.01' },
  { key: 'lite_annual_upfront', label: 'Annual Upfront ($)', group: 'Solo Pro (Business Lite)', step: '1' },
  { key: 'lite_annual_recurring', label: 'Annual Recurring ($)', group: 'Solo Pro (Business Lite)', step: '1' },
  { key: 'lite_monthly_upfront', label: 'Monthly Upfront ($)', group: 'Solo Pro (Business Lite)', step: '1' },
  { key: 'lite_monthly_recurring', label: 'Monthly Recurring ($)', group: 'Solo Pro (Business Lite)', step: '0.01' },
  { key: 'bonus_amount', label: 'Bonus Amount ($)', group: 'Bonus & Points' },
  { key: 'bonus_point_threshold', label: 'Point Threshold', group: 'Bonus & Points' },
  { key: 'restaurant_point_value', label: 'Venue Close Points', group: 'Bonus & Points', step: '0.5' },
  { key: 'lite_point_value', label: 'Solo Close Points', group: 'Bonus & Points', step: '0.5' },
  { key: 'clawback_days', label: 'Clawback Period (days)', group: 'Clawback' },
];

const AdminCompSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminAccess();
  const [settings, setSettings] = useState<CompSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!adminLoading && !isAdmin) { navigate('/'); return; }
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
        setSettings(data as any);
        const vals: Record<string, string> = {};
        FIELDS.forEach(f => { vals[f.key] = String((data as any)[f.key] ?? ''); });
        setValues(vals);
      } catch (error) { console.error('Error fetching settings:', error); }
      finally { setLoading(false); }
    };
    if (isAdmin) fetchSettings();
  }, [isAdmin]);

  const handleSave = async () => {
    if (!settings) return;
    const updateData: Record<string, number> = {};
    for (const f of FIELDS) {
      const v = parseFloat(values[f.key]);
      if (isNaN(v) || v < 0) { toast.error(`Invalid value for ${f.label}`); return; }
      updateData[f.key] = v;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('rep_compensation_settings')
        .update(updateData)
        .eq('id', settings.id);
      if (error) throw error;
      toast.success('Settings saved!');
    } catch (error) { console.error(error); toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (adminLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }

  const groups = [...new Set(FIELDS.map(f => f.group))];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Compensation Settings</h1>
              <p className="text-sm text-muted-foreground">Configure tiered rep payouts</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-xl space-y-6">
        {groups.map(group => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {FIELDS.filter(f => f.group === group).map(f => (
                <div key={f.key}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="number"
                    min="0"
                    step={f.step || '1'}
                    value={values[f.key] || ''}
                    onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Current structure:</strong> Venue: ${values.restaurant_monthly_upfront || '?'} upfront / ${values.restaurant_monthly_recurring || '?'}/mo recurring (monthly), ${values.restaurant_annual_upfront || '?'} / ${values.restaurant_annual_recurring || '?'}/yr (annual). Solo: ${values.lite_monthly_upfront || '?'} / ${values.lite_monthly_recurring || '?'}/mo, ${values.lite_annual_upfront || '?'} / ${values.lite_annual_recurring || '?'}/yr. Bonus: ${values.bonus_amount || '?'} at {values.bonus_point_threshold || '?'} pts. Clawback: {values.clawback_days || '?'} days.
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
};

export default AdminCompSettings;
