import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeftRight, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardSwitcherProps {
  currentType: "business" | "personal";
  variant?: "default" | "header";
}

export const DashboardSwitcher = ({ currentType, variant = "default" }: DashboardSwitcherProps) => {
  const navigate = useNavigate();
  const [hasOtherAccount, setHasOtherAccount] = useState(false);
  const [otherAccountName, setOtherAccountName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOtherAccount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (currentType === "business") {
        // Check for personal account
        const { data: personal } = await supabase
          .from("personal_profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setHasOtherAccount(!!personal);
        setOtherAccountName(personal?.full_name || null);
      } else {
        // Check for business account
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("restaurant_name, onboarding_completed")
          .eq("owner_id", user.id)
          .maybeSingle();
        
        const hasBusiness = !!restaurant && restaurant.onboarding_completed;
        setHasOtherAccount(hasBusiness);
        setOtherAccountName(restaurant?.restaurant_name || null);
      }
      setLoading(false);
    };

    checkOtherAccount();
  }, [currentType]);

  if (loading || !hasOtherAccount) return null;

  const switchTo = currentType === "business" ? "/personal/dashboard" : "/dashboard";
  const switchLabel = currentType === "business" ? "Personal" : "Business";
  const SwitchIcon = currentType === "business" ? User : Building2;

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate(switchTo)} className="cursor-pointer">
            <SwitchIcon className="w-4 h-4 mr-2" />
            <span>Switch to {switchLabel}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate(switchTo)}
      className="gap-2"
    >
      <ArrowLeftRight className="w-4 h-4" />
      Switch to {switchLabel}
    </Button>
  );
};
