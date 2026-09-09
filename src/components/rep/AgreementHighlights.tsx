import { FileText, DollarSign, Calendar, AlertTriangle, Scale } from "lucide-react";

export default function AgreementHighlights() {
  const highlights = [
    { icon: Scale, text: "You are a 1099 independent contractor, not an employee" },
    { icon: DollarSign, text: "$5 per demo hub you build, once an admin approves it — that's your full pay" },
    { icon: DollarSign, text: "No commissions, no closing pay, no tiers, no recurring payments of any kind" },
    { icon: Calendar, text: "Payouts are sent every Tuesday at 12 PM PT, with a W-9 and bank details on file" },
    { icon: FileText, text: "You must provide valid ACH banking details + a W-9" },
    { icon: AlertTriangle, text: "TapAway may change the $5 rate at any time with notice" },
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
