import { ScrollArea } from "@/components/ui/scroll-area";

export default function SalesPartnerAgreement() {
  return (
    <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/30">
      <div className="prose prose-sm max-w-none text-foreground">
        <h2 className="text-lg font-bold text-center mb-4">
          TapAway Sales Partner Independent Contractor Agreement
        </h2>
        <p className="text-xs text-muted-foreground text-center mb-6">
          Version 1.0 — Effective Immediately
        </p>

        <p className="text-sm mb-4">
          This Sales Partner Independent Contractor Agreement ("Agreement") is entered into by and between:
        </p>
        <p className="text-sm mb-4">
          <strong>TapAway</strong> ("Company")<br />
          and<br />
          <strong>You</strong>, the approved TapAway Sales Partner ("Contractor").
        </p>
        <p className="text-sm mb-6">
          By creating your TapAway Sales Partner password and clicking "I Agree," you acknowledge and agree to the following terms:
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">1. Independent Contractor Relationship</h3>
        <p className="text-sm mb-2">You are an independent contractor, not an employee. This means:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>You are not eligible for benefits, insurance, or hourly wages.</li>
          <li>You are responsible for your own taxes, filings, and financial reporting.</li>
          <li>TapAway does not control your work hours, schedule, or sales methods.</li>
          <li>TapAway may require compliance with brand rules, training, and ethical standards, but this does not change your contractor status.</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">2. Commission Structure</h3>
        <p className="text-sm mb-2">Contractor is compensated solely through commissions:</p>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.1 Standard Commission</h4>
        <p className="text-sm mb-2">You earn $50 per closed sale, whether the restaurant chooses monthly or yearly billing.</p>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.2 Earned Commission Definition</h4>
        <p className="text-sm mb-2">A commission is considered earned when:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>The restaurant's payment has been successfully processed and cleared</li>
          <li>The customer is an active paying TapAway restaurant</li>
          <li>Fraud screening or payment reversal has not occurred</li>
        </ul>
        <p className="text-sm mb-2">If a customer disputes or reverses payment, the commission is void.</p>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.3 Monthly Bonus</h4>
        <p className="text-sm mb-2">If Contractor completes 30 approved closes within a calendar month, Contractor receives a $500 bonus payout, paid on the next scheduled payout day.</p>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.4 Commission Adjustments</h4>
        <p className="text-sm mb-4">TapAway may update commission amounts, bonus structures, or payout rules at any time with notice provided to Contractors via the Sales Partner Portal.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">3. Payout Schedule</h3>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>Payouts are sent weekly on Tuesdays at 12 PM Pacific Time</li>
          <li>Funds may take 1–3 business days to arrive, depending on bank processing</li>
          <li>Contractor must have correct ACH bank information on file</li>
          <li>Payouts will not be issued until Contractor has submitted a valid W-9 and TapAway has approved the tax profile</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">4. Confidentiality & Brand Protection</h3>
        <p className="text-sm mb-2">Contractor agrees not to disclose or misuse:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Internal tools</li>
          <li>Commission structure</li>
          <li>Training materials</li>
          <li>Customer lists</li>
          <li>Private restaurant data</li>
          <li>TapAway intellectual property or proprietary systems</li>
        </ul>
        <p className="text-sm mb-4">Contractor may not represent themselves as an employee or officer of TapAway.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">5. Ethical Sales Rules</h3>
        <p className="text-sm mb-2">Contractor agrees to:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Represent TapAway truthfully</li>
          <li>Not make promises about results or guarantees</li>
          <li>Not engage in review gating, filtering, or selectively discouraging certain customer types</li>
          <li>Follow TapAway's "ethical, compliant restaurant onboarding" process</li>
          <li>Use approved sales scripts and materials only</li>
        </ul>
        <p className="text-sm mb-4">Violation may result in termination.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">6. Use of Provided Materials</h3>
        <p className="text-sm mb-2">Sales materials, scripts, graphics, and product descriptions:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>Are owned exclusively by TapAway</li>
          <li>May not be reused outside of TapAway sales activities</li>
          <li>Must not be modified without permission</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">7. Termination</h3>
        <p className="text-sm mb-2">TapAway may terminate Contractor immediately for:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Fraudulent activity</li>
          <li>Misuse of branding or materials</li>
          <li>Misleading customers</li>
          <li>Harassment or inappropriate conduct</li>
          <li>Attempting to circumvent TapAway's order, billing, or payout systems</li>
          <li>Violating any federal, state, or local law related to sales practices</li>
        </ul>
        <p className="text-sm mb-4">Contractor may terminate the relationship at any time by stopping participation.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">8. Taxes</h3>
        <p className="text-sm mb-2">Contractor acknowledges:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>They are a 1099 independent contractor</li>
          <li>TapAway will issue a Form 1099-NEC for annual earnings if required</li>
          <li>Contractor is solely responsible for reporting income to the IRS</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">9. Liability</h3>
        <p className="text-sm mb-2">TapAway is not responsible for:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Contractor-generated misrepresentations</li>
          <li>Contractor expenses</li>
          <li>Any personal or business losses incurred by Contractor</li>
          <li>Injuries or issues arising while performing sales activities</li>
        </ul>
        <p className="text-sm mb-4">Contractor agrees to indemnify TapAway against claims resulting from misconduct.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">10. Agreement Acceptance</h3>
        <p className="text-sm mb-2">By creating a Sales Partner password, Contractor confirms:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>They have read and agreed to this Agreement</li>
          <li>They understand commissions are not guaranteed</li>
          <li>They understand their status as a 1099 independent contractor</li>
          <li>They agree to TapAway's payout rules and sales policies</li>
        </ul>

        <p className="text-center text-sm font-semibold mt-8 mb-4">END OF AGREEMENT</p>
      </div>
    </ScrollArea>
  );
}
