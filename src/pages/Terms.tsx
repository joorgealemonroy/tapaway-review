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
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        {/* A2P 10DLC / TCR-required SMS terms block, placed above the fold so reviewers can find it immediately */}
        <section className="border border-primary/30 bg-primary/5 p-5 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-3">SMS & Mobile Messaging Terms</h2>
          <p className="text-sm text-foreground mb-3">
            TapAway provides SMS loyalty updates, exclusive discounts, and review reminders on
            behalf of registered small business owners (restaurants, bakeries, salons, barbers, and
            similar merchants). Recipients opt in via web forms on TapAway hubs, our{" "}
            <a href="/sms-signup" className="underline">SMS signup page</a>, or by texting the
            keyword <strong>TAPVIP</strong> to <strong>(978) 827-2929</strong>.
          </p>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1 mb-3">
            <li><strong>Opt-out:</strong> Reply <strong>STOP</strong> to any message to unsubscribe.</li>
            <li>
              <strong>Support:</strong> Reply <strong>HELP</strong> or contact{" "}
              <a href="mailto:support@tapaway.co" className="underline">support@tapaway.co</a>.
            </li>
            <li>Message frequency varies. Message & data rates may apply.</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Carriers are not liable for delayed or undelivered messages. Message & data rates may
            apply. Message frequency varies.
          </p>
        </section>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. BINDING AGREEMENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Binding Agreement</h2>
            <p className="text-muted-foreground mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") 
              and TapAway ("Company," "we," "us," or "our"). By accessing, browsing, or using the TapAway website, dashboard, 
              personal profiles, NFC cards, QR codes, Review Hub, AI Coach, mobile applications, APIs, or any other TapAway services 
              (collectively, the "Service"), you acknowledge that you have read, understood, and agree to be bound by these 
              Terms, our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, 
              our <a href="/refund" className="text-primary hover:underline">Refund Policy</a>, 
              our <a href="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</a>, 
              our <a href="/cookie-policy" className="text-primary hover:underline">Cookie & Analytics Policy</a>, 
              and all other policies referenced herein.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>CONTINUED USE OF TAPAWAY CONSTITUTES ACCEPTANCE.</strong> By simply accessing or using TapAway in any 
              capacity, you automatically agree to all terms, policies, and legal agreements. No checkbox, signature, or 
              explicit confirmation is required. Your use of the Service is your acceptance.
            </p>
            <p className="text-muted-foreground">
              If you do not agree to these Terms in their entirety, you must immediately stop using TapAway and delete your 
              account. Failure to cease use constitutes continued acceptance of all terms herein.
            </p>
          </section>

          {/* 2. ELIGIBILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. Eligibility Requirements</h2>
            <p className="text-muted-foreground mb-4">To use TapAway, you represent and warrant that:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You are at least 18 years of age</li>
              <li>If using TapAway for business purposes, you are a business owner or an authorized representative of a legitimate business entity with full legal authority to bind your business to these Terms</li>
              <li>If using TapAway for personal purposes, you are an individual acting in your own capacity</li>
              <li>You are not prohibited from using the Service under applicable laws</li>
              <li>Your use of TapAway operates lawfully in your jurisdiction</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>MINORS PROHIBITED.</strong> TapAway is not intended for use by individuals under 18 years of age. 
              We do not knowingly collect information from minors. If we discover that a minor has registered, we will 
              immediately terminate the account and delete all associated data without notice or liability.
            </p>
          </section>

          {/* 3. NATURE OF SERVICE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. Nature of Service — Software Tool Only</h2>
            <p className="text-muted-foreground mb-4">
              <strong>TAPAWAY IS A SOFTWARE TOOL ONLY.</strong> TapAway provides NFC cards, QR codes, personal profile 
              hosting, a Review Hub, analytics dashboard, and AI-powered features designed to help individuals share their 
              information and businesses collect customer reviews. TapAway is a technology platform—nothing more.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>WE DO NOT GUARANTEE:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Any specific number of reviews, followers, leads, or engagement</li>
              <li>Any specific star ratings or review content</li>
              <li>Revenue increases, business growth, or customer acquisition</li>
              <li>5-star results or positive reviews</li>
              <li>Platform uptime, availability, or uninterrupted service</li>
              <li>Accuracy of AI-generated content or insights</li>
              <li>Compatibility with all devices, browsers, or operating systems</li>
              <li>Continued operation of third-party platforms (Google, Yelp, Instagram, YouTube, Apple Maps, etc.)</li>
              <li>Any specific outcome from using personal profiles or NFC cards</li>
            </ul>
            <p className="text-muted-foreground">
              Any marketing materials, testimonials, case studies, or projections are for illustrative purposes only and 
              do not constitute guarantees. Results vary and depend entirely on factors outside TapAway's control.
            </p>
          </section>

          {/* 4. PERSONAL PROFILE HOSTING */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. Personal Profile Hosting</h2>
            <p className="text-muted-foreground mb-4">
              TapAway provides personal profile hosting at tapaway.co/username for individual users. By creating a personal 
              profile, you agree that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your profile and its contents are publicly accessible to anyone with the URL</li>
              <li>You are solely responsible for all content displayed on your profile (photos, bio, links, contact information)</li>
              <li>You will not use your profile for unlawful, deceptive, or harmful purposes</li>
              <li>TapAway may remove or disable profiles that violate these Terms or the Acceptable Use Policy</li>
              <li>Usernames are subject to availability and may be reclaimed by TapAway in cases of inactivity, trademark disputes, or policy violations</li>
              <li>TapAway does not guarantee the permanent availability of any specific username</li>
              <li>Content shared via your profile (including links, images, and contact information) is shared at your own risk</li>
            </ul>
          </section>

          {/* 5. USER RESPONSIBILITIES & ASSUMPTION OF RISK */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. User Responsibilities & Assumption of Risk</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOU ASSUME ALL RISK</strong> for how TapAway is used. You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>All content you create, upload, or display on your TapAway profile or hub</li>
              <li>Where NFC cards and QR codes are placed and how they are used</li>
              <li>How staff members use, present, or explain TapAway to customers (business users)</li>
              <li>All content uploaded to your dashboard (logos, menus, links, photos, etc.)</li>
              <li>Ensuring all links route to the correct and intended destinations</li>
              <li>Customer and visitor interactions related to TapAway</li>
              <li>Staff training and compliance with review platform policies (business users)</li>
              <li>Physical security and protection of NFC cards from theft or misuse</li>
              <li>Compliance with all local, state, federal, and international laws</li>
              <li>The accuracy and legality of contact information shared through your profile</li>
            </ul>
            <p className="text-muted-foreground">
              TapAway is not responsible for any misconduct, misuse, customer complaints, or any actions 
              taken by third parties using your TapAway materials or accessing your profile.
            </p>
          </section>

          {/* 6. PROHIBITED CONDUCT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Prohibited Conduct — Zero Tolerance Policy</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOU AGREE NOT TO:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Create, solicit, or post fake, fraudulent, or misleading reviews</li>
              <li>Engage in review gating (selectively directing customers based on expected sentiment)</li>
              <li>Offer incentives, discounts, compensation, or rewards in exchange for reviews in violation of 
                  Google, Yelp, or other platform policies</li>
              <li>Violate the terms of service of Google, Yelp, Instagram, YouTube, Apple Maps, or any other third-party platform</li>
              <li>Use TapAway for any unlawful, fraudulent, or malicious purposes</li>
              <li>Attempt to reverse-engineer, decompile, or exploit TapAway software</li>
              <li>Scrape, harvest, or collect data from TapAway without authorization</li>
              <li>Interfere with or disrupt TapAway's servers, networks, or infrastructure</li>
              <li>Impersonate another person or business</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Resell, sublicense, or redistribute TapAway services without written permission</li>
              <li>Use TapAway to harass, defame, or harm others</li>
              <li>Create multiple accounts to circumvent bans, suspensions, or usage limits</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              For a comprehensive list of prohibited content and conduct, see our <a href="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</a>.
            </p>
            <p className="text-muted-foreground">
              <strong>VIOLATION OF THIS SECTION WILL RESULT IN IMMEDIATE ACCOUNT TERMINATION</strong> without refund, 
              and may result in legal action.
            </p>
          </section>

          {/* 7. ACCOUNT SECURITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Account Security</h2>
            <p className="text-muted-foreground mb-4">You are responsible for:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Immediately notifying us of any unauthorized access at tap@tapaway.co</li>
              <li>Using strong passwords and enabling security features</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We are not liable for any loss or damage resulting from unauthorized access to your account, whether 
              caused by your negligence, security breach, or third-party actions.
            </p>
          </section>

          {/* 8. PAYMENT, BILLING & STRIPE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Payment, Billing & Automatic Renewal</h2>
            <p className="text-muted-foreground mb-4">
              <strong>ALL PAYMENTS ARE PROCESSED BY STRIPE.</strong> TapAway does not store, process, or have access 
              to your full credit card numbers. All billing, payment processing, disputes, chargebacks, and refunds 
              are handled exclusively by Stripe in accordance with their terms of service.
            </p>
            <p className="text-muted-foreground mb-4">By subscribing, you agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Automatic Renewal:</strong> Subscriptions automatically renew at the end of each billing 
                  cycle (monthly or yearly) unless canceled before the renewal date. You will be charged the then-current 
                  subscription price upon each renewal.</li>
              <li><strong>California Auto-Renewal Law Compliance:</strong> In accordance with California Business and 
                  Professions Code §§ 17600-17606, your subscription will automatically renew and you will be charged 
                  unless you cancel before the end of the current period. You may cancel at any time through your 
                  Stripe billing portal or by contacting tap@tapaway.co.</li>
              <li><strong>Valid Payment Method:</strong> You must maintain a valid payment method on file</li>
              <li><strong>Price Changes:</strong> We may change subscription prices with 30 days' prior notice. Continued 
                  use after the price change takes effect constitutes acceptance of the new price.</li>
              <li><strong>Failed Payments:</strong> If payment fails, we may suspend your account until payment is received</li>
              <li><strong>Taxes:</strong> You are responsible for all applicable taxes</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              <strong>FREE TIER:</strong> TapAway offers a free personal plan with limited features. Free plans may be 
              modified, limited, or discontinued at any time at TapAway's sole discretion. Free plan users are subject 
              to all terms herein.
            </p>
            <p className="text-muted-foreground">
              <strong>NO REFUNDS BY DEFAULT.</strong> Refunds are only issued for verified technical errors on TapAway's 
              end. See our <a href="/refund" className="text-primary hover:underline">Refund Policy</a> for complete details.
            </p>
          </section>

          {/* 9. PAYOUT POLICY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Payout Policy (Sales Representatives)</h2>
            <p className="text-muted-foreground mb-4">
              If you are a TapAway Sales Representative (independent contractor), the following payout terms apply:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>All commission payouts are sent <strong>weekly on Tuesdays at 12:00 PM Pacific Time</strong></li>
              <li>ACH transfers typically take <strong>1–3 business days</strong> to arrive depending on your bank</li>
              <li>Commissions earned after the weekly cutoff may roll into the next pay period</li>
              <li>Incorrect or missing bank information will delay payouts until corrected</li>
              <li>You are solely responsible for keeping your payout information accurate and up-to-date</li>
              <li>TapAway is not responsible for delays caused by incorrect bank details, bank processing times, or holidays</li>
              <li>A valid W-9 must be on file before any payouts can be processed</li>
            </ul>
            <p className="text-muted-foreground">
              By providing your ACH bank details, you acknowledge and agree to this payout schedule and take full 
              responsibility for the accuracy of your banking information.
            </p>
          </section>

          {/* 10. SUBSCRIPTION & CANCELLATION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Subscription & Cancellation</h2>
            <p className="text-muted-foreground mb-4">
              You may cancel your subscription at any time through your Stripe billing portal or by contacting 
              tap@tapaway.co. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your subscription remains active until the end of the current billing period</li>
              <li>No refunds are provided for unused time in the current period</li>
              <li>You retain access to the dashboard, hub, and profile until expiration</li>
              <li>NFC cards will continue to function but may not be supported after expiration</li>
              <li>Free tier features (if applicable) will remain available after paid subscription ends</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>CANCELLATION DOES NOT EQUAL REFUND.</strong> Canceling stops future billing only.
            </p>
          </section>

          {/* 11. TERMINATION RIGHTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Termination Rights</h2>
            <p className="text-muted-foreground mb-4">
              <strong>WE RESERVE THE RIGHT</strong> to suspend, restrict, or terminate your account at any time, 
              with or without notice, for any reason, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violation of these Terms or any referenced policy</li>
              <li>Suspected fraudulent activity</li>
              <li>Violation of third-party platform policies</li>
              <li>Non-payment or failed payment</li>
              <li>Abuse of staff, other users, or the platform</li>
              <li>Legal or regulatory requirements</li>
              <li>DMCA repeat infringement (see our <a href="/dmca" className="text-primary hover:underline">DMCA Policy</a>)</li>
              <li>At our sole discretion for business reasons</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Upon termination, all licenses granted to you under these Terms immediately terminate. We are not liable 
              for any damages resulting from termination.
            </p>
          </section>

          {/* 12. PHYSICAL PRODUCTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. Physical Products (NFC Cards & QR Codes)</h2>
            <p className="text-muted-foreground mb-4">
              TapAway NFC cards and QR codes are physical products subject to the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>NFC cards are optional — your hub/profile works without a physical card</li>
              <li>NFC cards require NFC-compatible devices to function</li>
              <li>We are not responsible for device incompatibility</li>
              <li>Cards are subject to normal wear and environmental conditions</li>
              <li>Damage, loss, or theft after delivery is your responsibility</li>
              <li>Printed cards are non-refundable once production begins</li>
              <li>Customer input errors (wrong logo, link, quantity) are not refundable</li>
              <li>Shipping delays caused by carriers are not our responsibility</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              For complete physical product terms, see our <a href="/nfc-disclaimer" className="text-primary hover:underline">NFC Product Disclaimer</a>.
            </p>
          </section>

          {/* 13. AI COACH DISCLAIMER */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. AI Coach & AI Features Disclaimer</h2>
            <p className="text-muted-foreground mb-4">
              <strong>AI-GENERATED CONTENT IS FOR INFORMATIONAL PURPOSES ONLY.</strong> TapAway's AI Coach, review 
              reply suggestions, insights, and all AI-powered features (available to business users) are provided 
              as-is without warranty.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>AI CONTENT IS NOT:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Legal advice</li>
              <li>Medical advice</li>
              <li>Financial advice</li>
              <li>Professional business consulting</li>
              <li>Guaranteed to be accurate, complete, or current</li>
            </ul>
            <p className="text-muted-foreground">
              You are solely responsible for reviewing, editing, and approving all AI-generated content before 
              posting or using it. TapAway is not liable for any consequences arising from AI-generated content. 
              For complete AI terms, see our <a href="/ai-disclaimer" className="text-primary hover:underline">AI Features Disclaimer</a>.
            </p>
          </section>

          {/* 14. THIRD-PARTY SERVICES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. Third-Party Services & APIs</h2>
            <p className="text-muted-foreground mb-4">
              TapAway integrates with third-party services (Google, Yelp, Instagram, YouTube, Stripe, hosting providers, etc.) strictly 
              for platform functionality. We are not responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Outages, downtime, or errors of third-party services</li>
              <li>Policy changes by Google, Yelp, Instagram, YouTube, or other platforms</li>
              <li>Account suspensions or restrictions imposed by third-party platforms</li>
              <li>Data loss or corruption caused by third-party services</li>
              <li>Actions taken by third parties that affect your business or profile</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Your use of third-party services is governed by their respective terms of service and privacy policies.
            </p>
          </section>

          {/* 15. USER-GENERATED CONTENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. User-Generated Content</h2>
            <p className="text-muted-foreground mb-4">
              TapAway hosts user-generated content including personal profiles, business hubs, uploaded images, links, 
              and text. Regarding user-generated content:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You retain ownership of content you create and upload</li>
              <li>By uploading content, you grant TapAway a non-exclusive, royalty-free, worldwide license to use, display, 
                  and process that content for providing the Service</li>
              <li>You represent and warrant that you have all necessary rights to upload such content</li>
              <li>TapAway is not responsible for the accuracy, legality, or appropriateness of user-generated content</li>
              <li>TapAway does not endorse, verify, or guarantee any user-generated content</li>
              <li>Users viewing other users' profiles do so at their own risk</li>
              <li>TapAway may remove user-generated content that violates these Terms or the Acceptable Use Policy</li>
            </ul>
          </section>

          {/* 16. DATA & PRIVACY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Data & Privacy</h2>
            <p className="text-muted-foreground mb-4">
              By using TapAway, you consent to our collection and processing of data as described in our 
              <a href="/privacy" className="text-primary hover:underline"> Privacy Policy</a>. Key points:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>We collect account information, profile data, analytics data, and usage data</li>
              <li>We use first-party analytics for tracking — not third-party analytics platforms</li>
              <li>We do NOT sell, rent, or share your data with advertisers or data brokers</li>
              <li>Payment information is handled exclusively by Stripe</li>
              <li>Data is retained until you request deletion</li>
              <li>Data deletion requests must be sent to tap@tapaway.co</li>
              <li>For information about cookies, see our <a href="/cookie-policy" className="text-primary hover:underline">Cookie & Analytics Policy</a></li>
              <li>Business users processing customer data through TapAway should review our <a href="/dpa" className="text-primary hover:underline">Data Processing Addendum</a></li>
            </ul>
          </section>

          {/* 17. DATA RETENTION & DELETION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Data Retention & Deletion</h2>
            <p className="text-muted-foreground mb-4">
              <strong>DATA IS NOT AUTOMATICALLY DELETED</strong> when you cancel or stop paying. Your data remains 
              in our systems until you explicitly request deletion.
            </p>
            <p className="text-muted-foreground">
              To request complete data deletion, you must email <strong>tap@tapaway.co</strong> with the subject 
              line "Data Deletion Request." We will verify your identity before processing the request. Once verified, 
              all data will be permanently deleted within 30 days.
            </p>
          </section>

          {/* 18. INTELLECTUAL PROPERTY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">18. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              TapAway owns all rights, title, and interest in the Service, including but not limited to software, 
              algorithms, designs, branding, trademarks, and proprietary technology.
            </p>
            <p className="text-muted-foreground">
              You retain ownership of content you upload (logos, photos, menus, etc.). By uploading content, you grant 
              TapAway a non-exclusive, royalty-free license to use, display, and process that content for 
              providing the Service. You represent that you have all necessary rights to upload such content. 
              For copyright infringement claims, see our <a href="/dmca" className="text-primary hover:underline">DMCA Policy</a>.
            </p>
          </section>

          {/* 19. LIMITATION OF LIABILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">19. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
            </p>
            <p className="text-muted-foreground mb-4">
              TapAway, its officers, directors, employees, agents, and affiliates shall not be liable for any 
              indirect, incidental, special, consequential, punitive, or exemplary damages, including but not 
              limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Loss of revenue, profits, or business opportunities</li>
              <li>Loss of customers, followers, leads, or reputation</li>
              <li>Business interruption or downtime</li>
              <li>Data loss or corruption</li>
              <li>Issues caused by Google, Yelp, Instagram, YouTube, or other platforms</li>
              <li>NFC/QR code misuse or staff misconduct</li>
              <li>AI-generated content errors or consequences</li>
              <li>Third-party service outages or failures</li>
              <li>Any claim related to review counts, ratings, or outcomes</li>
              <li>International access or compliance issues</li>
              <li>User-generated content posted by you or other users</li>
              <li>Lost profits of any kind</li>
            </ul>
            <p className="text-muted-foreground font-semibold">
              MAXIMUM LIABILITY: IN NO EVENT SHALL TAPAWAY'S TOTAL LIABILITY EXCEED THE TOTAL AMOUNT YOU PAID TO TAPAWAY 
              IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
            </p>
          </section>

          {/* 20. INDEMNIFICATION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">20. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify, defend, and hold harmless TapAway and its officers, directors, employees, 
              agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, 
              and expenses (including reasonable attorneys' fees) arising from: your use of the Service, violation 
              of these Terms or any referenced policy, violation of third-party platform policies, any content you 
              upload or display, any fraudulent or illegal activity, staff misconduct, customer disputes, affiliate 
              activities, or any claim that your use of TapAway caused harm to a third party.
            </p>
          </section>

          {/* 21. ARBITRATION & CLASS ACTION WAIVER */}
          <section>
            <h2 className="text-2xl font-bold mb-4">21. Arbitration & Class Action Waiver</h2>
            <p className="text-muted-foreground mb-4">
              <strong>MANDATORY ARBITRATION:</strong> Any dispute, claim, or controversy arising out of or relating 
              to these Terms or your use of TapAway shall be resolved exclusively through binding arbitration 
              administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>CLASS ACTION WAIVER:</strong> YOU AGREE TO WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION 
              LAWSUIT OR CLASS-WIDE ARBITRATION. All disputes must be brought in your individual capacity, not 
              as a plaintiff or class member in any purported class, collective, or representative proceeding.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>SMALL CLAIMS EXCEPTION:</strong> Notwithstanding the above, either party may bring an individual 
              action in small claims court for disputes within the court's jurisdictional limits.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>30-DAY OPT-OUT:</strong> You may opt out of this arbitration clause by sending written notice 
              to tap@tapaway.co within 30 days of first accepting these Terms. The notice must include your full name, 
              email address associated with your account, and a clear statement that you wish to opt out of binding 
              arbitration. If you do not opt out within 30 days, you are bound by this arbitration provision.
            </p>
            <p className="text-muted-foreground">
              Arbitration shall take place in the State of California. The arbitrator's decision shall be final 
              and binding. Judgment on the award may be entered in any court of competent jurisdiction.
            </p>
          </section>

          {/* 22. GOVERNING LAW */}
          <section>
            <h2 className="text-2xl font-bold mb-4">22. Governing Law & Jurisdiction</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the State of California, 
              United States, without regard to its conflict of law provisions. Any legal action not subject to 
              arbitration shall be brought exclusively in the state or federal courts located in California.
            </p>
          </section>

          {/* 23. INTERNATIONAL USERS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">23. International Users</h2>
            <p className="text-muted-foreground">
              TapAway is operated from the United States. If you access the Service from outside the United States, 
              you do so at your own risk and are responsible for compliance with local laws. We make no 
              representations that the Service is appropriate or available for use in other locations.
            </p>
          </section>

          {/* 24. FORCE MAJEURE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">24. Force Majeure</h2>
            <p className="text-muted-foreground">
              TapAway shall not be liable for any failure or delay in performing its obligations under these Terms 
              where such failure or delay results from causes beyond TapAway's reasonable control, including but not 
              limited to: acts of God, natural disasters, pandemics, epidemics, war, terrorism, civil unrest, 
              government actions or orders, embargoes, sanctions, labor disputes, strikes, power outages, internet 
              or telecommunications failures, cyberattacks, infrastructure failures, supply chain disruptions, or 
              any other event beyond TapAway's reasonable control. During such events, TapAway's obligations are 
              suspended for the duration of the force majeure event.
            </p>
          </section>

          {/* 25. EXPORT COMPLIANCE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">25. Export Compliance</h2>
            <p className="text-muted-foreground">
              You agree to comply with all applicable U.S. and international export control laws and regulations, 
              including the Export Administration Regulations (EAR) and sanctions programs administered by the 
              Office of Foreign Assets Control (OFAC). You represent and warrant that you are not located in, under 
              the control of, or a national or resident of any country subject to U.S. sanctions, and that you are 
              not on any U.S. government restricted parties list. You shall not export, re-export, or transfer any 
              TapAway products, services, or technology to any prohibited destination, entity, or person.
            </p>
          </section>

          {/* 26. ANTI-MONEY LAUNDERING */}
          <section>
            <h2 className="text-2xl font-bold mb-4">26. Anti-Money Laundering</h2>
            <p className="text-muted-foreground">
              You represent and warrant that your use of TapAway does not facilitate money laundering, terrorist 
              financing, or any other financial crime. TapAway reserves the right to report suspicious activities 
              to appropriate authorities and to cooperate with law enforcement investigations.
            </p>
          </section>

          {/* 27. ELECTRONIC CONSENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">27. Electronic Communications & Consent</h2>
            <p className="text-muted-foreground">
              By using TapAway, you consent to receive electronic communications from us, including but not limited 
              to: account notifications, security alerts, billing receipts, product updates, weekly reports, and 
              policy change notifications. You agree that all agreements, notices, and other communications provided 
              electronically satisfy any legal requirement that such communications be in writing.
            </p>
          </section>

          {/* 28. AFFILIATE & REFERRAL PROGRAM */}
          <section>
            <h2 className="text-2xl font-bold mb-4">28. Affiliate & Referral Program</h2>
            <p className="text-muted-foreground">
              If you participate in TapAway's Affiliate & Referral Program, you are subject to our 
              <a href="/affiliate-terms" className="text-primary hover:underline"> Affiliate & Referral Terms</a> in 
              addition to these Terms. In the event of any conflict between these Terms and the Affiliate & Referral 
              Terms, the more restrictive interpretation shall apply.
            </p>
          </section>

          {/* 29. MODIFICATIONS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">29. Modifications to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time, with or without prior notice. The "Last Updated" 
              date at the top of this page reflects the most recent revision. Your continued use of TapAway after 
              any modifications constitutes acceptance of the updated Terms. You are responsible for reviewing 
              these Terms periodically.
            </p>
          </section>

          {/* 30. SEVERABILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">30. Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be unenforceable or invalid by a court of competent 
              jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and 
              the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          {/* 31. ENTIRE AGREEMENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">31. Entire Agreement</h2>
            <p className="text-muted-foreground">
              These Terms, together with our Privacy Policy, Refund Policy, Acceptable Use Policy, Cookie & Analytics 
              Policy, NFC Product Disclaimer, AI Features Disclaimer, DMCA Policy, Data Processing Addendum, and 
              Affiliate & Referral Terms (where applicable), constitute the entire agreement between you and TapAway 
              regarding the Service and supersede all prior agreements, representations, and understandings.
            </p>
          </section>

          {/* 32. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">32. Contact</h2>
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
