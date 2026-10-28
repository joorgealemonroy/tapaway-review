import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, json, userFromRequest } from "../_shared/paymentFirst.ts";
import { isAdmin } from "../_shared/security.ts";
import { PERSONAL_BUCKET } from "../_shared/personalCards.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await userFromRequest(req);
  if (!user || !(await isAdmin(user.id)))
    return json({ error: "Admin access required." }, 403);
  try {
    const body = await req.json(),
      db = admin();
    if (body.action === "list") {
      const { data, error } = await db
        .from("personal_card_orders")
        .select(
          "id,status,production_status,hub_requested,customer_name,email,shipping_address,destinations,tracking,paid_at,stripe_livemode,artwork_revision",
        )
        .not("activated_at", "is", null)
        .order("paid_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ orders: data });
    }
    const { data: order, error } = await db
      .from("personal_card_orders")
      .select("*")
      .eq("id", body.orderId)
      .single();
    if (error || !order) return json({ error: "Order not found." }, 404);
    if (body.action === "download") {
      if (!order.paid_at || !["pdf", "source"].includes(body.file))
        return json({ error: "Paid artwork only." }, 400);
      const path =
        body.file === "pdf" ? order.artwork_path : order.manifest_path;
      const result = await db.storage
        .from(PERSONAL_BUCKET)
        .createSignedUrl(path, 60, {
          download:
            body.file === "pdf"
              ? `tapaway-${order.id}-print.pdf`
              : `tapaway-${order.id}-design.json`,
        });
      if (result.error) throw result.error;
      return json({ url: result.data.signedUrl });
    }
    if (
      body.action !== "status" ||
      order.status !== "paid" ||
      !order.activated_at
    )
      return json(
        { error: "Only a confirmed paid order can enter production." },
        400,
      );
    const allowed: Record<string, string[]> = {
      needs_review: ["approved", "on_hold"],
      approved: ["printed", "on_hold"],
      printed: ["shipped", "on_hold"],
      on_hold: ["needs_review"],
      shipped: [],
    };
    if (!allowed[order.production_status]?.includes(body.status))
      return json({ error: "Invalid production step." }, 409);
    if (body.status === "approved" && body.printChecks !== true)
      return json({ error: "Confirm the print and QR checks first." }, 400);
    const tracking =
      typeof body.tracking === "string"
        ? body.tracking.trim().slice(0, 200)
        : "";
    if (body.status === "shipped" && !tracking)
      return json({ error: "Add the carrier and tracking/reference." }, 400);
    const result = await db
      .from("personal_card_orders")
      .update({
        production_status: body.status,
        ...(tracking ? { tracking } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "paid")
      .eq("production_status", order.production_status)
      .select("id");
    if (result.error || !result.data?.length)
      return json({ error: "Order changed. Refresh before continuing." }, 409);
    await db
      .from("admin_audit_log")
      .insert({
        admin_user_id: user.id,
        action: `personal_cards_${body.status}`,
        target_type: "personal_card_order",
        target_id: order.id,
        details: {
          revision: order.artwork_revision,
          from: order.production_status,
          tracking,
        },
      });
    return json({ saved: true });
  } catch (error) {
    console.error(
      "[personal-card-admin]",
      error instanceof Error ? error.message : "failed",
    );
    return json({ error: "Couldn't complete that action. Please retry." }, 500);
  }
});
