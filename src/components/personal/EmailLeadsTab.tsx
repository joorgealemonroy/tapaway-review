import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Mail, Loader2, Inbox, MessageSquareText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import LeadFormBuilder from "@/components/personal/LeadFormBuilder";

interface EmailCapture {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  message: string | null;
  created_at: string;
}

interface LeadSubmission {
  id: string;
  form_id: string;
  submission_data: Record<string, string>;
  created_at: string;
}

interface Props {
  profileId: string;
}

const EmailLeadsTab = ({ profileId }: Props) => {
  const [leads, setLeads] = useState<EmailCapture[]>([]);
  const [submissions, setSubmissions] = useState<LeadSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [emailRes, submRes] = await Promise.all([
        supabase
          .from("personal_email_captures")
          .select("*")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false }),
        supabase
          .from("lead_submissions")
          .select("*")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false }),
      ]);

      if (emailRes.error) throw emailRes.error;
      if (submRes.error) throw submRes.error;

      setLeads(emailRes.data || []);
      setSubmissions((submRes.data || []) as unknown as LeadSubmission[]);
    } catch (err) {
      console.error("Error loading leads:", err);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportSubmissionsCSV = useCallback(() => {
    if (submissions.length === 0) {
      toast.error("No form submissions to export");
      return;
    }

    // Collect all unique keys from submission_data
    const allKeys = new Set<string>();
    submissions.forEach((s) =>
      Object.keys(s.submission_data).forEach((k) => allKeys.add(k))
    );
    const keys = Array.from(allKeys);
    const headers = ["Date", ...keys];
    const rows = submissions.map((s) => [
      format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
      ...keys.map((k) => s.submission_data[k] || ""),
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
    link.download = `lead-submissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully!");
  }, [submissions]);

  const exportEmailsCSV = useCallback(() => {
    if (leads.length === 0) {
      toast.error("No email leads to export");
      return;
    }

    const headers = ["Email", "Phone", "Name", "Message", "Date"];
    const rows = leads.map((lead) => [
      lead.email || "",
      lead.phone || "",
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
    link.download = `email-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
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

  return (
    <div className="space-y-6">
      {/* Form Builder */}
      <LeadFormBuilder profileId={profileId} />

      {/* Form Submissions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Form Submissions</h3>
            {submissions.length > 0 && (
              <span className="text-xs text-muted-foreground">({submissions.length})</span>
            )}
          </div>
          {submissions.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportSubmissionsCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-border bg-card">
            <MessageSquareText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No form submissions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.map((sub) => {
              const isExpanded = expandedSubmission === sub.id;
              const entries = Object.entries(sub.submission_data);
              const preview = entries.slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ");

              return (
                <div
                  key={sub.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSubmission(isExpanded ? null : sub.id)}
                    className="w-full p-4 flex items-start gap-3 text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{preview}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(sub.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                      {entries.map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs font-medium text-muted-foreground">{key}</p>
                          <p className="text-sm text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Captures Section (existing) */}
      {leads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Email Captures</h3>
              <span className="text-xs text-muted-foreground">({leads.length})</span>
            </div>
            <Button variant="outline" size="sm" onClick={exportEmailsCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
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
                    <p className="font-medium text-foreground truncate">
                      {lead.email || lead.phone}
                    </p>
                    {lead.email && lead.phone && (
                      <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    )}
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
      )}

      {leads.length === 0 && submissions.length === 0 && (
        <div className="text-center py-8">
          <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">No leads yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Enable the Lead Capture Form above or add an Email Capture block to your profile.
          </p>
        </div>
      )}
    </div>
  );
};

export default memo(EmailLeadsTab);
