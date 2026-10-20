import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cors, json } from "../_shared/paymentFirst.ts";
import {
  personalCardsAllowed,
  personalPrice,
} from "../_shared/personalCards.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const offer = { designerVersion: 2, amount: 3900, hubAmount: 500, currency: "usd" };
  try {
    if (!(await personalCardsAllowed(req)))
      return json({ ...offer, available: false, hubAvailable: false });
    const [cards, hub] = await Promise.allSettled([
      personalPrice("cards"),
      personalPrice("hub"),
    ]);
    return json({
      ...offer,
      available: cards.status === "fulfilled",
      hubAvailable: hub.status === "fulfilled",
    });
  } catch {
    return json({ ...offer, available: false, hubAvailable: false }, 503);
  }
});
