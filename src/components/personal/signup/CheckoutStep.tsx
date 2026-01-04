import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignupData } from "@/pages/personal/PersonalSignup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Check,
  CreditCard,
  Loader2,
  Shield
} from "lucide-react";

interface Props {
  formData: SignupData;
  updateFormData: (updates: Partial<SignupData>) => void;
  onBack: () => void;
  onComplete: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const CheckoutStep = ({ formData, updateFormData, onBack, onComplete, isLoading, setIsLoading }: Props) => {
  const [processing, setProcessing] = useState(false);

  const includedFeatures = [
    "1 custom TapAway NFC card",
    "Unlimited links & updates",
    "Personal dashboard",
    "Basic analytics (profile visits)",
    "Free shipping",
  ];

  const monthlyPrice = 9;
  const yearlyPrice = 99;
  const extraCardPrice = 10;

  const calculateTotal = () => {
    let total = formData.planType === "yearly" ? yearlyPrice : monthlyPrice;
    if (formData.addExtraCard) {
      total += extraCardPrice;
    }
    return total;
  };

  const handleCheckout = async () => {
    setProcessing(true);
    setIsLoading(true);

    try {
      // Call the edge function to create checkout session
      const { data, error } = await supabase.functions.invoke("create-personal-checkout", {
        body: {
          email: formData.email,
          fullName: formData.fullName,
          username: formData.username,
          planType: formData.planType,
          addExtraCard: formData.addExtraCard,
          links: formData.links,
          // Photo will be uploaded after account creation
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Store form data in sessionStorage for after checkout
        sessionStorage.setItem("personal_signup_data", JSON.stringify({
          ...formData,
          profilePhoto: null, // Can't store File in sessionStorage
        }));
        
        // Redirect to Stripe
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setProcessing(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan Selection */}
      <div className="space-y-3">
        {/* Yearly Plan */}
        <button
          onClick={() => updateFormData({ planType: "yearly" })}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            formData.planType === "yearly"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">$99/year</span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  Best Value — 2 months free
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Save $9 compared to monthly</p>
            </div>
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              formData.planType === "yearly" ? "border-primary bg-primary" : "border-muted-foreground"
            }`}>
              {formData.planType === "yearly" && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
        </button>

        {/* Monthly Plan */}
        <button
          onClick={() => updateFormData({ planType: "monthly" })}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            formData.planType === "monthly"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground">$9/month</span>
              <p className="text-sm text-muted-foreground mt-1">Flexible monthly billing</p>
            </div>
            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
              formData.planType === "monthly" ? "border-primary bg-primary" : "border-muted-foreground"
            }`}>
              {formData.planType === "monthly" && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </div>
        </button>
      </div>

      {/* What's Included */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold text-foreground mb-3">What's included</h3>
        <ul className="space-y-2">
          {includedFeatures.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Extra Card Add-on */}
      {formData.addExtraCard && (
        <div className="flex items-center justify-between text-sm p-3 bg-muted/30 rounded-lg">
          <span className="text-muted-foreground">Extra card</span>
          <span className="font-medium">+${extraCardPrice}</span>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between py-4 border-t border-border">
        <span className="text-lg font-semibold text-foreground">Total due today</span>
        <span className="text-2xl font-bold text-foreground">${calculateTotal()}</span>
      </div>

      {/* CTA Button */}
      <Button
        onClick={handleCheckout}
        disabled={processing || isLoading}
        className="w-full h-14 text-base font-semibold"
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Get My TapAway Card
          </>
        )}
      </Button>

      {/* Reassurance */}
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Instant access • No app required • Works on iPhone & Android
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secure checkout powered by Stripe</span>
        </div>
      </div>

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="w-full h-12"
        disabled={processing}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
    </div>
  );
};
