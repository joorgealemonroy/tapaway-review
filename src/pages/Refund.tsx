import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const Refund = () => {
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
        <h1 className="text-4xl font-bold mb-8">Refund & Subscription Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. NO REFUNDS DEFAULT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. No Refunds by Default</h2>
            <p className="text-muted-foreground mb-4">
              <strong>TAPAWAY DOES NOT OFFER REFUNDS BY DEFAULT.</strong> Because TapAway provides an instantly 
              accessible digital SaaS platform combined with physical printed products, all purchases are considered 
              final upon completion.
            </p>
            <p className="text-muted-foreground">
              By subscribing to TapAway or purchasing any products or services, you acknowledge and agree that 
              refunds are not provided except in the limited circumstances described in Section 2 below.
            </p>
          </section>

          {/* 2. ERROR-ONLY EXCEPTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Refunds for Verified Technical Errors Only</h2>
            <p className="text-muted-foreground mb-4">
              Refunds are <strong>ONLY</strong> issued if there was a verified technical error on TapAway's end. 
              Eligible scenarios include:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Duplicate Billing:</strong> You were charged twice for the same subscription period 
                  due to a technical error</li>
              <li><strong>Post-Cancellation Charge:</strong> You were charged after properly canceling your 
                  subscription through the Stripe billing portal</li>
              <li><strong>System Error:</strong> A verified platform-wide technical failure on TapAway's end 
                  that prevented you from accessing core functionality for more than 72 consecutive hours</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>ALL REFUND REQUESTS REQUIRE VERIFICATION.</strong> We will investigate the claim and 
              determine, at our sole discretion, whether a refund is warranted.
            </p>
          </section>

          {/* 3. NOT ELIGIBLE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. What is NOT Eligible for Refund</h2>
            <p className="text-muted-foreground mb-4">
              <strong>REFUNDS ARE NOT ISSUED FOR:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Change of mind after purchase</li>
              <li>Lack of usage or failure to use the platform</li>
              <li>Business performance, revenue, or customer results</li>
              <li>Review counts, ratings, or outcomes</li>
              <li>Customer behavior or staff misconduct</li>
              <li>Platform policy changes by Google, Yelp, Instagram, or other third parties</li>
              <li>NFC or QR code misuse, misplacement, or improper handling</li>
              <li>Device incompatibility with NFC technology</li>
              <li>Shipping delays caused by carriers (USPS, FedEx, UPS, etc.)</li>
              <li>Third-party service outages (Stripe, hosting, APIs, analytics)</li>
              <li>Partial usage of a billing period</li>
              <li>Failure to cancel before renewal date</li>
              <li>AI Coach or AI feature outputs that you disagree with</li>
              <li>International shipping issues or customs delays</li>
              <li>Lost or stolen NFC cards after delivery</li>
              <li>Damaged cards after delivery (unless damaged during shipping and reported within 7 days)</li>
              <li>Dissatisfaction with the service after using it</li>
              <li>Inability to achieve desired results</li>
            </ul>
          </section>

          {/* 4. AUTOMATIC RENEWAL DISCLOSURE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Automatic Renewal Disclosure</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOUR SUBSCRIPTION AUTOMATICALLY RENEWS.</strong> In accordance with California Business and 
              Professions Code §§ 17600-17606 (California Automatic Renewal Law) and applicable federal and state 
              regulations:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>All TapAway paid subscriptions (monthly and annual) automatically renew at the end of each billing 
                  period unless you cancel before the renewal date</li>
              <li>You will be charged the then-current subscription price upon each automatic renewal</li>
              <li>You may cancel at any time through your Stripe billing portal or by contacting tap@tapaway.co</li>
              <li>Cancellation stops future billing but does not entitle you to a refund for the current period</li>
              <li>We will provide at least 30 days' notice before any price increases take effect</li>
              <li>If your payment method fails at renewal, we may suspend access until payment is received</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>HOW TO CANCEL:</strong> Log into your TapAway dashboard, navigate to Settings or Billing, and 
              click "Manage Subscription" to access your Stripe billing portal. Alternatively, email tap@tapaway.co 
              with the subject line "Cancel Subscription."
            </p>
          </section>

          {/* 5. FREE TIER */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Free Plan Clarification</h2>
            <p className="text-muted-foreground">
              TapAway offers a free personal plan with limited features. Free plans are provided at TapAway's 
              discretion and may be modified, limited, or discontinued at any time. Free plan users are not 
              charged and therefore no refund questions arise. If a free plan user upgrades to a paid plan, this 
              Refund Policy applies in full from the date of the first paid charge.
            </p>
          </section>

          {/* 6. SUBSCRIPTION TIME IS NON-REFUNDABLE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Subscription Time is Non-Refundable</h2>
            <p className="text-muted-foreground">
              <strong>ALL SUBSCRIPTION TIME USED IS NON-REFUNDABLE.</strong> If you cancel your subscription, 
              you will retain access until the end of your current billing period, but no pro-rated refunds 
              will be issued for unused time. Each billing cycle (monthly or yearly) is considered fully earned 
              once charged.
            </p>
          </section>

          {/* 7. PHYSICAL PRODUCTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Physical Products Are Non-Refundable</h2>
            <p className="text-muted-foreground mb-4">
              <strong>ALL PRINTED OR SHIPPED CARDS ARE NON-REFUNDABLE</strong> under all circumstances, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Lost cards (after delivery confirmation)</li>
              <li>Stolen cards</li>
              <li>Damaged cards after delivery</li>
              <li>Customer input errors (wrong logo, wrong link, wrong quantity, typos)</li>
              <li>Change of mind after production has started</li>
              <li>Business closure or change of ownership</li>
              <li>Incorrect shipping address provided by customer</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>LIMITED EXCEPTION:</strong> We may replace (not refund) cards that arrive damaged during 
              shipping or have defective NFC chips upon delivery, provided you report the issue within 7 days 
              of delivery with photographic evidence. This is at our sole discretion.
            </p>
          </section>

          {/* 8. ADD-ONS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Add-On Features & Services</h2>
            <p className="text-muted-foreground mb-4">
              All add-on items and services are non-refundable once delivered or activated, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Additional NFC cards</li>
              <li>Custom NFC card designs</li>
              <li>AI insights or reports</li>
              <li>Custom integrations</li>
              <li>Setup, onboarding, or configuration services</li>
              <li>Replacement cards</li>
              <li>Multi-location packages</li>
            </ul>
          </section>

          {/* 9. CANCELLATION ≠ REFUND */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Cancellation Does NOT Equal Refund</h2>
            <p className="text-muted-foreground mb-4">
              <strong>CANCELING YOUR SUBSCRIPTION ONLY STOPS FUTURE BILLING.</strong> It does not entitle you 
              to a refund for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>The current billing period (you retain access until expiration)</li>
              <li>Any previous billing periods</li>
              <li>Physical products already shipped or in production</li>
              <li>Add-on services already delivered</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You may cancel at any time through your Stripe billing portal. Cancellation takes effect at the 
              end of your current billing cycle.
            </p>
          </section>

          {/* 10. CHARGEBACKS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Chargeback Policy</h2>
            <p className="text-muted-foreground mb-4">
              <strong>CHARGEBACK ABUSE WILL RESULT IN IMMEDIATE ACCOUNT TERMINATION.</strong>
            </p>
            <p className="text-muted-foreground mb-4">
              If you initiate a chargeback or dispute with your bank or credit card company without first 
              contacting TapAway at <strong>tap@tapaway.co</strong>:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Your TapAway account will be immediately suspended</li>
              <li>Access to the dashboard, hub, profile, and all features will be revoked</li>
              <li>Your account may be permanently terminated without refund</li>
              <li>You may be banned from creating future accounts</li>
              <li>We will contest the chargeback and provide evidence to Stripe</li>
              <li>You may be responsible for any chargeback fees or legal costs incurred</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>CONTACT US FIRST.</strong> We are committed to resolving legitimate billing issues 
              quickly and fairly. Please email <strong>tap@tapaway.co</strong> before disputing any charge.
            </p>
          </section>

          {/* 11. REFUND DECISIONS ARE FINAL */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. All Refund Decisions Are Final</h2>
            <p className="text-muted-foreground mb-4">
              <strong>ALL REFUND DECISIONS ARE MADE AT TAPAWAY'S SOLE DISCRETION AND ARE FINAL.</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Even in error-based refunds, the refund amount may be partial, not full</li>
              <li>Refund processing time is determined by Stripe and your financial institution, not TapAway</li>
              <li>Refunds typically take 5-10 business days to appear on your statement</li>
              <li>We reserve the right to deny refund requests that do not meet our criteria</li>
              <li>Repeated refund requests for the same issue will not be entertained</li>
            </ul>
          </section>

          {/* 12. FREE TRIALS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Free Trials</h2>
            <p className="text-muted-foreground mb-4">
              If TapAway offers a free trial, you will not be charged until the trial period ends. You may 
              cancel at any time during the trial to avoid billing.
            </p>
            <p className="text-muted-foreground">
              Once the trial ends and billing begins, this Refund Policy applies in full. We reserve the right 
              to modify, limit, or discontinue free trials at any time and to restrict repeated or abusive 
              trial usage. Creating multiple accounts to abuse free trials may result in permanent ban.
            </p>
          </section>

          {/* 13. STRIPE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Stripe Payment Processing</h2>
            <p className="text-muted-foreground">
              All payments and refunds are processed through Stripe. TapAway does not store your credit card 
              information. Any refunds issued will be processed by Stripe to your original payment method. 
              Processing times are determined by Stripe and your financial institution, not TapAway.
            </p>
          </section>

          {/* 14. HOW TO REQUEST */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. How to Request a Refund</h2>
            <p className="text-muted-foreground mb-4">
              If you believe you qualify for a refund under Section 2 of this policy, email:
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>Email:</strong> tap@tapaway.co<br />
              <strong>Subject Line:</strong> Refund Request
            </p>
            <p className="text-muted-foreground mb-4">Include the following information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your account email address</li>
              <li>Transaction ID or invoice number</li>
              <li>Specific reason for the refund request</li>
              <li>Evidence of the technical error (screenshots, dates, etc.)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We will review your request within 7-14 business days. Incomplete requests may be denied.
            </p>
          </section>

          {/* 15. CHANGES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Changes to This Refund Policy</h2>
            <p className="text-muted-foreground">
              We may update this Refund Policy at any time, with or without prior notice. The "Last Updated" 
              date at the top reflects the most recent revision. Your continued use of TapAway after any 
              changes constitutes acceptance of the updated Refund Policy. You are responsible for reviewing 
              this page periodically.
            </p>
          </section>

          {/* 16. CONSISTENCY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Consistency Across Documents</h2>
            <p className="text-muted-foreground">
              This Refund Policy is consistent with and incorporated into our Terms of Service. In the event 
              of any perceived conflict, the more restrictive interpretation (in TapAway's favor) shall apply.
            </p>
          </section>

          {/* 17. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Contact Us</h2>
            <p className="text-muted-foreground">
              For questions about this Refund Policy, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Refund;
