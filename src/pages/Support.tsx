import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, 
  MapPin, 
  AlertCircle, 
  Receipt, 
  HelpCircle,
  Check,
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Building2
} from 'lucide-react';

type RequestType = 'NEW_CARDS' | 'MORE_CARDS' | 'TECH_ISSUE' | 'BILLING' | 'OTHER' | null;

interface FormData {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  quantityRequested: number;
  // New cards specific
  cardNeeds: string[];
  // More cards specific
  newLocationsCount: number;
  // Tech issue specific
  techIssues: string[];
}

const requestTypeOptions = [
  {
    type: 'NEW_CARDS' as RequestType,
    icon: CreditCard,
    title: 'Request new or replacement cards',
    description: 'Lost, damaged, or need more cards',
  },
  {
    type: 'MORE_CARDS' as RequestType,
    icon: MapPin,
    title: 'Add more cards or locations',
    description: 'Expand to new locations',
  },
  {
    type: 'TECH_ISSUE' as RequestType,
    icon: AlertCircle,
    title: 'Issue with my hub / link / QR / NFC',
    description: 'Something isn\'t working right',
  },
  {
    type: 'BILLING' as RequestType,
    icon: Receipt,
    title: 'Billing or account question',
    description: 'Invoices, payments, or account changes',
  },
  {
    type: 'OTHER' as RequestType,
    icon: HelpCircle,
    title: 'Something else',
    description: 'General questions or feedback',
  },
];

const cardNeedOptions = [
  { id: 'replacement_damaged', label: 'Replacement for damaged card' },
  { id: 'lost_card', label: 'Lost card' },
  { id: 'more_existing', label: 'More cards for existing location' },
  { id: 'new_location', label: 'Cards for a new location' },
];

