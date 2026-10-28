export {};
// Retired production test utility. Test fixtures belong in isolated environments.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve((req: Request) => req.method === "OPTIONS"
  ? new Response(null, { headers: cors })
  : new Response(JSON.stringify({ error: "This test utility is no longer available." }), {
      status: 410, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
    }));
