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
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. INTRODUCTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction & Acceptance</h2>
            <p className="text-muted-foreground mb-4">
              TapAway ("Company," "we," "us," or "our") is committed to protecting the privacy of users who access 
              our website, dashboard, personal profiles, Review Hub, NFC cards, AI Coach, and related services 
              (collectively, the "Service"). This Privacy Policy explains what information we collect, how we use it, 
              and your rights regarding your data.
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
            
            <h3 className="text-xl font-semibold mb-2">Account Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Full name and contact name</li>
              <li>Email address</li>
              <li>Phone number (if provided)</li>
              <li>Account credentials (passwords are encrypted)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Business Information (Business Users)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Business name and address</li>
              <li>Business location(s)</li>
              <li>Restaurant logos and branding assets</li>
              <li>Menu sections, items, descriptions, and prices</li>
              <li>Review platform links (Google, Yelp, Instagram, etc.)</li>
              <li>Custom slugs and URLs</li>
              <li>Dashboard settings and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Personal Profile Information (Personal Users)</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Username (tapaway.co/username)</li>
              <li>Profile photo and banner/header images</li>
              <li>Bio, headline, and description text</li>
              <li>Social media links and custom links</li>
              <li>Contact card information (name, email, phone, company, title, address, website) if contact sharing is enabled</li>
              <li>Content blocks (text, images, embeds)</li>
              <li>Design preferences (colors, layout, header style)</li>
              <li>NFC card customization choices</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Email Lead Capture Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>When a personal profile has email capture enabled, we collect: visitor name, email, phone number, and message as submitted by the visitor</li>
              <li>This data is stored on behalf of the profile owner and is accessible in their dashboard</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Affiliate & Referral Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>Referral codes and affiliate status</li>
              <li>Referral tracking (which users were referred by which affiliate)</li>
              <li>IP addresses for affiliate abuse detection and fraud prevention</li>
              <li>Commission and payout records</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">Analytics & Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
              <li>NFC tap events (anonymized device events)</li>
              <li>QR code scans</li>
              <li>Button clicks (Google, Yelp, Instagram, Directions, etc.)</li>
              <li>Menu views and interactions</li>
              <li>Hub and profile page visits</li>
              <li>Link clicks on personal profiles</li>
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

            <h3 className="text-xl font-semibold mb-2">AI Processing Data (Business Users)</h3>
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
              <li><strong>Personal information of your customers</strong> — We do not collect names, 
                  emails, or any personally identifiable information from people who tap your NFC cards (unless they 
                  voluntarily submit information through an email capture form on your profile).</li>
              <li><strong>Social Security numbers or government IDs</strong></li>
              <li><strong>Health, medical, or biometric data</strong></li>
              <li><strong>Race, religion, sexual orientation, or political affiliation</strong></li>
              <li><strong>Location tracking of individual customers or visitors</strong></li>
            </ul>
          </section>

          {/* 4. HOW WE USE DATA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use collected data exclusively for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Operating and maintaining the TapAway platform</li>
              <li>Hosting and displaying your personal profile or business hub</li>
              <li>Providing analytics, insights, and performance reporting</li>
              <li>Generating AI Coach recommendations and review reply suggestions (business users)</li>
              <li>Processing payments and managing subscriptions (via Stripe)</li>
              <li>Sending weekly reports, usage summaries, and transactional emails</li>
              <li>Personalizing your dashboard, profile, and hub</li>
              <li>Processing and tracking affiliate referrals</li>
              <li>Detecting and preventing fraud, abuse, and security breaches</li>
              <li>Improving and developing new features</li>
              <li>Responding to support requests</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          {/* 5. LEGAL BASIS FOR PROCESSING (GDPR) */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Legal Basis for Processing (GDPR)</h2>
            <p className="text-muted-foreground mb-4">
              For users in the European Economic Area (EEA), United Kingdom, and Switzerland, we process personal 
              data under the following legal bases:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Contract Performance:</strong> Processing necessary to provide the services you signed up for (hosting your profile, processing payments, delivering NFC cards)</li>
              <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate business interests (analytics, fraud prevention, platform improvement, security) where those interests are not overridden by your rights</li>
              <li><strong>Consent:</strong> Where you have given specific consent for certain processing activities (such as marketing communications, if applicable)</li>
              <li><strong>Legal Obligation:</strong> Processing necessary to comply with applicable laws (tax reporting, law enforcement requests, data breach notification)</li>
            </ul>
          </section>

          {/* 6. WE DO NOT SELL DATA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. We Do NOT Sell Your Data</h2>
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
              As defined under the California Consumer Privacy Act (CCPA), we do not "sell" or "share" personal 
              information as those terms are defined in the statute.
            </p>
          </section>

          {/* 7. THIRD-PARTY SERVICES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Third-Party Services We Use</h2>
            
            <h3 className="text-xl font-semibold mb-2">Stripe (Payment Processing)</h3>
            <p className="text-muted-foreground mb-4">
              All billing, subscription management, and payment processing is handled by Stripe. We do not have 
              access to your full credit card number. Stripe's privacy policy governs your payment information.
            </p>

            <h3 className="text-xl font-semibold mb-2">Cloud Infrastructure (Database & Authentication)</h3>
            <p className="text-muted-foreground mb-4">
              We use secure cloud infrastructure for hosting, database management, and user authentication. 
              Data is encrypted in transit and at rest.
            </p>

            <h3 className="text-xl font-semibold mb-2">First-Party Analytics (Usage Tracking)</h3>
            <p className="text-muted-foreground mb-4">
              We use first-party analytics stored in our own database to track taps, clicks, and usage events. 
              We do NOT use third-party analytics platforms (Google Analytics, Fathom, Hotjar, etc.). 
              For details, see our <a href="/cookie-policy" className="text-primary hover:underline">Cookie & Analytics Policy</a>.
            </p>

            <h3 className="text-xl font-semibold mb-2">Resend (Email Delivery)</h3>
            <p className="text-muted-foreground mb-4">
              We use Resend to deliver transactional emails (authentication, notifications, reports). Email content 
              and metadata are processed by Resend in accordance with their privacy policy.
            </p>

            <h3 className="text-xl font-semibold mb-2">AI Model Providers</h3>
            <p className="text-muted-foreground mb-4">
              For AI-powered features (business users only), we process data through AI model providers to generate 
              insights and review replies. Data sent to AI providers is limited to what is necessary for the specific 
              AI feature being used.
            </p>

            <h3 className="text-xl font-semibold mb-2">Hosting & CDN Providers</h3>
            <p className="text-muted-foreground">
              We use industry-standard hosting and content delivery networks to serve our platform securely and reliably.
            </p>
          </section>

          {/* 8. DATA RETENTION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Data Retention</h2>
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

          {/* 9. COOKIES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Cookies & Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">TapAway uses strictly necessary cookies for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication and session management</li>
              <li>Keeping you logged in</li>
              <li>Security and fraud prevention</li>
              <li>UI preferences (theme, sidebar state)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We do not use advertising cookies, third-party tracking cookies, or marketing cookies. 
              For complete details, see our <a href="/cookie-policy" className="text-primary hover:underline">Cookie & Analytics Policy</a>.
            </p>
          </section>

          {/* 10. SECURITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Security Measures</h2>
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

          {/* 11. CCPA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="text-muted-foreground mb-4">
              If you are a California resident, you have the following rights under the California Consumer Privacy Act 
              and the California Privacy Rights Act:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Right to Know:</strong> Request disclosure of what personal information we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of the sale or sharing of personal information (we do NOT sell or share data as defined by the CCPA/CPRA)</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
              <li><strong>Right to Limit:</strong> Limit the use of sensitive personal information (we do not collect sensitive personal information as defined by the CPRA)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To submit a CCPA/CPRA request, email <strong>tap@tapaway.co</strong> with subject line "California Privacy Request." 
              We will verify your identity and respond within 45 days.
            </p>
          </section>

          {/* 12. COPPA */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Children's Privacy (COPPA)</h2>
            <p className="text-muted-foreground">
              <strong>TAPAWAY IS NOT INTENDED FOR CHILDREN UNDER 13.</strong> We do not knowingly collect personal 
              information from children under 13 years of age. If we discover that a child under 13 has provided 
              us with personal information, we will immediately delete it. If you believe a child has submitted 
              information to us, contact <strong>tap@tapaway.co</strong> immediately.
            </p>
          </section>

          {/* 13. INTERNATIONAL TRANSFERS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. International Data Transfers</h2>
            <p className="text-muted-foreground mb-4">
              TapAway is operated from the United States. Your information may be transferred to and processed in 
              the United States or other countries where our service providers operate.
            </p>
            <p className="text-muted-foreground mb-4">
              For transfers of personal data from the European Economic Area (EEA), United Kingdom, or Switzerland 
              to the United States, TapAway relies on Standard Contractual Clauses (SCCs) as approved by the 
              European Commission, or other legally recognized transfer mechanisms.
            </p>
            <p className="text-muted-foreground">
              <strong>INTERNATIONAL ACCESS DISCLAIMER:</strong> If you access TapAway from outside the United States, 
              you do so at your own risk and are solely responsible for compliance with local data protection laws. 
              By using TapAway, you consent to the transfer of your data to the United States.
            </p>
          </section>

          {/* 14. GDPR RIGHTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. European Union Rights (GDPR)</h2>
            <p className="text-muted-foreground mb-4">
              If you are in the European Union, European Economic Area, or United Kingdom, you may have the following 
              rights under the General Data Protection Regulation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of data we hold about you</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Request a portable copy of your data in a commonly used format</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Where processing is based on consent, withdraw that consent at any time</li>
              <li><strong>Lodge a Complaint:</strong> File a complaint with your local data protection authority</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, email <strong>tap@tapaway.co</strong>. We will respond within 30 days. 
              Business users who process customer data through TapAway should review our 
              <a href="/dpa" className="text-primary hover:underline"> Data Processing Addendum</a>.
            </p>
          </section>

          {/* 15. LEGAL COMPLIANCE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Legal Compliance & Law Enforcement</h2>
            <p className="text-muted-foreground">
              We may disclose your information if required by law or in good-faith belief that such disclosure is 
              necessary to: comply with legal obligations, respond to valid law enforcement requests or subpoenas, 
              protect the rights or property of TapAway, prevent fraud or security threats, or enforce our Terms of Service.
            </p>
          </section>

          {/* 16. BREACH LIABILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Data Breach Liability Limitations</h2>
            <p className="text-muted-foreground">
              While we implement reasonable security measures, we cannot guarantee absolute security. In the event 
              of a data breach caused by factors outside our reasonable control (including but not limited to: 
              third-party attacks, zero-day vulnerabilities, user negligence, or force majeure), TapAway's liability 
              shall be limited to the total amount you paid in the twelve (12) months immediately preceding the 
              breach. We shall not be liable for any indirect, consequential, or punitive damages arising from 
              data breaches.
            </p>
          </section>

          {/* 17. THIRD-PARTY LINKS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Third-Party Links</h2>
            <p className="text-muted-foreground">
              TapAway and user profiles may contain links to third-party websites (Google, Yelp, Instagram, YouTube, 
              Apple Maps, personal websites, etc.). We are not responsible for the privacy practices or content of 
              those external sites. We encourage you to review their privacy policies separately.
            </p>
          </section>

          {/* 18. CHANGES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">18. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy at any time, with or without prior notice. The "Last Updated" date 
              at the top reflects the most recent revision. Your continued use of TapAway after any changes 
              constitutes acceptance of the updated Privacy Policy. You are responsible for reviewing this page 
              periodically.
            </p>
          </section>

          {/* 19. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">19. Contact Us</h2>
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
