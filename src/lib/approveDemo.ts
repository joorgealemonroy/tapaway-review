// Shared demo-approval helper — the ONE place that performs an admin
// approval of a rep-created demo hub. Reuses the exact update set from
// AdminPendingHubApprovals.approve() plus the award-demo-commission
// edge-function call ($5/demo rep payout hook).
//
// Do not duplicate this logic in other components: import approveDemo().

import { supabase } from "@/integrations/supabase/client";

export type ApproveDemoResult =
  | { ok: true; award: string | null }
  | { ok: true; award: string | null; awardError: true };

export async function approveDemo(profileId: string): Promise<ApproveDemoResult> {
  const { data: userRes } = await supabase.auth.getUser();
  const adminId = userRes?.user?.id ?? null;

  // Never synthesise a business name from the slug: a blank name is an
  // intentional state. Approval only moves the pipeline stage forward.
  const { error } = await supabase
    .from("personal_profiles")
    .update({
      is_approved: true,
      plan_type: "solo_pro",
      pipeline_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      review_note: null,
      review_note_at: null,
      rep_note: null,
      rep_note_at: null,
    } as never)
    .eq("id", profileId);

  if (error) {
    throw new Error("Approval failed: " + error.message);
  }

  try {
    const { data, error: awardErr } = await supabase.functions.invoke(
      "award-demo-commission",
      { body: { personal_profile_id: profileId } },
    );
    if (awardErr) throw awardErr;
    return { ok: true, award: (data?.awarded as string | undefined) ?? null };
  } catch (e) {
    console.error("award-demo-commission failed", e);
    return { ok: true, award: null, awardError: true };
  }
}

export function approveToastText(award: string | null, awardError?: boolean): {
  kind: "success" | "warning";
  text: string;
} {
  if (awardError) {
    return {
      kind: "warning",
      text: "Approved, but commission could not be awarded automatically",
    };
  }
  if (award === "locked_quality_gate") {
    return {
      kind: "success",
      text: "Approved — bonus locked by Quality Gate (rep <5% conversion)",
    };
  }
  if (award === "voided") {
    return {
      kind: "success",
      text: "Approved — daily cap reached, no bonus awarded",
    };
  }
  return { kind: "success", text: "Demo approved — rep bonus awarded" };
}
