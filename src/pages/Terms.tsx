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
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              Welcome to TapAway. TapAway is a SaaS platform that provides NFC "tap-to-review" cards and a review-automation dashboard for restaurants and service businesses. By accessing or using our website, dashboard, or services, you agree to be bound by these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="text-muted-foreground mb-4">To use TapAway, you must:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Be a business owner or authorized representative of a restaurant or service business</li>
              <li>Have the legal authority to enter into these Terms on behalf of your business</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Accounts & Security</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for maintaining the security of your account credentials. You agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Keep your password secure and confidential</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Not share your account with unauthorized parties</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We reserve the right to terminate accounts that violate these Terms or engage in illegal, fraudulent, or abusive behavior.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Use of the Service</h2>
            <p className="text-muted-foreground mb-4">Permitted uses include:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Using NFC cards to direct customers to review platforms</li>
              <li>Managing your restaurant menu and settings through the dashboard</li>
              <li>Viewing analytics and AI-generated insights</li>
              <li>Generating review replies using our AI tools</li>
            </ul>
            <p className="text-muted-foreground my-4">Prohibited uses include:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Creating fraudulent or fake reviews</li>
              <li>Manipulating review platforms in violation of their terms of service</li>
              <li>Scraping, reverse-engineering, or attempting to extract our source code</li>
              <li>Using the service for any illegal purpose</li>
              <li>Reselling or redistributing TapAway services without authorization</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You must comply with Google's, Yelp's, and other platforms' terms of service when soliciting reviews.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Physical Product Disclaimer</h2>
            <p className="text-muted-foreground">
              Our NFC cards work only with NFC-compatible devices. TapAway is not responsible for device incompatibility, normal wear and tear, or damage caused by improper use. You are responsible for proper placement and usage of the cards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Data & Consent</h2>
            <p className="text-muted-foreground mb-4">
              By using TapAway, you consent to our collection and use of:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Restaurant information (name, address, menu data, logo)</li>
              <li>Analytics data (button clicks, menu views, tap events)</li>
              <li>AI logs used to generate insights and suggestions</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We do not collect or store sensitive personal information from your customers. For details, see our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. AI Tools Disclaimer</h2>
            <p className="text-muted-foreground">
              Our AI-powered features (including AI Coach insights and review reply generator) may contain inaccuracies. You agree to review and verify all AI-generated content before posting or acting on it. TapAway is not liable for outcomes resulting from reliance on AI suggestions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Payment, Subscriptions & Billing</h2>
            <p className="text-muted-foreground mb-4">
              All payments are processed securely through Stripe. By subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Auto-renewal of your subscription unless canceled</li>
              <li>Maintaining up-to-date payment information</li>
              <li>Monthly or yearly billing as selected during checkout</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Prices are subject to change with 30 days' notice. Add-on features (extra NFC cards, custom designs, etc.) may incur additional charges.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Cancellation & Termination</h2>
            <p className="text-muted-foreground">
              You may cancel your subscription at any time through the Stripe billing portal. Upon cancellation, your access will continue until the end of your current billing cycle. No partial refunds are provided unless stated in our Refund Policy. We reserve the right to terminate accounts for violations of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              TapAway retains all rights to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Software, algorithms, and AI models</li>
              <li>Dashboard design and branding</li>
              <li>NFC card design templates</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You retain ownership of your restaurant content, including logos, menu data, and custom settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              TapAway is not responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Lost revenue or business opportunities</li>
              <li>Issues with third-party review platforms (Google, Yelp, Instagram)</li>
              <li>Service outages or technical difficulties</li>
              <li>Device incompatibility with NFC cards</li>
              <li>Outcomes based on AI-generated content</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Our maximum liability shall not exceed the amount you paid in the last 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless TapAway from any claims, damages, or expenses arising from your misuse of the service, violations of review platform policies, or illegal activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Modifications</h2>
            <p className="text-muted-foreground">
              We may update these Terms at any time. We will notify you of significant changes via email or dashboard notification. Continued use of TapAway after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the State of California, United States. Any disputes shall be resolved in the courts of California.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
