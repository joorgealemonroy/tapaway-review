import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Loader2, ArrowRight, AlertCircle, Shield } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { TRIAL_URL } from "@/lib/constants";
import { motion } from "framer-motion";

const formSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(100),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(50),
  businessType: z.string().min(1, "Please select a business type"),
  email: z.string().trim().email("Please enter a valid email").max(255),
});

const businessTypes = [
  "Restaurant",
  "Cafe / Coffee Shop",
  "Bar / Brewery",
  "Barber / Salon",
  "Food Truck",
  "Bakery",
  "Fast Casual",
  "Fine Dining",
  "Spa / Wellness",
  "Auto / Detailing",
  "Other",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

const Start = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled') === 'true';
  
  const [formData, setFormData] = useState({
    businessName: "",
    city: "",
    state: "",
    businessType: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user already has a pending trial
  useEffect(() => {
    const pendingEmail = localStorage.getItem('tapaway_pending_email');
    if (pendingEmail) {
      setFormData(prev => ({ ...prev, email: pendingEmail }));
    }
  }, []);

  const validateForm = () => {
    try {
      formSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save pending trial to database
      const { error: insertError } = await supabase
        .from("pending_trials")
        .insert({
          email: formData.email.toLowerCase().trim(),
          business_name: formData.businessName.trim(),
          city: formData.city.trim(),
          state: formData.state,
          business_type: formData.businessType,
          status: 'pending_payment',
        });

      if (insertError) {
        // If duplicate email, that's okay - update existing record
        if (insertError.code === '23505') {
          await supabase
            .from("pending_trials")
            .update({
              business_name: formData.businessName.trim(),
              city: formData.city.trim(),
              state: formData.state,
              business_type: formData.businessType,
              status: 'pending_payment',
              updated_at: new Date().toISOString(),
            })
            .eq("email", formData.email.toLowerCase().trim());
        } else {
          throw insertError;
        }
      }

      // Save to localStorage as backup
      localStorage.setItem('tapaway_pending_trial', 'true');
      localStorage.setItem('tapaway_pending_email', formData.email.toLowerCase().trim());
      localStorage.setItem('tapaway_pending_business', formData.businessName.trim());
      localStorage.setItem('tapaway_pending_city', formData.city.trim());
      localStorage.setItem('tapaway_pending_state', formData.state);
      localStorage.setItem('tapaway_pending_type', formData.businessType);
      
      // Set cookies as backup
      document.cookie = `tapaway_pending_trial=true; path=/; max-age=86400`;
      document.cookie = `tapaway_pending_email=${encodeURIComponent(formData.email.toLowerCase().trim())}; path=/; max-age=86400`;

      // Show transition screen
      setIsRedirecting(true);
      
      // Redirect to Stripe after brief delay
      setTimeout(() => {
        window.location.href = TRIAL_URL;
      }, 1500);
      
    } catch (err) {
      console.error('[Start] Error saving pending trial:', err);
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Transition/redirect screen
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Sending you to secure checkout…</h1>
          <p className="text-muted-foreground mb-4">
            You'll see <span className="font-semibold text-foreground">$0 due today</span> and a <span className="font-semibold text-foreground">30-day free trial</span> at checkout.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secured by Stripe</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <a href="/" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Canceled state */}
        {canceled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-muted rounded-lg border border-border"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No worries — your trial didn't start yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your info is saved. Ready when you are.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-black mb-2">Start Your Free 30-Day Trial</h1>
          <p className="text-muted-foreground text-lg">
            No charge today. Cancel anytime before day 30.
          </p>
        </motion.div>

        {/* Offer bullets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-5 bg-primary/5 border-primary/20">
            <ul className="space-y-3">
              {[
                "Done-for-you setup",
                "Custom NFC cards (logo optional)",
                "Ships in 1–2 business days",
                "Review + social hub included",
                "$30/month after trial (no contracts)",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="e.g. Joe's Pizza"
              className={errors.businessName ? "border-destructive" : ""}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive mt-1">{errors.businessName}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Austin"
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">{errors.city}</p>
              )}
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
              >
                <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive mt-1">{errors.state}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="businessType">Business Type *</Label>
            <Select
              value={formData.businessType}
              onValueChange={(value) => setFormData({ ...formData, businessType: value })}
            >
              <SelectTrigger className={errors.businessType ? "border-destructive" : ""}>
                <SelectValue placeholder="Select your business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.businessType && (
              <p className="text-sm text-destructive mt-1">{errors.businessType}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@business.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                Continue to Secure Checkout
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            You'll see $0 due today and a 30-day free trial at checkout.
          </p>
        </motion.form>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>256-bit SSL</span>
          </div>
          <span>•</span>
          <span>Cancel anytime</span>
          <span>•</span>
          <span>No hidden fees</span>
        </motion.div>
      </div>
    </div>
  );
};

export default Start;
