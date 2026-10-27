import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Legacy attachment-based approval is retired. Orders are approved from the
// authenticated admin fulfillment workflow, using their stored artwork.
serve((req: Request): Response => new Response(req.method === "OPTIONS" ? null : JSON.stringify({
  error: "Use the card order dashboard to submit or approve artwork.",
}), {
  status: req.method === "OPTIONS" ? 200 : 410,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
}));
