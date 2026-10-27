export {};
// Legacy import was removed from onboarding. Setup now follows verified checkout.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve((req: Request) => req.method === "OPTIONS"
  ? new Response(null, { headers: cors })
  : new Response(JSON.stringify({ error: "This setup path is retired. Continue through the current onboarding flow." }), {
      status: 410, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    }));
