import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';

const RepProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !isSalesRep) {
      navigate('/');
      return;
    }
  }, [authLoading, repLoading, user, isSalesRep, navigate]);

  useEffect(() => {
    if (salesRep) {
      setName(salesRep.name || '');
      setPhone(salesRep.phone || '');
      setPayoutMethod(salesRep.payout_method || '');
    }
  }, [salesRep]);

  const handleSave = async () => {
    if (!salesRep) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales_reps')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
          payout_method: payoutMethod.trim() || null,
        })
        .eq('id', salesRep.id);

      if (error) throw error;
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || repLoading) {
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
            <Button variant="ghost" size="icon" onClick={() => navigate('/rep')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Profile</h1>
              <p className="text-sm text-muted-foreground">Update your information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-xl">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Keep your info up to date for payouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>

            <div>
              <Label htmlFor="payout">Preferred Payout Method</Label>
              <Input
                id="payout"
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                placeholder="e.g., Zelle, CashApp, Venmo, PayPal"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Let us know how you'd like to receive commission payments
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* 1099 Notice */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>Independent Contractor Notice</AlertTitle>
          <AlertDescription className="mt-2 text-sm space-y-2">
            <p>You are a TapAway sales partner operating as an independent contractor (1099).</p>
            <p>You are responsible for your own taxes and record-keeping.</p>
            <p>TapAway may request your tax information (W-9) and issue a 1099 form if required by law.</p>
          </AlertDescription>
        </Alert>

        {/* Sign Out */}
        <Button variant="outline" onClick={signOut} className="w-full">
          Sign Out
        </Button>
      </main>
    </div>
  );
};

export default RepProfile;
