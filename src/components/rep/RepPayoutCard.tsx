import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Save, CheckCircle, Info, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RepPayoutCardProps {
  userId: string;
}

interface PayoutAccount {
  id: string;
  payee_name: string;
  payee_type: string;
  bank_name: string | null;
  account_last4: string;
}

export const RepPayoutCard = ({ userId }: RepPayoutCardProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingAccount, setExistingAccount] = useState<PayoutAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [payeeName, setPayeeName] = useState('');
  const [payeeType, setPayeeType] = useState<'individual' | 'business'>('individual');
  const [bankName, setBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [showRouting, setShowRouting] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showConfirmAccount, setShowConfirmAccount] = useState(false);

  useEffect(() => {
    fetchPayoutAccount();
  }, [userId]);

  const fetchPayoutAccount = async () => {
    try {
      // Only select non-sensitive fields
      const { data, error } = await supabase
        .from('rep_payout_accounts')
        .select('id, payee_name, payee_type, bank_name, account_last4')
        .eq('rep_user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingAccount(data);
        setPayeeName(data.payee_name);
        setPayeeType(data.payee_type as 'individual' | 'business');
        setBankName(data.bank_name || '');
      }
    } catch (error) {
      // No account yet is fine
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!payeeName.trim()) {
      toast.error('Please enter the payee name');
      return false;
    }
    if (!routingNumber.trim() || routingNumber.length !== 9) {
      toast.error('Routing number must be 9 digits');
      return false;
    }
    if (!/^\d{9}$/.test(routingNumber)) {
      toast.error('Routing number must contain only digits');
      return false;
    }
    if (!accountNumber.trim() || accountNumber.length < 4) {
      toast.error('Please enter a valid account number');
      return false;
    }
    if (!/^\d+$/.test(accountNumber)) {
      toast.error('Account number must contain only digits');
      return false;
    }
    if (accountNumber !== confirmAccountNumber) {
      toast.error('Account numbers do not match');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const accountLast4 = accountNumber.slice(-4);
      
      const payoutData = {
        rep_user_id: userId,
        payee_name: payeeName.trim(),
        payee_type: payeeType,
        bank_name: bankName.trim() || null,
        routing_number: routingNumber.trim(),
        account_number: accountNumber.trim(),
        account_last4: accountLast4,
      };

      if (existingAccount) {
        // Update existing
        const { error } = await supabase
          .from('rep_payout_accounts')
          .update(payoutData)
          .eq('id', existingAccount.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('rep_payout_accounts')
          .insert(payoutData);

        if (error) throw error;
      }

      // Refresh data
      await fetchPayoutAccount();
      
      // Clear sensitive fields
      setRoutingNumber('');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIsEditing(false);
      
      toast.success('Bank details saved securely');
    } catch (error: any) {
      toast.error('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (existingAccount) {
      setPayeeName(existingAccount.payee_name);
      setPayeeType(existingAccount.payee_type as 'individual' | 'business');
      setBankName(existingAccount.bank_name || '');
    }
    setRoutingNumber('');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-8">
          <div className="text-center text-slate-400 animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Bank Details for ACH Payouts</CardTitle>
              <CardDescription className="text-xs">Secure direct deposit for commissions</CardDescription>
            </div>
          </div>
          {existingAccount && !isEditing && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              On File
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Display Mode - Show saved account summary */}
        {existingAccount && !isEditing ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Payee Name</span>
                <span className="text-sm font-medium text-slate-900">{existingAccount.payee_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Type</span>
                <span className="text-sm font-medium text-slate-900 capitalize">{existingAccount.payee_type}</span>
              </div>
              {existingAccount.bank_name && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Bank</span>
                  <span className="text-sm font-medium text-slate-900">{existingAccount.bank_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Account</span>
                <span className="text-sm font-medium font-mono text-slate-900">****{existingAccount.account_last4}</span>
              </div>
            </div>
            
            <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full">
              Update Bank Details
            </Button>
          </div>
        ) : (
          /* Edit/Add Mode */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payeeName" className="text-xs font-medium text-slate-600">
                Payee Name (Full Name or Business Name) *
              </Label>
              <Input
                id="payeeName"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="John Smith or Smith LLC"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payeeType" className="text-xs font-medium text-slate-600">
                Payee Type *
              </Label>
              <Select value={payeeType} onValueChange={(v) => setPayeeType(v as 'individual' | 'business')}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-xs font-medium text-slate-600">
                Bank Name (Optional)
              </Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Chase, Bank of America, etc."
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routingNumber" className="text-xs font-medium text-slate-600">
                ACH Routing Number *
              </Label>
              <div className="relative">
                <Input
                  id="routingNumber"
                  type={showRouting ? 'text' : 'password'}
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="9 digits"
                  className="h-10 pr-10 font-mono"
                  maxLength={9}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowRouting(!showRouting)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showRouting ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-xs font-medium text-slate-600">
                Account Number *
              </Label>
              <div className="relative">
                <Input
                  id="accountNumber"
                  type={showAccount ? 'text' : 'password'}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter account number"
                  className="h-10 pr-10 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowAccount(!showAccount)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmAccountNumber" className="text-xs font-medium text-slate-600">
                Confirm Account Number *
              </Label>
              <div className="relative">
                <Input
                  id="confirmAccountNumber"
                  type={showConfirmAccount ? 'text' : 'password'}
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter account number"
                  className="h-10 pr-10 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmAccount(!showConfirmAccount)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {existingAccount && (
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Bank Details'}
              </Button>
            </div>
          </div>
        )}

        {/* Payout Schedule Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-900">Payout Schedule</h4>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li>• All available commission balances are sent <strong>every Tuesday at 12:00 PM Pacific Time</strong>.</li>
                <li>• Newer closes made after the payout calculation window may not appear until the following pay period.</li>
                <li>• ACH transfers typically take <strong>1–3 business days</strong> to arrive depending on the receiving bank.</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
