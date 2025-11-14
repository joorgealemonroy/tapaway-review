import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const Terms = () => {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 13, 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* ================================ */}
          {/* 1. INTRODUCTION + ACCEPTANCE     */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction & Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              Welcome to TapAway. By accessing or using our website, dashboard, NFC cards, or any TapAway services, you
              agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must stop
              using TapAway immediately.
            </p>
          </section>

          {/* ================================ */}
          {/* 2. ELIGIBILITY                   */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="text-muted-foreground mb-4">To use TapAway, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Be at least 18 years old</li>
              <li>Be a business owner or authorized representative of a restaurant or service business</li>
              <li>Have the legal authority to agree to these Terms on behalf of your business</li>
            </ul>
          </section>

          {/* ================================ */}
          {/* 3. ACCOUNTS & SECURITY           */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Accounts & Security</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for maintaining the confidentiality and security of your account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Keep your password secure</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept all responsibility for actions taken under your account</li>
              <li>Not share your account with unauthorized users</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We may suspend or terminate accounts involved in fraud, abuse, illegal activity, or violation of these
              Terms.
            </p>
          </section>

          {/* ================================ */}
          {/* 4. USE OF SERVICE                */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Use of the Service</h2>

            <p className="text-muted-foreground mb-4">Permitted uses include:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Using TapAway NFC cards to direct customers to review platforms</li>
              <li>Managing your menu, branding, and settings through the dashboard</li>
              <li>Viewing analytics and insights</li>
              <li>Using our AI tools to draft review replies</li>
            </ul>

            <p className="text-muted-foreground my-4">Prohibited uses include:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Creating fake, misleading, or fraudulent reviews</li>
              <li>Offering incentives or compensation in exchange for positive reviews</li>
              <li>Violating Google, Yelp, or platform review policies</li>
              <li>Reverse-engineering, scraping, or attempting to exploit the software</li>
              <li>Using TapAway for unlawful purposes</li>
              <li>Reselling TapAway services without written permission</li>
            </ul>

            <p className="text-muted-foreground mt-4">
              You are solely responsible for complying with all third-party review platform rules.
            </p>
          </section>

          {/* ================================ */}
          {/* 5. PHYSICAL PRODUCT              */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Physical Product Disclaimer</h2>
            <p className="text-muted-foreground">
              TapAway NFC cards require NFC-compatible devices. We are not responsible for device incompatibility,
              normal wear, damage from misuse, or placement issues.
            </p>
          </section>

          {/* ================================ */}
          {/* 6. DATA & CONSENT                */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data & Consent</h2>
            <p className="text-muted-foreground mb-4">By using TapAway, you consent to our collection and use of:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Business information (name, address, menu, logo)</li>
              <li>Analytics events (taps, clicks, button activity, menu views)</li>
              <li>AI logs used to improve suggestions and generate insights</li>
            </ul>
            <p className="text-muted-foreground mt-4">We do not store sensitive personal data from your customers.</p>
          </section>

          {/* ================================ */}
          {/* 7. AI DISCLAIMER                 */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">7. AI Tools Disclaimer</h2>
            <p className="text-muted-foreground">
              TapAway’s AI features may generate incorrect, incomplete, or imperfect content. You agree to review all
              AI-generated replies and insights before posting or using them. TapAway is not responsible for actions
              taken based on AI content.
            </p>
          </section>

          {/* ================================ */}
          {/* 8. PAYMENT & BILLING             */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Payment, Subscriptions & Billing</h2>
            <p className="text-muted-foreground mb-4">
              Payments are processed securely through Stripe. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Automatic renewal unless canceled</li>
              <li>Keeping valid payment information on file</li>
              <li>Being billed monthly or yearly depending on your plan</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>No refunds</strong> are provided for monthly or yearly subscriptions, except in the case of a
              billing error caused by TapAway.
            </p>
          </section>

          {/* ================================ */}
          {/* 9. CANCELLATION & TERMINATION    */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Cancellation & Termination</h2>
            <p className="text-muted-foreground">
              You may cancel anytime through your Stripe billing portal. Your subscription remains active until the end
              of your billing period. We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* ================================ */}
          {/* 10. INTELLECTUAL PROPERTY        */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              TapAway owns all rights to the software, dashboard, algorithms, branding, and product designs. You retain
              ownership of all business content you upload, including logos and menu data.
            </p>
            <p className="text-muted-foreground">
              You agree that you have permission to upload all content you provide. You are responsible for any claims
              arising from copyrighted or unauthorized content you upload.
            </p>
          </section>

          {/* ================================ */}
          {/* 11. LIMITATION OF LIABILITY      */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">TapAway is not responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Lost revenue, profits, customers, or business opportunities</li>
              <li>Issues or restrictions imposed by Google, Yelp, or other platforms</li>
              <li>Service interruptions, bugs, downtime, or technical issues</li>
              <li>Device incompatibility with NFC cards</li>
              <li>Results or outcomes generated by AI tools</li>
              <li>Any expectation of guaranteed new reviews or ratings</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              TapAway does not guarantee the number, quality, or frequency of reviews your business may receive. Our
              maximum liability is limited to the amount paid to TapAway in the last 30 days.
            </p>
          </section>

          {/* ================================ */}
          {/* 12. INDEMNIFICATION              */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold TapAway harmless from any claims, damages, or legal actions arising from:
              misuse of the service, violations of review platform rules, illegal activity, improper content uploads, or
              breach of these Terms.
            </p>
          </section>

          {/* ================================ */}
          {/* 13. CHANGES TO TERMS             */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Modifications to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms at any time, with or without notice. The “Last Updated” date reflects when
              changes were made. Continued use of TapAway constitutes acceptance of the latest Terms. You are
              responsible for reviewing this page periodically.
            </p>
          </section>

          {/* ================================ */}
          {/* 14. GOVERNING LAW                */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the State of California. All disputes must be handled in
              California courts.
            </p>
          </section>

          {/* ================================ */}
          {/* 15. CONTACT                      */}
          {/* ================================ */}

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Contact</h2>
            <p className="text-muted-foreground">
              For any questions, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
