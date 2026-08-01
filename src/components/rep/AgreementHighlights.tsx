import { FileText, DollarSign, Calendar, Gift, AlertTriangle, Scale } from "lucide-react";

export default function AgreementHighlights() {
  const highlights = [
    { icon: Scale, text: "You are a 1099 independent contractor, not an employee" },
    { icon: DollarSign, text: "$5 per demo hub, earned only once an admin approves it" },
    { icon: Gift, text: "10 approved demos in one calendar day = a $50 daily base, once per day" },
    { icon: DollarSign, text: "$75 annual bounty when a business you built converts to an annual plan" },
    { icon: Calendar, text: "Payouts are sent every Tuesday at 12 PM PT" },
    { icon: FileText, text: "You must provide valid ACH banking details + a W-9" },
    { icon: AlertTriangle, text: "TapAway may adjust rates, bonuses and caps at any time with notice" },
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
