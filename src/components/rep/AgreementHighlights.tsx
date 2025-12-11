import { FileText, DollarSign, Calendar, Building2, AlertTriangle, Scale } from "lucide-react";

export default function AgreementHighlights() {
  const highlights = [
    { icon: Scale, text: "You are a 1099 independent contractor, not an employee" },
    { icon: DollarSign, text: "You earn $50 per closed sale after customer payment clears" },
    { icon: Building2, text: "30 closes in a month = $500 bonus" },
    { icon: Calendar, text: "Payouts are sent every Tuesday at 12 PM PST" },
    { icon: FileText, text: "You must provide valid ACH banking + W9" },
    { icon: AlertTriangle, text: "TapAway may adjust commission rates in the future" },
  ];

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <p className="text-sm font-medium text-foreground mb-3">Key Highlights:</p>
      <ul className="space-y-2">
        {highlights.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
            <item.icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
