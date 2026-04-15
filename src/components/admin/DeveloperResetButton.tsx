import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export const DeveloperResetButton = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uid = user.id;

      // 1. Get profile IDs to delete related links/blocks
      const { data: profiles } = await supabase
        .from("personal_profiles")
        .select("id")
        .eq("user_id", uid);

      if (profiles && profiles.length > 0) {
        const profileIds = profiles.map((p) => p.id);

        const { error: linksErr } = await supabase.from("personal_links").delete().in("profile_id", profileIds);
        if (linksErr) console.error("[dev-reset] links delete failed:", linksErr);
        const { error: blocksErr } = await supabase.from("personal_blocks").delete().in("profile_id", profileIds);
        if (blocksErr) console.error("[dev-reset] blocks delete failed:", blocksErr);
        const { error: leadsErr } = await supabase.from("lead_forms").delete().in("profile_id", profileIds);
        if (leadsErr) console.error("[dev-reset] lead_forms delete failed:", leadsErr);
      }

      // 2. Delete personal_profiles
      const { error: profilesErr } = await supabase.from("personal_profiles").delete().eq("user_id", uid);
      if (profilesErr) console.error("[dev-reset] profiles delete failed:", profilesErr);

      // 3. Delete restaurants
      const { error: restErr } = await supabase.from("restaurants").delete().eq("owner_id", uid);
      if (restErr) console.error("[dev-reset] restaurants delete failed:", restErr);

      // 4. Clear localStorage onboarding data
      localStorage.removeItem("onboarding_data");
      localStorage.removeItem("onboarding_step");
      localStorage.removeItem("onboarding_plan");
      localStorage.removeItem("pending_onboarding_data");

      toast({ title: "Reset complete", description: "Onboarding data cleared. Redirecting..." });

      // 5. Redirect to onboarding
      navigate("/onboarding");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reset failed";
      console.error("[dev-reset]", err);
      toast({ title: "Reset failed", description: message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Onboarding (Dev)
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset onboarding data for testing?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete your personal profiles, links, blocks, lead forms, and restaurants.
            You'll be redirected back to the onboarding flow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset & Restart"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
