import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalesRep } from '@/hooks/useSalesRep';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

interface RepRestaurant {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  status: string;
}

const RepClose = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { salesRep, loading: repLoading, isSalesRep } = useSalesRep();
  
  const [step, setStep] = useState(1);
  const [restaurants, setRestaurants] = useState<RepRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RepRestaurant | null>(null);
  const [isNewRestaurant, setIsNewRestaurant] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [planType, setPlanType] = useState<string>('monthly');
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

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
    const fetchRestaurants = async () => {
      if (!salesRep) return;

      const { data } = await supabase
        .from('rep_restaurants')
        .select('id, name, contact_name, email, status')
        .eq('sales_rep_id', salesRep.id)
        .neq('status', 'closed')
        .neq('status', 'lost')
        .order('name');

      setRestaurants(data || []);

      // Check if restaurant was passed in URL
      const restaurantId = searchParams.get('restaurant');
      if (restaurantId && data) {
        const found = data.find(r => r.id === restaurantId);
        if (found) {
          setSelectedRestaurantId(restaurantId);
          setSelectedRestaurant(found);
        }
      }
    };

    if (salesRep) {
      fetchRestaurants();
    }
  }, [salesRep, searchParams]);

  const handleRestaurantSelect = (value: string) => {
    if (value === 'new') {
      setIsNewRestaurant(true);
      setSelectedRestaurantId('');
      setSelectedRestaurant(null);
    } else {
      setIsNewRestaurant(false);
      setSelectedRestaurantId(value);
      const found = restaurants.find(r => r.id === value);
      setSelectedRestaurant(found || null);
    }
  };

  const handleCreateAndContinue = async () => {
    if (!salesRep || !newRestaurantName.trim()) {
      toast.error('Restaurant name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rep_restaurants')
        .insert({
          sales_rep_id: salesRep.id,
          name: newRestaurantName.trim(),
          contact_name: newContactName.trim() || null,
          email: newEmail.trim() || null,
          status: 'contacted',
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedRestaurant({
        id: data.id,
        name: data.name,
        contact_name: data.contact_name,
        email: data.email,
        status: data.status,
      });
      setSelectedRestaurantId(data.id);
      setIsNewRestaurant(false);
      setStep(2);
      toast.success('Restaurant created!');
    } catch (error) {
      console.error('Error creating restaurant:', error);
      toast.error('Failed to create restaurant');
    }
  };

  const handleGenerateCheckoutLink = async () => {
    if (!salesRep || !selectedRestaurant) return;

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-rep-checkout', {
        body: {
          plan: planType,
          salesRepId: salesRep.id,
          repRestaurantId: selectedRestaurant.id,
          restaurantName: selectedRestaurant.name,
          contactEmail: selectedRestaurant.email,
        },
      });

      if (error) throw error;

      setCheckoutUrl(data.url);
      setStep(3);
    } catch (error) {
      console.error('Error generating checkout link:', error);
      toast.error('Failed to generate checkout link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
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
              <h1 className="text-xl font-bold text-foreground">Close a Restaurant</h1>
              <p className="text-sm text-muted-foreground">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-xl">
        {/* Step 1: Select Restaurant */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Restaurant</CardTitle>
              <CardDescription>Choose an existing prospect or add a new one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={isNewRestaurant ? 'new' : selectedRestaurantId} onValueChange={handleRestaurantSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a restaurant..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Add New Restaurant</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isNewRestaurant && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="name">Restaurant Name *</Label>
                    <Input
                      id="name"
                      value={newRestaurantName}
                      onChange={(e) => setNewRestaurantName(e.target.value)}
                      placeholder="e.g., Joe's Pizza"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact Name</Label>
                    <Input
                      id="contact"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="Owner/Manager name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="owner@restaurant.com"
                    />
                  </div>
                  <Button onClick={handleCreateAndContinue} className="w-full">
                    Create & Continue
                  </Button>
                </div>
              )}

              {selectedRestaurant && !isNewRestaurant && (
                <div className="pt-4 border-t">
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <p className="font-medium">{selectedRestaurant.name}</p>
                    {selectedRestaurant.contact_name && (
                      <p className="text-sm text-muted-foreground">{selectedRestaurant.contact_name}</p>
                    )}
                    {selectedRestaurant.email && (
                      <p className="text-sm text-muted-foreground">{selectedRestaurant.email}</p>
                    )}
                  </div>
                  <Button onClick={() => setStep(2)} className="w-full">
                    Continue to Plan Selection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Plan */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Plan for {selectedRestaurant?.name}</CardTitle>
              <CardDescription>Choose the subscription plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={planType} onValueChange={setPlanType} className="space-y-3">
                <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer ${planType === 'monthly' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div className="font-medium">Monthly</div>
                    <div className="text-sm text-muted-foreground">$30/month</div>
                  </Label>
                </div>
                
                <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer ${planType === 'yearly_150' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="yearly_150" id="yearly_150" />
                  <Label htmlFor="yearly_150" className="flex-1 cursor-pointer">
                    <div className="font-medium">Yearly (Promo)</div>
                    <div className="text-sm text-muted-foreground">$150/year — December special!</div>
                  </Label>
                </div>

                <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer ${planType === 'yearly_300' ? 'border-primary bg-primary/5' : ''}`}>
                  <RadioGroupItem value="yearly_300" id="yearly_300" />
                  <Label htmlFor="yearly_300" className="flex-1 cursor-pointer">
                    <div className="font-medium">Yearly (Standard)</div>
                    <div className="text-sm text-muted-foreground">$300/year</div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleGenerateCheckoutLink} disabled={generating} className="flex-1">
                  {generating ? 'Generating...' : 'Generate Checkout Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Share Link */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Ready to Close!
              </CardTitle>
              <CardDescription>
                Share this link with {selectedRestaurant?.name} to complete the signup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Checkout Link</Label>
                <div className="flex gap-2">
                  <Input value={checkoutUrl} readOnly className="text-xs" />
                  <Button onClick={handleCopyLink} variant="outline" size="icon">
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <QRCode value={checkoutUrl} size={180} />
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Have the restaurant owner scan this QR code or open the link to complete payment.
                Once they pay, this restaurant will be marked as Closed and your $50 commission will be added automatically.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/rep')} className="flex-1">
                  Done
                </Button>
                <Button asChild className="flex-1">
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Link
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default RepClose;
