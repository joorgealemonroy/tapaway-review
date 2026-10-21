import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
export default function PersonalCardLink() {
  const { cardId } = useParams();
  const [slug, setSlug] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    // The RPC exposes only a paid hub's public username, never order or customer details.
    const resolve = async () => {
      if (!/^[a-f0-9-]{36}$/i.test(cardId || "")) {
        setLoading(false);
        return;
      }
      const { data } = await (
        supabase.rpc as unknown as (
          name: string,
          args: Record<string, string>,
        ) => Promise<{ data: string | null }>
      )("personal_card_hub_destination", { _order_id: cardId! });
      if (active) {
        setSlug(typeof data === "string" ? data : null);
        setLoading(false);
      }
    };
    void resolve().catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [cardId]);
  if (slug) return <Navigate replace to={`/${encodeURIComponent(slug)}`} />;
  return (
    <main className="storefront min-h-screen grid place-items-center p-8">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-semibold">
          {loading
            ? "Opening your connection…"
            : "This hub isn't available right now."}
        </h1>
        {!loading && (
          <>
            <p className="my-5">
              Please check with the person who shared this card, or try again
              later.
            </p>
            <Link to="/support" className="sf-text-link">
              TapAway support
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
