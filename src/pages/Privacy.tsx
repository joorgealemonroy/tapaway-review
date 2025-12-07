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
        <p className="text-muted-foreground mb-8">Last Updated: December 7, 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. INTRODUCTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction & Acceptance</h2>
            <p className="text-muted-foreground mb-4">
              TapAway ("Company," "we," "us," or "our") is committed to protecting the privacy of users who access 
              our website, dashboard, Review Hub, NFC cards, AI Coach, and related services (collectively, the "Service"). 
              This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
            </p>
            <p className="text-muted-foreground">
              <strong>BY USING TAPAWAY, YOU AUTOMATICALLY AGREE TO THIS PRIVACY POLICY.</strong> Continued use of 
              the Service constitutes your acceptance. No checkbox or explicit confirmation is required. If you do 
              not agree, you must immediately stop using TapAway.
            </p>
          </section>

          {/* 2. DATA WE COLLECT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-2">Account & Business Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Full name and contact name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Business name and address</li>
              <li>Business location(s)</li>
              <li>Account credentials (passwords are encrypted)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Content & Configuration Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Restaurant logos and branding assets</li>
              <li>Menu sections, items, descriptions, and prices</li>
              <li>Review platform links (Google, Yelp, Instagram, etc.)</li>
              <li>Custom slugs and URLs</li>
              <li>Dashboard settings and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Analytics & Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>NFC tap events (anonymized device events)</li>
              <li>QR code scans</li>
              <li>Button clicks (Google, Yelp, Instagram, Directions)</li>
              <li>Menu views and interactions</li>
              <li>Hub page visits</li>
              <li>Dashboard activity</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Technical & Device Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Device type (mobile, desktop, tablet)</li>
              <li>Operating system</li>
              <li>Referral source</li>
              <li>Session duration and timestamps</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">AI Processing Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Analytics data used to generate AI Coach insights</li>
              <li>Public Google review text used for reply generation</li>
              <li>Sentiment analysis from public reviews</li>
              <li>Competitor data from public listings</li>
            </ul>
          </section>

          {/* 3. DATA WE DO NOT COLLECT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Information We Do NOT Collect</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Credit card numbers</strong> — All payment processing is handled exclusively by Stripe. 
                  We never see, store, or process your full credit card information.</li>
              <li><strong>Personal information of your restaurant customers</strong> — We do not collect names, 
                  emails, or any personally identifiable information from people who tap your NFC cards.</li>
              <li><strong>Social Security numbers or government IDs</strong></li>
              <li><strong>Health, medical, or biometric data</strong></li>
              <li><strong>Race, religion, sexual orientation, or political affiliation</strong></li>
              <li><strong>Location tracking of individual customers</strong></li>
            </ul>
          </section>

          {/* 4. HOW WE USE DATA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use collected data exclusively for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Operating and maintaining the TapAway platform</li>
              <li>Providing analytics, insights, and performance reporting</li>
              <li>Generating AI Coach recommendations and review reply suggestions</li>
              <li>Processing payments and managing subscriptions (via Stripe)</li>
              <li>Sending weekly reports and usage summaries</li>
              <li>Personalizing your dashboard and Review Hub</li>
              <li>Preventing fraud, abuse, and security breaches</li>
              <li>Improving and developing new features</li>
              <li>Responding to support requests</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          {/* 5. WE DO NOT SELL DATA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. We Do NOT Sell Your Data</h2>
            <p className="text-muted-foreground mb-4">
              <strong>TAPAWAY DOES NOT SELL, RENT, OR SHARE YOUR DATA WITH:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Data brokers</li>
              <li>Advertisers</li>
              <li>Marketing companies</li>
              <li>Third-party resellers</li>
              <li>Any entity for monetary compensation</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Your data is used solely for operating the TapAway platform and providing our services to you.
            </p>
          </section>

          {/* 6. THIRD-PARTY SERVICES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Third-Party Services We Use</h2>
            
            <h3 className="text-xl font-semibold mb-2">Stripe (Payment Processing)</h3>
            <p className="text-muted-foreground mb-4">
              All billing, subscription management, and payment processing is handled by Stripe. We do not have 
              access to your full credit card number. Stripe's privacy policy governs your payment information.
            </p>

            <h3 className="text-xl font-semibold mb-2">Supabase / Lovable Cloud (Database & Authentication)</h3>
            <p className="text-muted-foreground mb-4">
              We use secure cloud infrastructure for hosting, database management, and user authentication. 
              Data is encrypted in transit and at rest.
            </p>

            <h3 className="text-xl font-semibold mb-2">Lovable Analytics (Usage Tracking)</h3>
            <p className="text-muted-foreground mb-4">
              We use Lovable Analytics to track taps, clicks, and usage events. We do NOT use Fathom Analytics 
              or similar third-party analytics platforms.
            </p>

            <h3 className="text-xl font-semibold mb-2">Hosting & CDN Providers</h3>
            <p className="text-muted-foreground">
              We use industry-standard hosting and content delivery networks to serve our platform securely and reliably.
            </p>
          </section>

          {/* 7. DATA RETENTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOUR DATA IS NOT AUTOMATICALLY DELETED</strong> when you cancel your subscription or stop paying.
            </p>
            <p className="text-muted-foreground mb-4">
              We retain your data indefinitely until you explicitly request deletion. This ensures you can 
              reactivate your account without losing historical data.
            </p>
            <p className="text-muted-foreground">
              <strong>To request data deletion:</strong> Email <strong>tap@tapaway.co</strong> with the subject line 
              "Data Deletion Request." We will verify your identity before processing. Once verified, all data 
              will be permanently and irreversibly deleted within 30 days.
            </p>
          </section>

          {/* 8. COOKIES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Cookies & Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">TapAway uses cookies and similar technologies for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication and session management</li>
              <li>Keeping you logged in</li>
              <li>Security and fraud prevention</li>
              <li>Analytics and feature usage tracking</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You may disable cookies in your browser settings, but this may affect functionality. We do not 
              use third-party advertising cookies.
            </p>
          </section>

          {/* 9. SECURITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Security Measures</h2>
            <p className="text-muted-foreground mb-4">We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest for sensitive data</li>
              <li>Secure database access controls</li>
              <li>Regular security monitoring</li>
              <li>Limited employee access to personal data</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>SECURITY DISCLAIMER:</strong> No system is 100% secure. While we take reasonable precautions, 
              we cannot guarantee absolute security. You are responsible for maintaining strong passwords and 
              protecting your account credentials. TapAway shall not be held liable for data breaches caused by 
              third-party attacks, your negligence, or factors outside our reasonable control.
            </p>
          </section>

          {/* 10. CCPA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground mb-4">
              If you are a California resident, you have the following rights under the California Consumer Privacy Act:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Right to Know:</strong> Request disclosure of what personal information we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of the sale of personal information (we do NOT sell data)</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To submit a CCPA request, email <strong>tap@tapaway.co</strong> with subject line "California Privacy Request."
            </p>
          </section>

          {/* 11. COPPA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Children's Privacy (COPPA)</h2>
            <p className="text-muted-foreground">
              <strong>TAPAWAY IS NOT INTENDED FOR CHILDREN UNDER 13.</strong> We do not knowingly collect personal 
              information from children under 13 years of age. If we discover that a child under 13 has provided 
              us with personal information, we will immediately delete it. If you believe a child has submitted 
              information to us, contact <strong>tap@tapaway.co</strong> immediately.
            </p>
          </section>

          {/* 12. INTERNATIONAL TRANSFERS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. International Data Transfers</h2>
            <p className="text-muted-foreground mb-4">
              TapAway is operated from the United States. Your information may be transferred to and processed in 
              the United States or other countries where our service providers operate.
            </p>
            <p className="text-muted-foreground">
              <strong>INTERNATIONAL ACCESS DISCLAIMER:</strong> If you access TapAway from outside the United States, 
              you do so at your own risk and are solely responsible for compliance with local data protection laws. 
              By using TapAway, you consent to the transfer of your data to the United States.
            </p>
          </section>

          {/* 13. GDPR RIGHTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. European Union Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-4">
              If you are in the European Union, you may have rights under the General Data Protection Regulation including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of data we hold about you</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Request a portable copy of your data</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, email <strong>tap@tapaway.co</strong>.
            </p>
          </section>

          {/* 14. LEGAL COMPLIANCE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. Legal Compliance & Law Enforcement</h2>
            <p className="text-muted-foreground">
              We may disclose your information if required by law or in good-faith belief that such disclosure is 
              necessary to: comply with legal obligations, respond to valid law enforcement requests or subpoenas, 
              protect the rights or property of TapAway, prevent fraud or security threats, or enforce our Terms of Service.
            </p>
          </section>

          {/* 15. BREACH LIABILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Data Breach Liability Limitations</h2>
            <p className="text-muted-foreground">
              While we implement reasonable security measures, we cannot guarantee absolute security. In the event 
              of a data breach caused by factors outside our reasonable control (including but not limited to: 
              third-party attacks, zero-day vulnerabilities, user negligence, or force majeure), TapAway's liability 
              shall be limited to the amount you paid in the most recent billing cycle. We shall not be liable for 
              any indirect, consequential, or punitive damages arising from data breaches.
            </p>
          </section>

          {/* 16. THIRD-PARTY LINKS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Third-Party Links</h2>
            <p className="text-muted-foreground">
              TapAway may contain links to third-party websites (Google, Yelp, Instagram, Apple Maps, etc.). 
              We are not responsible for the privacy practices or content of those external sites. We encourage 
              you to review their privacy policies separately.
            </p>
          </section>

          {/* 17. CHANGES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy at any time, with or without prior notice. The "Last Updated" date 
              at the top reflects the most recent revision. Your continued use of TapAway after any changes 
              constitutes acceptance of the updated Privacy Policy. You are responsible for reviewing this page 
              periodically.
            </p>
          </section>

          {/* 18. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">18. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related questions, data access requests, or concerns, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;