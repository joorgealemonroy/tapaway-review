import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileCheck, Download, Calendar, Pen } from "lucide-react";
import { format } from "date-fns";

interface AgreementData {
  agreement_accepted: boolean | null;
  agreement_accepted_at: string | null;
  agreement_version: string | null;
  signature_name: string | null;
  signature_at: string | null;
}

interface RepAgreementCardProps {
  userId: string;
}

export function RepAgreementCard({ userId }: RepAgreementCardProps) {
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgreement = async () => {
      const { data } = await supabase
        .from("sales_reps")
        .select("agreement_accepted, agreement_accepted_at, agreement_version, signature_name, signature_at")
        .eq("id", userId)
        .maybeSingle();

      setAgreement(data);
      setLoading(false);
    };

    fetchAgreement();
  }, [userId]);

  const handleDownload = () => {
    // Create a text version of the agreement for download
    const agreementText = `
TapAway Sales Partner Independent Contractor Agreement
Version 1.0 — Effective Immediately

[Full agreement text would be included here]

---
Accepted by: ${agreement?.signature_name || "N/A"}
Date: ${agreement?.signature_at ? format(new Date(agreement.signature_at), "MMMM d, yyyy 'at' h:mm a") : "N/A"}
Agreement Version: ${agreement?.agreement_version || "1.0"}
    `.trim();

    const blob = new Blob([agreementText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TapAway_Sales_Partner_Agreement.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-6">
          <div className="animate-pulse h-20 bg-slate-100 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Sales Partner Agreement</CardTitle>
            <CardDescription className="text-xs">Your contractor agreement status</CardDescription>
          </div>
          {agreement?.agreement_accepted && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              Accepted
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {agreement?.agreement_accepted ? (
          <>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Accepted on{" "}
                  {agreement.agreement_accepted_at
                    ? format(new Date(agreement.agreement_accepted_at), "MMMM d, yyyy 'at' h:mm a")
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Pen className="h-4 w-4" />
                <span className="font-serif italic">
                  Signed by: {agreement.signature_name || "N/A"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Agreement Version: {agreement.agreement_version || "1.0"}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Agreement (TXT)
            </Button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No agreement on file. Please contact support if you believe this is an error.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
