import { PDFDocument, PDFName } from "https://esm.sh/pdf-lib@1.17.1";
import {
  admin,
  cors,
  getStripe,
  json,
  stripeMode,
} from "./paymentFirst.ts";
import {
  activatePersonalOrder,
  personalCardsAllowed,
  personalPrice,
  personalReturnOrigin,
  PERSONAL_BUCKET,
  PERSONAL_VERSION,
  publicLink,
} from "./personalCards.ts";
import { hashValue, takeQuota } from "./storefrontRateLimit.ts";
import { readLimitedText } from "./requestBody.ts";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const plain = (x: unknown, max: number) =>
  typeof x === "string" && x.length <= max ? x.trim() : "";
export async function handlePersonalCardOrder(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let claimedId: string | null = null,
    claimedRevision: string | null = null;
  const db = admin();
  try {
    // Reject excessive requests before reading a potentially large artwork body.
    // Status checks and checkout attempts retain their separate, tighter limits.
    if ((await takeQuota(req, "personal-request", 150)) < 0)
      return json({ error: "Please try again later." }, 429);
    let body;
    try {
      body = JSON.parse(await readLimitedText(req, 19000000));
      if (!body || typeof body !== "object" || Array.isArray(body))
        return json({ error: "Invalid order request." }, 400);
    } catch (error) {
      return error instanceof Error && error.message === "Request too large"
        ? json({ error: "Artwork is too large. Try fewer image files." }, 413)
        : json({ error: "Invalid order request." }, 400);
    }
    const stripe = getStripe();
    if (body.action === "status") {
      if (!/^cs_(test_|live_)?[A-Za-z0-9]{10,220}$/.test(body.sessionId || ""))
        return json({ error: "Invalid order link." }, 400);
      if ((await takeQuota(req, "personal-status", 100)) < 0)
        return json({ error: "Please try again later." }, 429);
      const session = await stripe.checkout.sessions.retrieve(body.sessionId);
      if (
        session.metadata?.commerce_version !== PERSONAL_VERSION ||
        session.livemode !== (stripeMode() === "live")
      )
        return json({ error: "Order not found." }, 404);
      if (session.status === "complete" && session.payment_status === "paid")
        await activatePersonalOrder(stripe, session);
      const { data } = await db
        .from("personal_card_orders")
        .select("id, status, production_status, hub_requested, activated_at")
        .eq("id", session.metadata.personal_order_id)
        .single();
      return json({
        orderId: data?.id,
        paid: !!data?.activated_at && data?.status === "paid",
        status: data?.status,
        productionStatus: data?.production_status,
        hosted: data?.hub_requested,
        checkoutStatus: session.status,
      });
    }
    if (body.action !== "create" || !(await personalCardsAllowed(req)))
      return json(
        {
          error:
            "Checkout is temporarily unavailable. Please try again shortly.",
        },
        503,
      );
    if ((await takeQuota(req, "personal-checkout", 15)) < 0)
      return json(
        { error: "Please contact tap@tapaway.co for help with your order." },
        429,
      );
    const draft = body.draft;
    if (
      !draft ||
      draft.version !== 1 ||
      !UUID.test(draft.id) ||
      !/^[a-f0-9-]{72}$/i.test(draft.checkoutToken || "") ||
      typeof draft.hosted !== "boolean" ||
      !Array.isArray(draft.cards) ||
      draft.cards.length !== 2 ||
      typeof body.pdf !== "string" ||
      body.pdf.length > 14000000
    )
      return json({ error: "Please reopen the designer and try again." }, 400);
    const hubName = plain(draft.hubName, 100),
      hubLinksRaw = plain(draft.hubLinks, 2000)
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
    if (
      draft.hosted &&
      (hubLinksRaw.length > 20 || hubLinksRaw.some((x) => !publicLink(x)))
    )
      return json({ error: "Check your hub name and links." }, 400);
    const destinations = draft.cards.map((c: { destination: unknown }) =>
      draft.hosted
        ? `https://tapaway.co/connect/${draft.id}`
        : publicLink(c.destination),
    );
    if (destinations.some((x: string) => !x))
      return json({ error: "Add a valid destination for each card." }, 400);
    // Validate the editable source as well as the final print file. Prices and quantities never come from it.
    for (const card of draft.cards) {
      if (
        card.orientation &&
        !["landscape", "portrait"].includes(card.orientation)
      )
        return json({ error: "Choose portrait or landscape." }, 400);
      const width = card.orientation === "portrait" ? 53.98 : 85.6,
        height = card.orientation === "portrait" ? 85.6 : 53.98;
      if (
        !card.qr ||
        ![card.qr.x, card.qr.y, card.qr.size].every(Number.isFinite) ||
        card.qr.size < 22 ||
        card.qr.x < 3 ||
        card.qr.y < 3 ||
        card.qr.x + card.qr.size > width - 3 ||
        card.qr.y + card.qr.size > height - 3
      )
        return json({ error: "Keep the QR code inside the safe area." }, 400);
      for (const side of ["front", "back"]) {
        const face = card?.[side];
        if (
          !face ||
          !/^#[0-9a-f]{6}$/i.test(face.background) ||
          !Array.isArray(face.layers) ||
          face.layers.length > 24
        )
          return json({ error: "Invalid card design." }, 400);
        for (const layer of face.layers) {
          if (
            !layer ||
            !["text", "image"].includes(layer.kind) ||
            !Number.isFinite(layer.x) ||
            !Number.isFinite(layer.y) ||
            Math.abs(layer.x) > 200 ||
            Math.abs(layer.y) > 200
          )
            return json({ error: "Invalid design element." }, 400);
          if (
            layer.kind === "image" &&
            (typeof layer.src !== "string" ||
              !layer.src.startsWith("data:image/png;base64,") ||
              layer.src.length > 9000000 ||
              !Number.isFinite(layer.width) ||
              !Number.isFinite(layer.height) ||
              layer.width <= 0 ||
              layer.height <= 0 ||
              layer.width > 300 ||
              layer.height > 300)
          )
            return json({ error: "Invalid image." }, 400);
          if (
            layer.kind === "text" &&
            (typeof layer.text !== "string" ||
              layer.text.length > 280 ||
              !Number.isFinite(layer.size) ||
              layer.size < 1 ||
              layer.size > 30 ||
              !["sans", "serif", "mono"].includes(layer.font) ||
              !/^#[0-9a-f]{6}$/i.test(layer.color))
          )
            return json({ error: "Invalid text." }, 400);
        }
      }
    }
    const source = { ...draft, checkoutToken: undefined };
    const manifest = JSON.stringify({
      ...source,
      destinations,
      print: {
        pageSizesMm: draft.cards.flatMap((c: { orientation?: string }) =>
          Array.from({ length: 2 }, () =>
            c.orientation === "portrait"
              ? { width: 53.98, height: 85.6 }
              : { width: 85.6, height: 53.98 },
          ),
        ),
        dpiTarget: 300,
        ribbon: "YMCKO R5F208A100",
        pageOrder: [
          "Card 1 front",
          "Card 1 back",
          "Card 2 front",
          "Card 2 back",
        ],
      },
    });
    const artworkHash = await hashValue(JSON.stringify(source)),
      tokenHash = await hashValue(draft.checkoutToken);
    const { data: existing, error: lookupError } = await db
      .from("personal_card_orders")
      .select("*")
      .eq("id", draft.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (
      existing &&
      (existing.checkout_token_hash !== tokenHash ||
        existing.stripe_livemode !== (stripeMode() === "live"))
    )
      return json({ error: "Please start a new design for this order." }, 409);
    if (existing?.paid_at)
      return json(
        {
          error:
            "This design has already been purchased. Contact our team for changes to that order.",
        },
        409,
      );
    if (
      existing?.status === "preparing" &&
      Date.now() - Date.parse(existing.updated_at) < 90000
    )
      return json(
        {
          error:
            "Your checkout is being prepared. Please try again in a moment.",
        },
        409,
      );
    let revision =
      existing?.artwork_hash === artworkHash && existing?.status === "preparing"
        ? existing.artwork_revision
        : crypto.randomUUID();
    if (existing?.stripe_checkout_session_id) {
      const previous = await stripe.checkout.sessions.retrieve(
        existing.stripe_checkout_session_id,
      );
      if (previous.status === "complete") {
        await activatePersonalOrder(stripe, previous);
        return json(
          {
            error:
              "This design has already been purchased. Check your confirmation email.",
          },
          409,
        );
      }
      if (
        previous.status === "open" &&
        existing.artwork_hash === artworkHash &&
        previous.url
      )
        return json({ url: previous.url });
      if (previous.status === "open")
        await stripe.checkout.sessions.expire(previous.id); // Must succeed before replacing artwork.
      revision = crypto.randomUUID();
    }
    const [cardsPrice, hubPrice] = await Promise.all([
      personalPrice("cards"),
      draft.hosted ? personalPrice("hub") : Promise.resolve(null),
    ]);
    const incoming = Uint8Array.from(atob(body.pdf), (c) => c.charCodeAt(0));
    if (new TextDecoder().decode(incoming.slice(0, 5)) !== "%PDF-")
      return json({ error: "Please export your design again." }, 400);
    const loaded = await PDFDocument.load(incoming, {
      ignoreEncryption: false,
    });
    if (loaded.getPageCount() !== 4)
      return json(
        { error: "Your print file must include both sides of both cards." },
        400,
      );
    for (const [index, p] of loaded.getPages().entries()) {
      const portrait =
        draft.cards[Math.floor(index / 2)].orientation === "portrait";
      if (
        Math.abs(p.getWidth() - ((portrait ? 53.98 : 85.6) * 72) / 25.4) >
          0.1 ||
        Math.abs(p.getHeight() - ((portrait ? 85.6 : 53.98) * 72) / 25.4) >
          0.1 ||
        p.getRotation().angle !== 0
      )
        return json(
          { error: "Incorrect print size. Export again from the designer." },
          400,
        );
      p.node.delete(PDFName.of("Annots"));
      p.node.delete(PDFName.of("AA"));
    }
    // Copy static pages into a new document; discard forms, embedded files, and document actions.
    const sanitized = await PDFDocument.create();
    for (const page of await sanitized.copyPages(loaded, [0, 1, 2, 3]))
      sanitized.addPage(page);
    sanitized.setTitle("TapAway CR80 production artwork");
    const pdf = await sanitized.save();
    const now = new Date().toISOString();
    const row = {
      id: draft.id,
      checkout_token_hash: tokenHash,
      artwork_hash: artworkHash,
      artwork_revision: revision,
      status: "preparing",
      hub_requested: draft.hosted,
      hub_name: hubName || null,
      hub_links: hubLinksRaw.map(publicLink),
      destinations,
      stripe_livemode: stripeMode() === "live",
      updated_at: now,
      stripe_checkout_session_id: null,
    };
    const result = existing
      ? await db
          .from("personal_card_orders")
          .update(row)
          .eq("id", draft.id)
          .eq("updated_at", existing.updated_at)
          .is("paid_at", null)
          .select("id")
      : await db.from("personal_card_orders").insert(row).select("id");
    if (result.error || !result.data?.length)
      return json(
        { error: "This order changed in another tab. Please try again." },
        409,
      );
    claimedId = draft.id;
    claimedRevision = revision;
    const folder = `${stripeMode()}/${draft.id}/${revision}`;
    for (const [path, contents, type] of [
      [`${folder}/print.pdf`, pdf, "application/pdf"],
      [`${folder}/design.json`, manifest, "application/json"],
    ] as const) {
      const { error } = await db.storage
        .from(PERSONAL_BUCKET)
        .upload(path, contents, { contentType: type, upsert: true });
      if (error) throw error;
    }
    const { error: pathsError } = await db
      .from("personal_card_orders")
      .update({
        artwork_path: `${folder}/print.pdf`,
        manifest_path: `${folder}/design.json`,
      })
      .eq("id", draft.id)
      .eq("artwork_revision", revision);
    if (pathsError) throw pathsError;
    const origin = personalReturnOrigin(body.returnOrigin);
    const metadata = {
      commerce_version: PERSONAL_VERSION,
      personal_order_id: draft.id,
      artwork_revision: revision,
      hub_requested: String(draft.hosted),
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: hubPrice ? "subscription" : "payment",
        ...(hubPrice
          ? {
              subscription_data: {
                metadata,
                description: "TapAway personal hub — $5/month",
              },
            }
          : { customer_creation: "always", payment_intent_data: { metadata } }),
        line_items: [
          { price: cardsPrice.id, quantity: 1 },
          ...(hubPrice ? [{ price: hubPrice.id, quantity: 1 }] : []),
        ],
        metadata,
        client_reference_id: draft.id,
        allow_promotion_codes: false,
        shipping_address_collection: { allowed_countries: ["US"] },
        billing_address_collection: "auto",
        success_url: `${origin}/personal/order?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/personal/design?canceled=1`,
        custom_text: {
          submit: {
            message: hubPrice
              ? "Two custom cards: $39 once, with free US shipping. Optional personal hub: $5 today and $5/month until canceled. Total today: $44. No free trial."
              : "Two custom NFC + QR cards: $39 once, with free standard US shipping. No subscription.",
          },
        },
      },
      { idempotencyKey: `personal-${stripeMode()}-${draft.id}-${revision}` },
    );
    const { error: sessionError } = await db
      .from("personal_card_orders")
      .update({
        stripe_checkout_session_id: session.id,
        status: "checkout_started",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id)
      .eq("artwork_revision", revision);
    if (sessionError) throw sessionError;
    return json({ url: session.url });
  } catch (error) {
    if (claimedId)
      await db
        .from("personal_card_orders")
        .update({ updated_at: new Date(Date.now() - 120000).toISOString() })
        .eq("id", claimedId)
        .eq("artwork_revision", claimedRevision)
        .eq("status", "preparing");
    console.error(
      "[personal-card-order]",
      error instanceof Error ? error.message : "failed",
    );
    return json(
      {
        error:
          "We couldn't finish preparing your order. Your design is saved; please try again or contact tap@tapaway.co.",
      },
      503,
    );
  }
}
