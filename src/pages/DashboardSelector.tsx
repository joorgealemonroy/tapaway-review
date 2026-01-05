import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const DashboardSelector = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasBusinessAccount, setHasBusinessAccount] = useState(false);
  const [hasPersonalAccount, setHasPersonalAccount] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const checkAccounts = async () => {
      // Check for business account
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("restaurant_name, onboarding_completed, subscription_status")
        .eq("owner_id", user.id)
        .maybeSingle();

      // Check for personal account
      const { data: personal } = await supabase
        .from("personal_profiles")
        .select("full_name, username")
        .eq("user_id", user.id)
        .maybeSingle();

      const hasBusiness = !!restaurant && restaurant.onboarding_completed;
      const hasPersonal = !!personal;

      setHasBusinessAccount(hasBusiness);
      setHasPersonalAccount(hasPersonal);
      setBusinessName(restaurant?.restaurant_name || null);
      setPersonalName(personal?.full_name || null);

      // If user only has one type, redirect directly
      if (hasBusiness && !hasPersonal) {
        navigate("/dashboard");
        return;
      }
      if (hasPersonal && !hasBusiness) {
        navigate("/personal/dashboard");
        return;
      }
      if (!hasBusiness && !hasPersonal) {
        // No accounts - go to paywall
        navigate("/paywall");
        return;
      }

      // User has both - show selector
      setChecking(false);
    };

    checkAccounts();
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Which dashboard would you like to access?</p>
        </div>

        <div className="space-y-3">
          {hasBusinessAccount && (
            <Button
              variant="outline"
              className="w-full h-auto py-4 px-5 justify-start gap-4 border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => navigate("/dashboard")}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Business Dashboard</div>
                <div className="text-sm text-muted-foreground">{businessName || "Your business"}</div>
              </div>
            </Button>
          )}

          {hasPersonalAccount && (
            <Button
              variant="outline"
              className="w-full h-auto py-4 px-5 justify-start gap-4 border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => navigate("/personal/dashboard")}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                <User className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Personal Dashboard</div>
                <div className="text-sm text-muted-foreground">{personalName || "Your profile"}</div>
              </div>
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can switch between dashboards anytime
        </p>
      </div>
    </div>
  );
};

export default DashboardSelector;
