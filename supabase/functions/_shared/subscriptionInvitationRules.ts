/** Voluntary conversion rules, shared by the server and admin eligibility UI. */
export const INVITATION_VERSION = "existing_hub_subscription_v1";
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
export const subscriptionQuantity = (plan: "solo" | "venue") => plan === "solo" ? 4 : 15;
export const subscriptionTotal = (amount: number, interval: "month" | "year", club: boolean) => amount + (club ? interval === "year" ? 6000 : 500 : 0);
export function canInviteSubscription(hub: { is_approved: boolean | null; subscription_status: string | null; payment_state?: string | null; stripe_subscription_id?: string | null; plan_type?: string | null }) {
  return hub.is_approved === true && !hub.stripe_subscription_id
    && ["active", "trialing"].includes(hub.subscription_status || "")
    && ["unknown_manual", "complimentary", "none", "trialing"].includes(hub.payment_state || "none")
    && hub.plan_type !== "personal" && hub.plan_type !== "personal_hosted";
}