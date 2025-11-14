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
        <h1 className="text-4xl font-bold mb-8">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 13, 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. INTRODUCTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              TapAway is committed to providing excellent service and transparent billing. This Refund Policy explains
              under what circumstances refunds may be granted for our SaaS subscriptions and physical NFC cards.
            </p>
          </section>

          {/* 2. DIGITAL SAAS SUBSCRIPTIONS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Digital SaaS Subscription Refunds</h2>
            <p className="text-muted-foreground mb-4">
              Because TapAway provides an instantly accessible digital service, subscription fees are generally
              non-refundable. We will issue a refund only in the following cases:
            </p>

            <h3 className="text-xl font-semibold mb-2">Eligible for Refund</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>
                <strong>Service Outage:</strong> A complete, platform-wide outage lasting longer than 72 consecutive
                hours.
              </li>
              <li>
                <strong>Duplicate Billing:</strong> You were charged twice or incorrectly billed due to a technical
                issue.
              </li>
              <li>
                <strong>Post-Cancellation Charge:</strong> You were charged after properly canceling your subscription.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Not Eligible for Refund</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Change of mind after purchase</li>
              <li>Dissatisfaction after using the service</li>
              <li>Partial usage of a billing period</li>
              <li>Failure to cancel before renewal</li>
              <li>Issues caused by Google, Yelp, Instagram, or any other third-party platform</li>
              <li>NFC incompatibility with a customer&apos;s device or user error</li>
              <li>Incorrect usage of the dashboard or Review Hub</li>
            </ul>

            <p className="text-muted-foreground mt-4">
              Canceling your subscription stops future charges but does not refund the current billing cycle. Your
              access continues through the end of your paid term.
            </p>
          </section>

          {/* 3. PHYSICAL NFC CARDS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Physical NFC Card Refunds</h2>
            <p className="text-muted-foreground mb-4">
              Refunds or replacements for physical NFC cards are limited to the following circumstances:
            </p>

            <h3 className="text-xl font-semibold mb-2">Eligible for Refund or Replacement</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Cards arrived damaged</li>
              <li>Printing errors caused by TapAway</li>
              <li>Defective NFC chips upon delivery</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Not Eligible for Refund</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Incorrect restaurant information provided by the customer</li>
              <li>Wear and tear from normal usage</li>
              <li>Damage occurring after delivery</li>
              <li>Lost or stolen cards</li>
              <li>Change of mind after printing or production has started</li>
              <li>Misuse or improper placement of the cards</li>
            </ul>

            <p className="text-muted-foreground mt-4">
              Requests for damaged or defective cards must be made within 7 days of delivery and include clear photos of
              the issue.
            </p>
          </section>

          {/* 4. ADD-ONS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Add-On Features &amp; Services</h2>
            <p className="text-muted-foreground mb-4">
              Add-on items or services are non-refundable once delivered or activated, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Custom NFC card designs</li>
              <li>Additional NFC cards</li>
              <li>One-time AI insights or reports</li>
              <li>Custom integrations</li>
              <li>Setup, onboarding, or configuration services</li>
            </ul>
          </section>

          {/* 5. CHARGEBACKS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Chargebacks</h2>
            <p className="text-muted-foreground mb-4">
              If you initiate a chargeback with your bank or card issuer without first contacting TapAway:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your account may be immediately suspended</li>
              <li>Access to the Review Hub, analytics, and dashboard may be temporarily revoked</li>
              <li>Your account may remain locked until the dispute is resolved</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We encourage you to contact us first. We aim to resolve billing issues quickly and fairly.
            </p>
          </section>

          {/* 6. HOW TO REQUEST */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. How to Request a Refund</h2>
            <p className="text-muted-foreground mb-4">
              If you believe you are eligible for a refund under this policy, please email:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> tap@tapaway.co
              <br />
              <strong>Subject Line:</strong> Refund Request
            </p>
            <p className="text-muted-foreground mt-4">Include the following details in your request:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your account email address</li>
              <li>Order or transaction ID</li>
              <li>Reason for the refund request</li>
              <li>Supporting documentation (if applicable)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We will review your request within 7–14 business days. If approved, refunds are processed to your original
              payment method within 5–10 business days.
            </p>
          </section>

          {/* 7. FREE TRIALS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Free Trials</h2>
            <p className="text-muted-foreground mb-4">
              If TapAway offers a free trial, you will not be charged until the trial period ends. You may cancel at any
              time during the trial to avoid being billed.
            </p>
            <p className="text-muted-foreground">
              Once the trial ends and billing begins, this Refund Policy applies. We reserve the right to modify, limit,
              or discontinue free trials at any time and to restrict repeated or abusive free trial usage.
            </p>
          </section>

          {/* 8. CHANGES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to This Refund Policy</h2>
            <p className="text-muted-foreground">
              We may update this Refund Policy at any time, with or without notice. The &quot;Last Updated&quot; date at
              the top of this page reflects the latest version. Your continued use of TapAway after any changes means
              you accept the updated Refund Policy. You are responsible for reviewing this page periodically.
            </p>
          </section>

          {/* 9. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground">
              For questions about this Refund Policy or help with billing, contact us at:{" "}
              <strong>tap@tapaway.co</strong> with the subject line <em>&quot;Refund Policy Inquiry&quot;</em>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Refund;
