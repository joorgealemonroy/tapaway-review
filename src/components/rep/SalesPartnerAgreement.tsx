import { ScrollArea } from "@/components/ui/scroll-area";

export default function SalesPartnerAgreement() {
  return (
    <ScrollArea className="h-[400px] rounded-md border p-4 bg-muted/30">
      <div className="prose prose-sm max-w-none text-foreground">
        <h2 className="text-lg font-bold text-center mb-4">
          TapAway Sales Partner Agreement
        </h2>
        <p className="text-xs text-muted-foreground text-center mb-6">
          Version 3.0 — Effective Immediately (supersedes v2.0)
        </p>


        <p className="text-sm mb-4">
          This Sales Partner Agreement ("Agreement") is entered into between TapAway ("Company") and the individual
          accepting this Agreement ("Sales Partner"). By electronically signing this Agreement, the Sales Partner
          agrees to the following terms.
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

        <h3 className="text-base font-semibold mt-6 mb-2">2. Compensation</h3>
        <p className="text-sm mb-4">
          <strong>$5 per demo hub.</strong> Sales Partners earn $5.00 for each demo hub they build that is reviewed
          and approved by a TapAway administrator. Approval is the sole trigger for earning. Hubs that are rejected,
          duplicated, incomplete, fraudulent, or built for a business that did not consent earn nothing.
        </p>
        <p className="text-sm mb-4">
          That is the entire compensation under this Agreement. There is no daily base, no closing commission, no
          annual or one-time bounty, no bonus, no tier, and no recurring, residual, percentage-based, or lifetime
          pay of any kind. TapAway may update the $5 rate at any time with notice; changes apply prospectively to
          hubs approved after the change takes effect.
        </p>

        <h4 className="text-sm font-medium mt-4 mb-1">2.1 Corrections & Clawbacks</h4>
        <p className="text-sm mb-4">
          TapAway may void or claw back any amount that was awarded in error, or that is tied to a hub later found
          to be fraudulent, duplicated, unauthorized by the business, or created in violation of this Agreement.
          Amounts appear in the Sales Partner dashboard with a status (Pending, Available, Paid, Voided, Clawed Back).
          Only amounts marked <em>Available</em> or <em>Paid</em> represent earned compensation.
        </p>

        <h3 className="text-base font-semibold mt-6 mb-2">3. Payouts</h3>
        <p className="text-sm mb-2">Payouts occur every Tuesday at 12:00 PM Pacific Time.</p>
        <p className="text-sm mb-2">Additional details:</p>
        <ul className="text-sm list-disc pl-5 mb-4 space-y-1">
          <li>Reps must have valid ACH payout information and a completed W-9 on file</li>
          <li>Deposits may take 1–3 business days to arrive</li>
          <li>Earnings received after the cutoff roll into the next payout cycle</li>
          <li>TapAway does not withhold taxes; the Sales Partner is solely responsible for them</li>
        </ul>


        <h3 className="text-base font-semibold mt-6 mb-2">4. Responsibilities of the Sales Partner</h3>
        <p className="text-sm mb-2">The Sales Partner agrees to:</p>
        <ul className="text-sm list-disc pl-5 mb-2 space-y-1">
          <li>Build demo hubs only for businesses that have consented</li>
          <li>Accurately represent TapAway's features</li>
          <li>Represent TapAway professionally</li>
          <li>Follow all compliance rules and brand standards</li>
          <li>Avoid promising outcomes or guaranteed results</li>
          <li>Avoid collecting customer payment information</li>
          <li>Use official TapAway materials in conversations with businesses</li>
        </ul>

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

        <h4 className="text-sm font-medium mt-4 mb-1">7.1 Termination for Low Output or Quality</h4>
        <p className="text-sm mb-2">
          TapAway may also terminate this Agreement if the Sales Partner's demo output is consistently low in
          quality or volume, or does not meet TapAway's standards.
        </p>
        <p className="text-sm mb-4">
          Upon termination, Sales Partners will still receive earnings accrued before the termination date, paid on
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
