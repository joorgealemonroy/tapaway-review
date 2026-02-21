import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const AffiliateTerms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TapAway</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Affiliate & Referral Terms</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Overview</h2>
            <p className="text-muted-foreground">
              The TapAway Affiliate & Referral Program ("Program") allows eligible participants ("Affiliates") to earn
              commissions by referring new users to TapAway. These terms govern your participation in the Program and
              are incorporated into the TapAway Terms of Service. By participating, you agree to be bound by these
              Affiliate & Referral Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="text-muted-foreground mb-4">To participate in the Program, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Have an active TapAway account in good standing</li>
              <li>Be approved for the Program by TapAway (approval is at our sole discretion)</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not be located in a jurisdiction where participation would be prohibited</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              TapAway reserves the right to deny or revoke participation at any time, for any reason, without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Referral Process</h2>
            <p className="text-muted-foreground mb-4">
              Upon approval, you will receive a unique referral code and link. Commissions are earned when:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>A new user signs up for TapAway using your unique referral link or code</li>
              <li>The referred user completes a qualifying action (such as account creation or subscription purchase) as determined by TapAway</li>
              <li>The referral is verified as legitimate and not flagged for abuse</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Commission amounts, qualifying actions, and payout thresholds are set by TapAway and may be modified
              at any time with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Commission Structure & Payouts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Commission rates are determined by TapAway and communicated to you in the affiliate dashboard</li>
              <li>TapAway reserves the right to modify commission rates, bonus structures, and payout thresholds at any time</li>
              <li>Commissions are subject to a minimum payout threshold before disbursement</li>
              <li>Payouts are processed according to the schedule displayed in your affiliate dashboard</li>
              <li>You are responsible for providing accurate payout information (PayPal, bank details, etc.)</li>
              <li>TapAway is not responsible for payout delays caused by incorrect information, bank processing times, or holidays</li>
              <li>Commissions may be held pending verification for up to 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. No Guarantee of Earnings</h2>
            <p className="text-muted-foreground">
              <strong>TAPAWAY MAKES NO GUARANTEE OF EARNINGS.</strong> Participation in the Program does not guarantee
              any specific level of income, commissions, or financial results. Your earnings depend entirely on your
              own efforts and the actions of referred users. Any income examples or projections are for illustrative
              purposes only and are not promises of actual results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Prohibited Practices</h2>
            <p className="text-muted-foreground mb-4">
              <strong>THE FOLLOWING ARE STRICTLY PROHIBITED</strong> and will result in immediate termination
              from the Program, forfeiture of all unpaid commissions, and potential legal action:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Self-Referrals:</strong> Referring yourself, your own accounts, or accounts you control</li>
              <li><strong>Fake Accounts:</strong> Creating fake or fraudulent accounts to generate referrals</li>
              <li><strong>Spam:</strong> Sending unsolicited emails, messages, or communications promoting your referral link</li>
              <li><strong>Misleading Advertising:</strong> Making false, misleading, or exaggerated claims about TapAway or the Program</li>
              <li><strong>Paid Advertising Abuse:</strong> Bidding on TapAway brand keywords in paid advertising without written permission</li>
              <li><strong>Cookie Stuffing:</strong> Using hidden iframes, pop-ups, or other deceptive methods to set referral cookies</li>
              <li><strong>Incentivized Signups:</strong> Offering cash, gifts, or other incentives to people to sign up using your link (unless explicitly authorized by TapAway)</li>
              <li><strong>Multiple Accounts:</strong> Operating multiple affiliate accounts to circumvent limits or abuse the system</li>
              <li><strong>Trademark Infringement:</strong> Using TapAway trademarks, logos, or branding in unauthorized ways</li>
              <li><strong>Misrepresentation:</strong> Claiming to be an employee, agent, or official representative of TapAway</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Abuse Detection & Prevention</h2>
            <p className="text-muted-foreground mb-4">
              TapAway employs automated and manual systems to detect affiliate abuse, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>IP address tracking and analysis for fraud patterns</li>
              <li>Device fingerprinting and behavioral analysis</li>
              <li>Referral velocity monitoring (unusual spikes in referral activity)</li>
              <li>Cross-referencing referral data with account creation patterns</li>
              <li>Manual review of flagged referrals</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              If abuse is detected, TapAway may, at its sole discretion: withhold pending commissions, claw back
              previously paid commissions, suspend or terminate your affiliate account, ban you from future
              participation, and/or pursue legal remedies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Relationship of Parties</h2>
            <p className="text-muted-foreground">
              <strong>YOU ARE AN INDEPENDENT CONTRACTOR, NOT AN EMPLOYEE.</strong> Nothing in these terms creates
              an employment, agency, partnership, or joint venture relationship between you and TapAway. You are
              solely responsible for your own taxes, insurance, and compliance with applicable laws. TapAway does
              not provide benefits, workers' compensation, or employment protections to affiliates.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Tax Obligations</h2>
            <p className="text-muted-foreground">
              You are solely responsible for reporting and paying all taxes on commissions earned through the Program.
              If you are a U.S. person and your total commissions exceed $600 in a calendar year, TapAway may be
              required to issue a Form 1099-NEC. You are responsible for providing accurate tax information upon
              request. Failure to provide valid tax information may result in withholding of payouts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Intellectual Property</h2>
            <p className="text-muted-foreground">
              TapAway grants you a limited, non-exclusive, revocable license to use TapAway's name and approved
              marketing materials solely for the purpose of promoting TapAway through the Program. You may not
              modify, alter, or create derivative works from TapAway's trademarks or branding without written
              permission. This license terminates immediately upon termination of your affiliate status.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
            <p className="text-muted-foreground mb-4">
              Either party may terminate participation in the Program at any time, for any reason. Upon termination:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your referral link will be deactivated</li>
              <li>Pending commissions that have been verified and are not flagged for abuse will be paid according to the normal schedule</li>
              <li>Commissions under review or flagged for abuse may be forfeited at TapAway's sole discretion</li>
              <li>You must immediately cease using TapAway branding and marketing materials</li>
              <li>Your TapAway user account (separate from affiliate status) is not affected unless separately terminated</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TapAway's total liability to you in connection with the Program shall not exceed the total commissions
              actually paid to you in the preceding 12 months. TapAway shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your participation in the Program.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify, defend, and hold harmless TapAway from any claims, damages, losses, or
              expenses arising from your participation in the Program, your promotional activities, your violation
              of these terms, or any third-party claims related to your affiliate activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Modifications</h2>
            <p className="text-muted-foreground">
              TapAway reserves the right to modify these Affiliate & Referral Terms, commission rates, qualifying
              actions, payout thresholds, and any other aspect of the Program at any time, with or without notice.
              Continued participation after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Affiliate & Referral Terms, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AffiliateTerms;
