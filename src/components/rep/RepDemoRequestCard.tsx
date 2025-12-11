import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RepDemoRequestCardProps {
  userId: string;
}

export const RepDemoRequestCard = ({ userId }: RepDemoRequestCardProps) => {
  const [hasRequested, setHasRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  useEffect(() => {
    const checkExistingRequest = async () => {
      const { data, error } = await supabase
        .from('rep_demo_requests')
        .select('id')
        .eq('rep_user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setHasRequested(true);
      }
      setLoading(false);
    };

    checkExistingRequest();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    try {
      // Insert into database
      const { error: insertError } = await supabase
        .from('rep_demo_requests')
        .insert({
          rep_user_id: userId,
          full_name: fullName.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim() || null,
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        });

      if (insertError) throw insertError;

      // Send notification email
      await supabase.functions.invoke('send-demo-request-notification', {
        body: {
          fullName: fullName.trim(),
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || null,
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
        },
      });

      setHasRequested(true);
      setModalOpen(false);
      toast.success('Your demo kit request was received!');
    } catch (error) {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-6">
          <div className="animate-pulse h-16 bg-slate-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Request Demo Package (8 Cards)</CardTitle>
              <CardDescription className="text-xs">
                TapAway will mail you 8 demo cards so you can show restaurants how it works.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasRequested ? (
            <Button 
              disabled 
              className="w-full h-10 bg-gray-300 text-gray-600 cursor-not-allowed hover:bg-gray-300"
            >
              <Check className="mr-2 h-4 w-4" />
              Already Requested
            </Button>
          ) : (
            <Button 
              onClick={() => setModalOpen(true)}
              className="w-full h-10"
            >
              <Package className="mr-2 h-4 w-4" />
              Request Demo Package
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Demo Package</DialogTitle>
            <DialogDescription>
              Enter your shipping address to receive 8 TapAway demo cards.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1" className="text-sm font-medium">
                Address Line 1 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2" className="text-sm font-medium">
                Address Line 2
              </Label>
              <Input
                id="addressLine2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apt, suite, unit (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip" className="text-sm font-medium">
                ZIP Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP code"
                required
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
