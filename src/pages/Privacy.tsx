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
          {/* 1. INTRO */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              TapAway (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is committed to
              protecting the information you provide. This Privacy Policy explains what data we collect, how we use it,
              and your rights regarding your information. By using TapAway, you agree to the terms of this Privacy
              Policy.
            </p>
          </section>

          {/* 2. INFO WE COLLECT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-2">Account Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Email address</li>
              <li>Restaurant name and business information</li>
              <li>Billing information (processed by Stripe; we do not store full card numbers)</li>
              <li>Account settings and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Menu &amp; Content Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Menu sections, items, descriptions, and prices</li>
              <li>Restaurant logo and branding assets</li>
              <li>Custom slug, URL, and dashboard settings</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Analytics &amp; Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Button clicks (Google, Yelp, Instagram, Directions)</li>
              <li>Menu views and interaction data</li>
              <li>NFC tap events (anonymous device events)</li>
              <li>Device type, browser, and technical analytics</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">AI Processing Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Analytics used to generate AI insights</li>
              <li>Public Google review text used for reply generation</li>
              <li>Competitor data sourced from public listings</li>
            </ul>
          </section>

          {/* 3. WE DO NOT COLLECT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Information We Do NOT Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Full credit card numbers (handled solely by Stripe)</li>
              <li>Personal information of your restaurant customers</li>
              <li>Social Security numbers or government-issued IDs</li>
              <li>Customer tracking outside the TapAway Review Hub</li>
              <li>Sensitive personal data such as race, religion, or health data</li>
            </ul>
          </section>

          {/* 4. HOW WE USE DATA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Operate and improve the TapAway platform</li>
              <li>Provide analytics and performance insights</li>
              <li>Generate AI-powered recommendations and suggestions</li>
              <li>Create automated review reply suggestions</li>
              <li>Send weekly reports and usage summaries</li>
              <li>Personalize your dashboard and Review Hub</li>
              <li>Prevent fraud, abuse, and security breaches</li>
              <li>Process payments and manage subscriptions</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We do not sell your data to third parties under any circumstances.
            </p>
          </section>

          {/* 5. AI & AUTOMATION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. AI &amp; Automated Decision Making</h2>
            <p className="text-muted-foreground">
              TapAway&apos;s AI features analyze your analytics data to provide insights, suggestions, and performance
              scores. Where possible, data is anonymized prior to processing. AI-generated content (such as review
              replies) is advisory only. You are responsible for reviewing and approving any AI-generated content before
              posting it publicly.
            </p>
          </section>

          {/* 6. AGGREGATED DATA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Aggregated &amp; Anonymized Data</h2>
            <p className="text-muted-foreground">
              We may use aggregated or anonymized data that does not identify you or your business to improve the
              platform, train models, analyze trends, and develop new features. This information cannot reasonably be
              used to identify you.
            </p>
          </section>

          {/* 7. THIRD PARTY SERVICES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">We use trusted third-party providers to operate TapAway:</p>

            <h3 className="text-xl font-semibold mb-2">Stripe (Payments)</h3>
            <p className="text-muted-foreground mb-4">
              Stripe handles all billing and subscription payments. We do not have access to your full credit card
              number. Stripe&apos;s privacy policy governs your payment information.
            </p>

            <h3 className="text-xl font-semibold mb-2">Supabase / Lovable Cloud (Hosting &amp; Database)</h3>
            <p className="text-muted-foreground mb-4">
              We use secure cloud infrastructure for hosting and database management. Data is encrypted in transit and
              at rest, with access controls in place.
            </p>

            <p className="text-muted-foreground">
              We do not share, rent, or sell your personal information with advertisers or unrelated third parties.
            </p>
          </section>

          {/* 8. COOKIES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Cookies &amp; Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">TapAway uses minimal cookies and similar technologies for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication and keeping you logged in</li>
              <li>Session management and security</li>
              <li>Anonymous analytics to understand feature usage</li>
              <li>Preventing fraudulent or abusive activity</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You can disable cookies in your browser settings, but some features of TapAway may not function properly.
            </p>
          </section>

          {/* 9. INTERNATIONAL TRANSFERS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your information may be stored and processed in the United States or other countries where our service
              providers operate. By using TapAway, you consent to the transfer of your information outside of your
              country in accordance with this Privacy Policy.
            </p>
          </section>

          {/* 10. DATA RETENTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your information for as long as your account is active. If you cancel your subscription or
              request account deletion, we will delete your personal information within 30 days, except where we are
              legally required to retain certain records (such as billing or tax documentation).
            </p>
          </section>

          {/* 11. GDPR RIGHTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Your Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-4">
              If you are located in the European Union, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access: Request a copy of the data we hold about you</li>
              <li>Correct: Request correction of inaccurate or incomplete data</li>
              <li>Delete: Request deletion of your account and associated data</li>
              <li>Export: Request a portable copy of your data</li>
              <li>Object: Opt out of certain data processing where legally applicable</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at <strong>tap@tapaway.co</strong>.
            </p>
          </section>

          {/* 12. CCPA RIGHTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground mb-4">If you are a California resident, you have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Know what personal information we collect, use, and disclose</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the sale of personal information (we do not sell your data)</li>
              <li>Not be discriminated against for exercising your privacy rights</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To submit a request, email <strong>tap@tapaway.co</strong> with the subject line:{" "}
              <em>&quot;California Privacy Request&quot;</em>.
            </p>
          </section>

          {/* 13. SECURITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Security Measures</h2>
            <p className="text-muted-foreground mb-4">
              We take reasonable technical and organizational measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest for sensitive data</li>
              <li>Secure database environments and access controls</li>
              <li>Limited employee access to personal information</li>
              <li>Periodic security reviews and monitoring</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              However, no system is 100% secure. You are responsible for using a strong password and keeping your
              account credentials confidential.
            </p>
          </section>

          {/* 14. LAW ENFORCEMENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. Legal Compliance &amp; Law Enforcement</h2>
            <p className="text-muted-foreground">
              We may disclose information about you if required to do so by law or in the good-faith belief that such
              action is necessary to: comply with a legal obligation, respond to valid law enforcement requests, protect
              the rights or property of TapAway, or enforce our Terms of Service.
            </p>
          </section>

          {/* 15. THIRD-PARTY LINKS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Third-Party Links</h2>
            <p className="text-muted-foreground">
              TapAway may contain links to third-party websites or services (such as Google, Yelp, Instagram, or map
              providers). We are not responsible for the privacy practices or content of those external sites. We
              encourage you to review their privacy policies separately.
            </p>
          </section>

          {/* 16. CHILDREN */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground">
              TapAway is not intended for individuals under 18 years of age. We do not knowingly collect personal
              information from children. If you believe a minor has provided us with information, please contact us so
              we can delete it.
            </p>
          </section>

          {/* 17. CHANGES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy at any time, with or without notice. The &quot;Last Updated&quot; date
              at the top of this page reflects the latest version. Your continued use of TapAway after any changes means
              you accept the updated Privacy Policy. You are responsible for reviewing this page periodically.
            </p>
          </section>

          {/* 18. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">18. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, data access requests, or concerns, contact us at:{" "}
              <strong>tap@tapaway.co</strong> with the subject line <em>&quot;Privacy Inquiry&quot;</em>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
