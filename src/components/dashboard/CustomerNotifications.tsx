import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { workspaceRpc } from "@/lib/admin/workspace";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
type Notice = {
  id: string;
  title: string;
  body: string;
  cta_path: string | null;
  cta_label: string | null;
  read_at: string | null;
  created_at: string;
};
export default function CustomerNotifications() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const active = pathname === "/dashboard" && !search.includes("admin_view");
  return active && user ? <Inbox userId={user.id} /> : null;
}
function Inbox({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const inbox = useQuery({
    queryKey: ["customer-notifications", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_notifications")
        .select("id,title,body,cta_path,cta_label,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notice[];
    },
    staleTime: 60_000,
    retry: 1,
  });
  const unread = inbox.data?.filter((n) => !n.read_at).length || 0;
  return (
    <>
      <button
        className="customer-inbox-trigger"
        aria-label={`Updates${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen(true)}
      >
        <Bell size={18} />
        <span>Updates{unread ? ` (${unread})` : ""}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="customer-inbox">
          <DialogHeader>
            <DialogTitle>Your TapAway updates</DialogTitle>
            <DialogDescription>
              Product news and offers, all in one place.
            </DialogDescription>
          </DialogHeader>
          {inbox.isError ? (
            <p>
              We couldn’t load updates.{" "}
              <button onClick={() => inbox.refetch()}>Try again</button>
            </p>
          ) : inbox.isPending ? (
            <p>Loading updates…</p>
          ) : !inbox.data?.length ? (
            <p>You’re all caught up. New updates will appear here.</p>
          ) : (
            inbox.data.map((n) => (
              <article key={n.id}>
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                {n.cta_path && (
                  <Link to={n.cta_path} onClick={() => setOpen(false)}>
                    {n.cta_label}
                  </Link>
                )}
                {!n.read_at && (
                  <button
                    onClick={async () => {
                      try {
                        await workspaceRpc("customer_read_notification", {
                          _id: n.id,
                        });
                        setError("");
                        void inbox.refetch();
                      } catch {
                        setError("Couldn’t mark that as read. Please retry.");
                      }
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </article>
            ))
          )}
          {error && <p role="status">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
