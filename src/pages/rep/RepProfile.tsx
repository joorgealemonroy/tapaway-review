import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRepNavigate } from '@/hooks/useRepNavigate';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, User, FileText, Home, Users, Wallet, LogOut, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { RepTaxCard } from '@/components/rep/RepTaxCard';
import { RepPayoutCard } from '@/components/rep/RepPayoutCard';
import { RepPayoutHistory } from '@/components/rep/RepPayoutHistory';
import { RepAgreementCard } from '@/components/rep/RepAgreementCard';
import { RepDemoRequestCard } from '@/components/rep/RepDemoRequestCard';

const RepProfile = () => {
  const navigate = useRepNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!repLoading && !adminLoading && !isSalesRep) {
      navigate(isAdmin ? '/admin/reps' : '/');
      return;
    }
  }, [authLoading, repLoading, adminLoading, user, isSalesRep, isAdmin, navigate]);

  useEffect(() => {
    if (salesRep) {
      setName(salesRep.name || '');
      setPhone(salesRep.phone || '');
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
        })
        .eq('id', salesRep.id);

      if (error) throw error;
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/rep' },
    { icon: Users, label: 'Restaurants', path: '/rep/restaurants' },
    { icon: Wallet, label: 'Commissions', path: '/rep/commissions' },
    { icon: BookOpen, label: 'Docs', path: '/rep/docs' },
    { icon: User, label: 'Profile', path: '/rep/profile' },
  ];

  if (authLoading || repLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile-first container */}
      <div className="mx-auto w-full max-w-md px-4 pb-24 sm:max-w-xl">
        
        {/* Header */}
        <div className="flex items-center gap-3 pt-4 pb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rep')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Profile & Payments</h1>
            <p className="text-sm text-slate-500">Manage your info and payment details</p>
          </div>
        </div>

        {/* Desktop nav - hidden on mobile */}
        <nav className="hidden sm:flex gap-2 mb-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {/* Profile Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                  <CardDescription className="text-xs">Your contact details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium text-slate-600">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-slate-600">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="h-10 bg-slate-50 text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium text-slate-600">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="h-10"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-10">
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* ACH Payout Card */}
          {user && <RepPayoutCard userId={user.id} />}

          {/* Payout History */}
          {user && <RepPayoutHistory userId={user.id} />}

          {/* Tax & Payments Card */}
          {user && <RepTaxCard userId={user.id} />}

          {/* Agreement Card */}
          {user && <RepAgreementCard userId={user.id} />}

          {/* Demo Request Card */}
          {user && <RepDemoRequestCard userId={user.id} />}

          {/* 1099 Info Card */}
          <Card className="border-slate-200 shadow-sm bg-slate-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">Independent Contractor (1099)</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    As a TapAway sales partner, you operate as an independent contractor. 
                    You're responsible for your own taxes and record-keeping. We may request 
                    your W-9 and issue a 1099 form if required by law.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Button 
            variant="outline" 
            onClick={signOut} 
            className="w-full h-10 text-slate-600 border-slate-200"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Bottom Navigation - Mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default RepProfile;
