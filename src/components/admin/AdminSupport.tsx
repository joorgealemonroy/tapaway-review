import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export default function AdminSupport() {
  const requests = useQuery({
    queryKey: ["admin-support"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_requests")
        .select("id,name,email,description,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <div className="aw-page-heading">
        <p className="aw-eyebrow">BE THERE FOR YOUR CUSTOMERS</p>
        <h1>Customer support</h1>
        <p>Recent questions and requests. Open a reply in your email app.</p>
      </div>
      {requests.isError ? (
        <div className="aw-inline-error">
          Requests couldn’t load.{" "}
          <button onClick={() => requests.refetch()}>Retry</button>
        </div>
      ) : requests.isPending ? (
        <p>Loading requests…</p>
      ) : !requests.data?.length ? (
        <div className="aw-empty">No support requests yet.</div>
      ) : (
        requests.data.map((r) => (
          <article className="aw-panel aw-support-request" key={r.id}>
            <div className="aw-section-heading">
              <h2>{r.name || "Customer"}</h2>
              <span className="aw-badge">{r.status}</span>
            </div>
            <p>{r.description}</p>
            <a
              className="aw-small-button"
              href={`mailto:${encodeURIComponent(r.email)}?subject=${encodeURIComponent("Your TapAway support request")}`}
            >
              Reply to {r.email}
            </a>
            <small>{new Date(r.created_at).toLocaleDateString()}</small>
          </article>
        ))
      )}
    </>
  );
}
