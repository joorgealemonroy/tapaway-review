import { ScrollArea } from "@/components/ui/scroll-area";

export default function SalesPartnerAgreement() {
  return (
    <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/30">
      <div className="prose prose-sm max-w-none text-foreground">
        <h2 className="text-lg font-bold text-center mb-4">
          TapAway Sales Partner Agreement
        </h2>
        <p className="text-xs text-muted-foreground text-center mb-6">
          Version 1.0 — Effective Immediately
        </p>

        <p className="text-sm mb-4">
          This Sales Partner Agreement ("Agreement") is entered into between TapAway ("Company") and the individual 
          accepting this Agreement ("Sales Partner" or "Rep"). By electronically signing this Agreement, the Sales 
          Partner agrees to the following terms.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">1. Independent Contractor Status (1099)</h3>
        <p className="text-sm mb-2">
          Sales Partner is an independent contractor, not an employee of TapAway. Nothing in this Agreement shall 
          be construed as creating an employer-employee relationship.
        </p>
        <p className="text-sm mb-2">The Sales Partner is responsible for:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Their own taxes</li>
          <li>Their own expenses</li>
          <li>Their own business activities and methods</li>
        </ul>
        <p className="text-sm mb-4">TapAway will issue a Form 1099-NEC each applicable tax year.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">2. Compensation Structure</h3>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.1 Commission per Closed Restaurant</h4>
        <p className="text-sm mb-2">Sales Partners earn $50 per new restaurant signup, regardless of whether the restaurant chooses:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>A monthly plan, or</li>
          <li>A yearly plan</li>
        </ul>
        <p className="text-sm mb-4">Commissions appear in the Sales Partner dashboard after the customer's payment has successfully cleared.</p>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.2 Monthly Bonus</h4>
        <p className="text-sm mb-4">If the Sales Partner closes 30 new restaurants within a calendar month, they receive an additional $500 bonus.</p>
        
        <h4 className="text-sm font-medium mt-4 mb-1">2.3 Rate Changes</h4>
        <p className="text-sm mb-4">TapAway may update commission rates, bonuses, or incentives at any time with notice.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">3. Payouts</h3>
        <p className="text-sm mb-2">Payouts occur every Tuesday at 12:00 PM Pacific Time.</p>
        <p className="text-sm mb-2">Additional details:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>Reps must have valid ACH payout information on file</li>
          <li>Deposits may take 1–3 business days to arrive</li>
          <li>New commissions may roll into the next payout cycle if received after the cutoff</li>
        </ul>

        <h3 className="text-base font-semibold mt-6 mb-2">4. Responsibilities of the Sales Partner</h3>
        <p className="text-sm mb-2">The Sales Partner agrees to:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Accurately explain TapAway's features</li>
          <li>Represent TapAway professionally</li>
          <li>Follow all compliance rules and brand standards</li>
          <li>Avoid promising outcomes or guaranteed results</li>
          <li>Avoid collecting customer payment information</li>
          <li>Use official TapAway materials in sales conversations</li>
        </ul>
        <p className="text-sm mb-4">Sales Partners do not set pricing, manage billing, or negotiate custom deals.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">5. Prohibited Conduct</h3>
        <p className="text-sm mb-2">Sales Partner agrees not to:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Misrepresent TapAway's features</li>
          <li>Promise review outcomes or guaranteed results</li>
          <li>Offer discounts or deals not authorized by TapAway</li>
          <li>Claim or imply employment status</li>
          <li>Pressure customers</li>
          <li>Perform review gating or selective review solicitation</li>
          <li>Collect sensitive customer data</li>
        </ul>
        <p className="text-sm mb-4">Violations may lead to immediate termination.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">6. Confidentiality</h3>
        <p className="text-sm mb-4">
          All TapAway materials—including training, pricing, assets, processes, scripts, and internal documents—are 
          confidential and cannot be shared, copied, or distributed without authorization.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">7. Termination</h3>
        <p className="text-sm mb-2">TapAway may terminate this Agreement at any time, including but not limited to the following reasons:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Violation of this Agreement</li>
          <li>Misrepresentation of TapAway</li>
          <li>Compliance violations</li>
          <li>Unprofessional conduct</li>
          <li>Fraudulent or dishonest activity</li>
          <li>Refusal to follow required training or guidelines</li>
          <li>Failure to maintain confidentiality</li>
        </ul>

        <h4 className="text-sm font-medium mt-4 mb-1">7.1 Termination for Inefficiency or Low Performance</h4>
        <p className="text-sm mb-2">TapAway may also terminate this Agreement if the Sales Partner is not meeting minimum performance expectations, including but not limited to:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Repeated failure to close accounts</li>
          <li>Lack of demonstrated effort</li>
          <li>Extended inactivity</li>
          <li>Failure to follow sales processes designed to produce results</li>
        </ul>
        <p className="text-sm mb-2">
          TapAway is not obligated to maintain active contracts with Sales Partners who do not consistently demonstrate 
          reasonable effort, activity, or sales performance.
        </p>
        <p className="text-sm mb-4">
          Upon termination, Sales Partners will still receive commissions earned before the termination date, paid on 
          the next scheduled payout cycle.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">8. No Review Influence or Gating</h3>
        <p className="text-sm mb-2">TapAway is an organic, customer-initiated tool.</p>
        <p className="text-sm mb-2">Sales Partners may not encourage restaurants to:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Selectively give cards only to "happy customers"</li>
          <li>Hide cards from others</li>
          <li>Influence or filter review sentiment</li>
        </ul>
        <p className="text-sm mb-4">TapAway must be presented as a neutral tool that customers choose to use on their own.</p>

        <h3 className="text-base font-semibold mt-6 mb-2">9. Intellectual Property</h3>
        <p className="text-sm mb-4">
          All TapAway branding, logos, software, training, and sales materials remain the sole property of TapAway 
          and may only be used for authorized sales activities.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">10. Updates to This Agreement</h3>
        <p className="text-sm mb-4">
          TapAway may update this Agreement at any time. Sales Partners will be notified and may be required to 
          re-accept the updated terms.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">11. Digital Signature & Acceptance</h3>
        <p className="text-sm mb-2">By typing their full legal name and clicking Agree, the Sales Partner:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>Confirms they have read, understood, and accepted this Agreement</li>
          <li>Consents to electronic signature under the U.S. E-SIGN Act</li>
          <li>Certifies that all provided information is true and accurate</li>
        </ul>

        <p className="text-center text-sm font-semibold mt-8 mb-4">END OF AGREEMENT</p>
      </div>
    </ScrollArea>
  );
}
