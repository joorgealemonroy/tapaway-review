import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const Privacy = () => {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: January 13, 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              TapAway ("we," "us," or "our") respects your privacy. This Privacy Policy explains what data we collect, how we use it, and your rights regarding your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Data We Collect</h2>
            <p className="text-muted-foreground mb-4">We collect the following types of information:</p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Account Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Email address</li>
              <li>Restaurant name and business information</li>
              <li>Billing information (processed securely by Stripe)</li>
              <li>Account settings and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Menu & Content Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Menu sections, items, descriptions, and prices</li>
              <li>Restaurant logo and branding assets</li>
              <li>Custom slug and URL settings</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Analytics & Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Button clicks (Google, Yelp, Instagram, Directions)</li>
              <li>Menu views and interaction data</li>
              <li>NFC tap events (anonymous)</li>
              <li>Device and browser information for analytics purposes</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">AI Processing Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Analytics data used to generate AI insights</li>
              <li>Review text (pulled from public Google reviews) for reply generation</li>
              <li>Competitor data from public sources</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Data We DO NOT Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Credit card information (handled exclusively by Stripe)</li>
              <li>Personal information from your restaurant customers</li>
              <li>Tracking data from customers outside the Review Hub</li>
              <li>Social Security numbers or government IDs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. How We Use Your Data</h2>
            <p className="text-muted-foreground mb-4">We use collected data to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and improve our review-automation platform</li>
              <li>Generate analytics and performance insights</li>
              <li>Create AI-powered suggestions and recommendations</li>
              <li>Send weekly performance reports</li>
              <li>Personalize your Review Hub links and dashboard</li>
              <li>Detect fraud and prevent abuse</li>
              <li>Process payments through Stripe</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. AI & Automated Processing</h2>
            <p className="text-muted-foreground">
              Our AI Coach analyzes your analytics data to provide insights, suggestions, and performance scores. This processing is done to help you improve your review collection strategy. Where possible, data is anonymized before AI processing. AI-generated content (such as review replies) is provided as suggestions only—you remain responsible for what you post publicly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">We use the following third-party services:</p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6">Stripe (Payment Processing)</h3>
            <p className="text-muted-foreground">
              All billing and subscription management is handled by Stripe. We never see your full credit card information. Stripe's privacy policy applies to payment data.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">Supabase / Lovable Cloud (Hosting & Database)</h3>
            <p className="text-muted-foreground">
              Our infrastructure is hosted on secure cloud services. Data is encrypted in transit and at rest.
            </p>

            <p className="text-muted-foreground mt-6">
              <strong>We do NOT sell your data to third parties. Ever.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cookies & Tracking</h2>
            <p className="text-muted-foreground mb-4">
              We use minimal cookies for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication (keeping you logged in)</li>
              <li>Anonymous analytics (to understand feature usage)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can disable cookies in your browser settings, though this may limit functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your data as long as your account is active. After you cancel your subscription or request account deletion, we will delete your personal information within 30 days, except where required by law to retain certain records.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Your Rights (GDPR Compliance)</h2>
            <p className="text-muted-foreground mb-4">If you are in the European Union, you have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of all data we have about you</li>
              <li><strong>Correct:</strong> Update inaccurate or incomplete information</li>
              <li><strong>Delete:</strong> Request deletion of your account and data</li>
              <li><strong>Export:</strong> Download your data in a portable format</li>
              <li><strong>Object:</strong> Opt out of certain data processing activities</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at <strong>tap@tapaway.co</strong>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground mb-4">
              If you are a California resident, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Know what personal information we collect and how it's used</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale of personal information (note: we do not sell your data)</li>
              <li>Non-discrimination for exercising your privacy rights</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To submit a request, email <strong>tap@tapaway.co</strong> with "California Privacy Request" in the subject line.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Security Measures</h2>
            <p className="text-muted-foreground mb-4">We protect your data with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest for sensitive data</li>
              <li>Secure database environment with access controls</li>
              <li>Limited employee access to personal information</li>
              <li>Regular security audits</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              While we take reasonable precautions, no system is 100% secure. Use strong passwords and keep your account credentials confidential.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Children's Privacy</h2>
            <p className="text-muted-foreground">
              TapAway is not intended for use by individuals under 18. We do not knowingly collect data from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or dashboard notification. Continued use of TapAway after updates constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, data access requests, or concerns, contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> tap@tapaway.co<br />
              <strong>Subject Line:</strong> Privacy Inquiry
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
