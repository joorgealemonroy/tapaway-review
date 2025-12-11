import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface RepPayoutHistoryProps {
  userId: string;
}

interface PayoutRecord {
  id: string;
  amount: number;
  status: 'sent' | 'pending' | 'withheld';
  paid_at: string | null;
  created_at: string;
  note: string | null;
}

export const RepPayoutHistory = ({ userId }: RepPayoutHistoryProps) => {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  useEffect(() => {
    fetchPayoutHistory();
  }, [userId]);

  const fetchPayoutHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('rep_payout_history')
        .select('*')
        .eq('rep_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayouts((data as PayoutRecord[]) || []);
    } catch (error) {
      console.error('Error fetching payout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'withheld':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Withheld
          </Badge>
        );
      default:
        return null;
    }
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-base">Payout History</CardTitle>
            <CardDescription className="text-xs">Your ACH payment records</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Wallet className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No payouts yet</p>
            <p className="text-xs text-slate-400 mt-1">Your payout history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-4 text-xs font-medium text-slate-500">Date</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-slate-500">Amount</th>
                  <th className="text-center py-2 px-4 text-xs font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">
                        {payout.paid_at 
                          ? format(new Date(payout.paid_at), 'MMM d, yyyy')
                          : format(new Date(payout.created_at), 'MMM d, yyyy')
                        }
                      </div>
                      {payout.note && (
                        <div className="text-xs text-slate-500 mt-0.5">{payout.note}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-slate-900">
                        ${payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(payout.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};