const techIssueOptions = [
  { id: 'wrong_link', label: 'Link goes to wrong place' },
  { id: 'qr_not_scanning', label: 'QR code not scanning' },
  { id: 'nfc_not_working', label: 'NFC not working' },
  { id: 'page_broken', label: 'Hub page is broken or missing' },
  { id: 'other', label: 'Other issue' },
];

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedType, setSelectedType] = useState<RequestType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    location: '',
    description: '',
    quantityRequested: 15,
    cardNeeds: [],
    newLocationsCount: 1,
    techIssues: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Prefill form data for logged-in users
  useEffect(() => {
    const prefillUserData = async () => {
      if (!user) return;
      
      // Get user's restaurant data
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('restaurant_name, email, phone, owner_name')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (restaurant) {
        setFormData(prev => ({
          ...prev,
          name: restaurant.owner_name || prev.name,
          businessName: restaurant.restaurant_name || prev.businessName,
          email: restaurant.email || user.email || prev.email,
          phone: restaurant.phone || prev.phone,
        }));
      } else if (user.email) {
        setFormData(prev => ({
          ...prev,
          email: user.email || prev.email,
        }));
      }
    };
    
    prefillUserData();
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (selectedType === 'NEW_CARDS' && formData.cardNeeds.length === 0) {
      newErrors.cardNeeds = 'Please select at least one option';
    }
    
    if (selectedType === 'TECH_ISSUE' && formData.techIssues.length === 0) {
      newErrors.techIssues = 'Please select at least one issue';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Build request details based on type
      const requestDetails: Record<string, any> = {};
      
      if (selectedType === 'NEW_CARDS') {
        requestDetails.cardNeeds = formData.cardNeeds;
        requestDetails.quantity = formData.quantityRequested;
      } else if (selectedType === 'MORE_CARDS') {
        requestDetails.newLocationsCount = formData.newLocationsCount;
        requestDetails.quantity = formData.quantityRequested;
      } else if (selectedType === 'TECH_ISSUE') {
        requestDetails.techIssues = formData.techIssues;
      }
      
      // Insert support request
      const { error: insertError } = await supabase
        .from('support_requests')
        .insert({
          request_type: selectedType,
          name: formData.name.trim(),
          business_name: formData.businessName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          location: formData.location.trim() || null,
          quantity_requested: ['NEW_CARDS', 'MORE_CARDS'].includes(selectedType) ? formData.quantityRequested : null,
          description: formData.description.trim() || null,
          request_details: requestDetails,
          user_id: user?.id || null,
        });
      
      if (insertError) throw insertError;
      
      // Send notification email
      await supabase.functions.invoke('support-notification', {
        body: {
          requestType: selectedType,
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          description: formData.description,
          requestDetails,
        },
      });
      
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting support request:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again or email us directly at tap@tapaway.co',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckboxChange = (field: 'cardNeeds' | 'techIssues', value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(v => v !== value),
    }));
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Thanks — we've received your request
          </h1>
          <p className="text-muted-foreground mb-6">
            We typically respond within 1 business day. Check your inbox for a confirmation email.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            If it's urgent, reply directly to the confirmation email you receive.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to TapAway
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Need help with TapAway?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Request new cards, fix issues, or ask us anything. We're here to help your business get more reviews.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Request Type Selector */}
        {!selectedType ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              What can we help you with?
            </h2>
            <div className="grid gap-3">
              {requestTypeOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className="flex items-center gap-4 p-5 bg-card border border-border rounded-xl text-left hover:border-primary/50 hover:bg-accent/50 transition-all"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <option.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{option.title}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Back button */}
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Choose a different topic</span>
            </button>

            {/* Selected type header */}
            <div className="flex items-center gap-4 p-5 bg-primary/5 border border-primary/20 rounded-xl">
              {(() => {
                const option = requestTypeOptions.find(o => o.type === selectedType);
                if (!option) return null;
                return (
                  <>
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <option.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{option.title}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Common Fields */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-foreground">Your Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Smith"
                    maxLength={100}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Your Restaurant"
                    maxLength={100}
                    className={errors.businessName ? 'border-destructive' : ''}
                  />
                  {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="you@example.com"
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location / Store (optional)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Downtown location, Store #123"
                />
              </div>
            </div>

            {/* Type-specific Fields */}
            {selectedType === 'NEW_CARDS' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">What do you need?</h3>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Replacement cards are limited to 10 per month per location.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {cardNeedOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.cardNeeds.includes(option.id)}
                        onCheckedChange={(checked) => handleCheckboxChange('cardNeeds', option.id, checked as boolean)}
                      />
                      <span className="text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.cardNeeds && <p className="text-sm text-destructive">{errors.cardNeeds}</p>}
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">How many cards do you need?</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.quantityRequested}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantityRequested: Math.min(10, parseInt(e.target.value) || 1) }))}
                    className="max-w-32"
                  />
                  <p className="text-xs text-muted-foreground">Max 10 per month</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Additional notes (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Any details that might help us..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {selectedType === 'MORE_CARDS' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Tell us about your expansion</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newLocations">Number of new locations</Label>
                    <Input
                      id="newLocations"
                      type="number"
                      min={1}
                      max={100}
                      value={formData.newLocationsCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, newLocationsCount: parseInt(e.target.value) || 1 }))}
                      className="max-w-32"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Approx. cards needed per location</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={500}
                      value={formData.quantityRequested}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantityRequested: parseInt(e.target.value) || 1 }))}
                      className="max-w-32"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Additional notes (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell us about the new locations, timeline, etc."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {selectedType === 'TECH_ISSUE' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">What's wrong?</h3>
                <div className="space-y-3">
                  {techIssueOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={formData.techIssues.includes(option.id)}
                        onCheckedChange={(checked) => handleCheckboxChange('techIssues', option.id, checked as boolean)}
                      />
                      <span className="text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.techIssues && <p className="text-sm text-destructive">{errors.techIssues}</p>}
                
                <div className="space-y-2">
                  <Label htmlFor="description">Describe the issue *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell us what's happening and when it started..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    Tip: After submitting, you can reply to the confirmation email with screenshots.
                  </p>
                </div>
              </div>
            )}

            {selectedType === 'BILLING' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">Billing Question</h3>
                <div className="space-y-2">
                  <Label htmlFor="description">How can we help? *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your billing question or issue..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {selectedType === 'OTHER' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-foreground">How can we help?</h3>
                <div className="space-y-2">
                  <Label htmlFor="description">Your message *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ask us anything..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full md:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need immediate help? Email us at{' '}
            <a href="mailto:tap@tapaway.co" className="text-primary hover:underline">
              tap@tapaway.co
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}