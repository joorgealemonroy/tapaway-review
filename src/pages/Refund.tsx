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
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              TapAway is committed to providing excellent service. This Refund Policy outlines the circumstances under which refunds may be issued for our digital SaaS subscriptions and physical NFC cards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Digital SaaS Subscription Refunds</h2>
            <p className="text-muted-foreground mb-4">
              Due to the nature of our digital service, <strong>refunds for subscription fees are generally not provided</strong>. However, we will issue refunds in the following cases:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Eligible for Refund:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Service Outage:</strong> If TapAway experiences a complete service outage lasting more than 72 consecutive hours</li>
              <li><strong>Duplicate Billing:</strong> If you were charged twice or incorrectly billed due to a technical error</li>
              <li><strong>Post-Cancellation Charge:</strong> If you were charged after properly canceling your subscription</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">NOT Eligible for Refund:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Change of mind or dissatisfaction after using the service</li>
              <li>Partial usage of a billing period</li>
              <li>Failure to cancel before the next billing cycle</li>
              <li>Issues with third-party platforms (Google, Yelp, Instagram)</li>
              <li>NFC device incompatibility or user error</li>
            </ul>

            <p className="text-muted-foreground mt-4">
              <strong>Note:</strong> Canceling your subscription stops future charges but does not refund the current billing period. You retain access until the end of your paid term.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Physical NFC Card Refunds</h2>
            <p className="text-muted-foreground mb-4">
              For physical NFC cards included with your subscription or purchased separately, refunds or replacements are available only in the following cases:
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Eligible for Refund or Replacement:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Damaged on Delivery:</strong> If the card arrives damaged or defective</li>
              <li><strong>Printing Error:</strong> If the card has incorrect restaurant information or design due to our error</li>
              <li><strong>Defective NFC:</strong> If the NFC chip does not function properly upon receipt</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">NOT Eligible for Refund:</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Customer error in providing restaurant information</li>
              <li>Normal wear and tear from use</li>
              <li>Damage caused after delivery</li>
              <li>Loss or theft of the card</li>
              <li>Change of mind after card production has started</li>
            </ul>

            <p className="text-muted-foreground mt-4">
              To request a replacement for a damaged card, contact us within 7 days of delivery with photos of the damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Add-On Features & Services</h2>
            <p className="text-muted-foreground">
              Add-on features such as custom card designs, extra NFC cards, or one-time AI reports are <strong>non-refundable</strong> once delivered or activated. This includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Custom NFC card designs</li>
              <li>Additional NFC cards beyond your plan's included amount</li>
              <li>One-time AI insights or reports</li>
              <li>Custom integrations or setup services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Chargebacks</h2>
            <p className="text-muted-foreground">
              If you initiate a chargeback with your bank or credit card company without first contacting us, your account will be immediately suspended. We will work with you to resolve billing disputes fairly—please reach out to us first at <strong>tap@tapaway.co</strong> before filing a chargeback.
            </p>
            <p className="text-muted-foreground mt-4">
              Accounts suspended due to chargebacks will remain locked until the dispute is resolved.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. How to Request a Refund</h2>
            <p className="text-muted-foreground mb-4">
              If you believe you are eligible for a refund under this policy, please contact us at:
            </p>
            <div className="bg-accent/50 p-6 rounded-lg my-4">
              <p className="text-muted-foreground mb-2"><strong>Email:</strong> tap@tapaway.co</p>
              <p className="text-muted-foreground mb-2"><strong>Subject Line:</strong> Refund Request</p>
              <p className="text-muted-foreground"><strong>Include:</strong></p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Your account email address</li>
                <li>Order or transaction ID</li>
                <li>Reason for refund request</li>
                <li>Supporting documentation (if applicable)</li>
              </ul>
            </div>
            <p className="text-muted-foreground">
              We will review your request within 7–14 business days. If approved, refunds will be processed back to your original payment method within 5–10 business days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Free Trials</h2>
            <p className="text-muted-foreground">
              If we offer a free trial period, you will not be charged until the trial ends. You may cancel at any time during the trial to avoid being billed. Once the trial period ends and billing begins, this Refund Policy applies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Refund Policy at any time. Changes will be posted on this page with an updated "Last Updated" date. Your continued use of TapAway after changes are posted constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Contact Us</h2>
            <p className="text-muted-foreground">
              For questions about this Refund Policy or to request a refund, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> tap@tapaway.co<br />
              <strong>Subject Line:</strong> Refund Policy Inquiry
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Refund;
