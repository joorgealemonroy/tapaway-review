import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Mail, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EmailCapture {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  created_at: string;
}

interface Props {
  profileId: string;
}

const EmailLeadsTab = ({ profileId }: Props) => {
  const [leads, setLeads] = useState<EmailCapture[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("personal_email_captures")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Error loading leads:", err);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const exportCSV = useCallback(() => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = ["Email", "Name", "Message", "Date"];
    const rows = leads.map((lead) => [
      lead.email,
      lead.name || "",
      lead.message || "",
      format(new Date(lead.created_at), "yyyy-MM-dd HH:mm"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully!");
  }, [leads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">No leads yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Add an Email Capture block to your profile to start collecting visitor emails.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {leads.length} lead{leads.length !== 1 ? "s" : ""} collected
        </p>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <div className="space-y-2">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-4 bg-card rounded-xl border border-border"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{lead.email}</p>
                {lead.name && (
                  <p className="text-sm text-muted-foreground">{lead.name}</p>
                )}
                {lead.message && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {lead.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(lead.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(EmailLeadsTab);
