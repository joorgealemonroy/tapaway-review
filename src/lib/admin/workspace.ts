import { supabase } from "@/integrations/supabase/client";
export type Hub = {
  id: string;
  kind: "personal" | "business";
  name: string;
  slug: string | null;
  payment_state: string;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  is_approved: boolean;
  created_at: string;
  views: number;
  clicks: number;
  photo_url: string | null;
};
export const adminDestinations = [
  {
    id: "overview",
    label: "Overview",
    description: "Revenue, monthly goal and next steps",
    path: "/admin",
    keywords: "money revenue mrr goal home",
  },
  {
    id: "hubs",
    label: "Hubs & accounts",
    description: "Find, edit and manage every hub",
    path: "/admin?section=accounts",
    keywords: "customer client account edit profile gift complimentary",
  },
  {
    id: "orders",
    label: "Orders & printing",
    description: "Business fulfillment and personal card orders",
    path: "/admin?section=orders",
    keywords: "shipping delivery print artwork pdf card",
  },
  {
    id: "messages",
    label: "Messages",
    description: "Customer updates, in-app offers and drafts",
    path: "/admin?section=messages",
    keywords: "notification announcement referral offer update send",
  },
  {
    id: "insights",
    label: "Insights",
    description: "Website traffic and hub engagement",
    path: "/admin/analytics",
    keywords: "analytics visits views clicks traffic conversions",
  },
  {
    id: "tools",
    label: "Tools",
    description: "Sales, support and settings",
    path: "/admin?section=tools",
    keywords: "settings password",
  },
  {
    id: "support",
    label: "Customer support",
    description: "Customer questions and requests",
    path: "/admin?section=support",
    keywords: "help question ticket inbox",
  },
  {
    id: "business-orders",
    label: "Business fulfillment",
    description: "Review, print and deliver business cards",
    path: "/admin/fulfillment",
    keywords: "business shipping",
  },
  {
    id: "personal-orders",
    label: "Personal card orders",
    description: "Two-card orders and print-ready artwork",
    path: "/admin/personal-card-orders",
    keywords: "personal cards",
  },
  {
    id: "emails",
    label: "Email tools",
    description: "Email templates, broadcasts and history",
    path: "/admin/emails",
    keywords: "email mail history template",
  },
  {
    id: "locations",
    label: "Locations",
    description: "Business addresses and map",
    path: "/admin/locations",
    keywords: "map address location",
  },
  {
    id: "showcase",
    label: "Storefront photos",
    description: "Manage the card showcase",
    path: "/admin/card-showcase",
    keywords: "photo homepage image showcase",
  },
  {
    id: "reps",
    label: "Sales reps",
    description: "Applications and rep management",
    path: "/admin/reps",
    keywords: "rep sales team application",
  },
  {
    id: "commissions",
    label: "Commissions",
    description: "Sales commissions",
    path: "/admin/commissions",
    keywords: "commission earnings",
  },
  {
    id: "payouts",
    label: "Payouts",
    description: "Rep payout batches",
    path: "/admin/payouts",
    keywords: "payout ach",
  },
  {
    id: "tax",
    label: "Tax documents",
    description: "Review W-9s",
    path: "/admin/tax-review",
    keywords: "tax w9 w-9",
  },
  {
    id: "discounts",
    label: "Discounts",
    description: "Discount payment links",
    path: "/admin/discounts",
    keywords: "coupon promotion discount",
  },
  {
    id: "plans",
    label: "Custom plans",
    description: "Custom recurring pricing",
    path: "/admin/custom-plans",
    keywords: "custom pricing plan",
  },
  {
    id: "van",
    label: "Van sales",
    description: "In-person sales",
    path: "/admin/van",
    keywords: "van field sale",
  },
  {
    id: "health",
    label: "Hub health",
    description: "Check public hubs and links",
    path: "/admin/hub-health",
    keywords: "broken link health",
  },
  {
    id: "errors",
    label: "App errors",
    description: "Investigate reported errors",
    path: "/admin/errors",
    keywords: "error crash bug",
  },
  {
    id: "sms",
    label: "VIP SMS lists",
    description: "Subscriber lists",
    path: "/admin/sms-subscribers",
    keywords: "sms phone text",
  },
  {
    id: "affiliates",
    label: "Affiliates",
    description: "Affiliate accounts and rewards",
    path: "/admin/affiliates",
    keywords: "affiliate partner",
  },
  {
    id: "comp",
    label: "Commission settings",
    description: "Rep rates and thresholds",
    path: "/admin/settings/comp",
    keywords: "commission rate",
  },
  {
    id: "demos",
    label: "Demo requests",
    description: "Requested demo kits",
    path: "/admin/demo-requests",
    keywords: "demo request kit",
  },
  {
    id: "cards",
    label: "NFC cards",
    description: "Card inventory and assignments",
    path: "/admin/cards",
    keywords: "nfc inventory assign activation",
  },
  {
    id: "founders",
    label: "Founders",
    description: "Founding customer program",
    path: "/admin/founders",
    keywords: "founder",
  },
];
export const hubEditPath = (hub: Hub) =>
  `/dashboard?${hub.kind === "business" ? "admin_view" : "admin_view_personal"}=${encodeURIComponent(hub.id)}`;
export const billingLabel = (hub: Hub) =>
  hub.payment_state === "complimentary"
    ? "Gift account"
    : !hub.stripe_subscription_id
      ? "No subscription"
      : hub.subscription_status === "trialing"
        ? "Stripe trial"
        : hub.subscription_status?.replace(/_/g, " ") || "Check billing";
// Generated Supabase types are refreshed by Lovable after migration deployment.
export async function workspaceRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: T; error: { message: string } | null }>
  )(name, args);
  if (error) throw new Error(error.message);
  return data;
}
export async function adminFunction<T>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error || data?.error)
    throw new Error(data?.error || error?.message || "Please try again.");
  return data as T;
}
