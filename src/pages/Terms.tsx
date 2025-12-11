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
        <p className="text-muted-foreground mb-8">Last Updated: December 7, 2025</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. BINDING AGREEMENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Binding Agreement</h2>
            <p className="text-muted-foreground mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") 
              and TapAway ("Company," "we," "us," or "our"). By accessing, browsing, or using the TapAway website, dashboard, 
              NFC cards, QR codes, Review Hub, AI Coach, mobile applications, APIs, or any other TapAway services 
              (collectively, the "Service"), you acknowledge that you have read, understood, and agree to be bound by these 
              Terms, our Privacy Policy, and our Refund Policy.
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
              <li>You are a business owner or an authorized representative of a legitimate business entity</li>
              <li>You have full legal authority to bind your business to these Terms</li>
              <li>You are not prohibited from using the Service under applicable laws</li>
              <li>Your business operates lawfully in your jurisdiction</li>
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
              <strong>TAPAWAY IS A SOFTWARE TOOL ONLY.</strong> TapAway provides NFC cards, QR codes, a Review Hub, 
              analytics dashboard, and AI-powered features designed to help businesses collect customer reviews. 
              TapAway is a technology platform—nothing more.
            </p>
            <p className="text-muted-foreground mb-4">
              <strong>WE DO NOT GUARANTEE:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Any specific number of reviews</li>
              <li>Any specific star ratings or review content</li>
              <li>Revenue increases, business growth, or customer acquisition</li>
              <li>5-star results or positive reviews</li>
              <li>Platform uptime, availability, or uninterrupted service</li>
              <li>Accuracy of AI-generated content or insights</li>
              <li>Compatibility with all devices, browsers, or operating systems</li>
              <li>Continued operation of third-party platforms (Google, Yelp, Instagram, etc.)</li>
            </ul>
            <p className="text-muted-foreground">
              Any marketing materials, testimonials, case studies, or projections are for illustrative purposes only and 
              do not constitute guarantees. Results vary and depend entirely on factors outside TapAway's control.
            </p>
          </section>

          {/* 4. USER RESPONSIBILITIES & ASSUMPTION OF RISK */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. User Responsibilities & Assumption of Risk</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOU ASSUME ALL RISK</strong> for how TapAway is used in your business. You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Where NFC cards and QR codes are placed in your establishment</li>
              <li>How staff members use, present, or explain TapAway to customers</li>
              <li>All content uploaded to your dashboard (logos, menus, links, etc.)</li>
              <li>Ensuring all review links route to the correct platforms</li>
              <li>Customer interactions and behaviors related to TapAway</li>
              <li>Staff training and compliance with review platform policies</li>
              <li>Physical security and protection of NFC cards from theft or misuse</li>
              <li>Compliance with all local, state, federal, and international laws</li>
            </ul>
            <p className="text-muted-foreground">
              TapAway is not responsible for any staff misconduct, customer complaints, misuse of cards, or any actions 
              taken by third parties using your TapAway materials.
            </p>
          </section>

          {/* 5. PROHIBITED CONDUCT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. Prohibited Conduct — Zero Tolerance Policy</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOU AGREE NOT TO:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Create, solicit, or post fake, fraudulent, or misleading reviews</li>
              <li>Engage in review gating (selectively directing customers based on expected sentiment)</li>
              <li>Offer incentives, discounts, compensation, or rewards in exchange for reviews in violation of 
                  Google, Yelp, or other platform policies</li>
              <li>Violate the terms of service of Google, Yelp, Instagram, Apple Maps, or any other third-party platform</li>
              <li>Use TapAway for any unlawful, fraudulent, or malicious purposes</li>
              <li>Attempt to reverse-engineer, decompile, or exploit TapAway software</li>
              <li>Scrape, harvest, or collect data from TapAway without authorization</li>
              <li>Interfere with or disrupt TapAway's servers, networks, or infrastructure</li>
              <li>Impersonate another person or business</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Resell, sublicense, or redistribute TapAway services without written permission</li>
              <li>Use TapAway to harass, defame, or harm others</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>VIOLATION OF THIS SECTION WILL RESULT IN IMMEDIATE ACCOUNT TERMINATION</strong> without refund, 
              and may result in legal action.
            </p>
          </section>

          {/* 6. ACCOUNT SECURITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. Account Security</h2>
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

          {/* 7. PAYMENT, BILLING & STRIPE */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. Payment, Billing & Stripe</h2>
            <p className="text-muted-foreground mb-4">
              <strong>ALL PAYMENTS ARE PROCESSED BY STRIPE.</strong> TapAway does not store, process, or have access 
              to your full credit card numbers. All billing, payment processing, disputes, chargebacks, and refunds 
              are handled exclusively by Stripe in accordance with their terms of service.
            </p>
            <p className="text-muted-foreground mb-4">By subscribing, you agree to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Automatic Renewal:</strong> Subscriptions automatically renew at the end of each billing 
                  cycle (monthly or yearly) unless canceled before the renewal date</li>
              <li><strong>Valid Payment Method:</strong> You must maintain a valid payment method on file</li>
              <li><strong>Price Changes:</strong> We may change subscription prices with 30 days' notice</li>
              <li><strong>Failed Payments:</strong> If payment fails, we may suspend your account until payment is received</li>
              <li><strong>Taxes:</strong> You are responsible for all applicable taxes</li>
            </ul>
            <p className="text-muted-foreground">
              <strong>NO REFUNDS BY DEFAULT.</strong> Refunds are only issued for verified technical errors on TapAway's 
              end. See our Refund Policy for complete details.
            </p>
          </section>

          {/* 8. PAYOUT POLICY (Sales Rep Agreement) */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. Payout Policy (Sales Representatives)</h2>
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

          {/* 9. SUBSCRIPTION & CANCELLATION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. Subscription & Cancellation</h2>
            <p className="text-muted-foreground mb-4">
              You may cancel your subscription at any time through your Stripe billing portal. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your subscription remains active until the end of the current billing period</li>
              <li>No refunds are provided for unused time in the current period</li>
              <li>You retain access to the dashboard and Review Hub until expiration</li>
              <li>NFC cards will continue to function but may not be supported after expiration</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>CANCELLATION DOES NOT EQUAL REFUND.</strong> Canceling stops future billing only.
            </p>
          </section>

          {/* 10. TERMINATION RIGHTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">10. Termination Rights</h2>
            <p className="text-muted-foreground mb-4">
              <strong>WE RESERVE THE RIGHT</strong> to suspend, restrict, or terminate your account at any time, 
              with or without notice, for any reason, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Violation of these Terms</li>
              <li>Suspected fraudulent activity</li>
              <li>Violation of third-party platform policies</li>
              <li>Non-payment or failed payment</li>
              <li>Abuse of staff or other users</li>
              <li>Legal or regulatory requirements</li>
              <li>At our sole discretion for business reasons</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Upon termination, all licenses granted to you under these Terms immediately terminate. We are not liable 
              for any damages resulting from termination.
            </p>
          </section>

          {/* 11. PHYSICAL PRODUCTS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">11. Physical Products (NFC Cards & QR Codes)</h2>
            <p className="text-muted-foreground mb-4">
              TapAway NFC cards and QR codes are physical products subject to the following:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>NFC cards require NFC-compatible devices to function</li>
              <li>We are not responsible for device incompatibility</li>
              <li>Cards are subject to normal wear and environmental conditions</li>
              <li>Damage, loss, or theft after delivery is your responsibility</li>
              <li>Printed cards are non-refundable once production begins</li>
              <li>Customer input errors (wrong logo, link, quantity) are not refundable</li>
              <li>Shipping delays caused by carriers are not our responsibility</li>
            </ul>
          </section>

          {/* 12. AI COACH DISCLAIMER */}
          <section>
            <h2 className="text-2xl font-bold mb-4">12. AI Coach & AI Features Disclaimer</h2>
            <p className="text-muted-foreground mb-4">
              <strong>AI-GENERATED CONTENT IS FOR INFORMATIONAL PURPOSES ONLY.</strong> TapAway's AI Coach, review 
              reply suggestions, insights, and all AI-powered features are provided as-is without warranty.
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
            </p>
          </section>

          {/* 13. THIRD-PARTY SERVICES */}
          <section>
            <h2 className="text-2xl font-bold mb-4">13. Third-Party Services & APIs</h2>
            <p className="text-muted-foreground mb-4">
              TapAway integrates with third-party services (Google, Yelp, Stripe, hosting providers, etc.) strictly 
              for platform functionality. We are not responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Outages, downtime, or errors of third-party services</li>
              <li>Policy changes by Google, Yelp, or other platforms</li>
              <li>Account suspensions or restrictions imposed by third-party platforms</li>
              <li>Data loss or corruption caused by third-party services</li>
              <li>Actions taken by third parties that affect your business</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Your use of third-party services is governed by their respective terms of service and privacy policies.
            </p>
          </section>

          {/* 14. DATA & PRIVACY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">14. Data & Privacy</h2>
            <p className="text-muted-foreground mb-4">
              By using TapAway, you consent to our collection and processing of data as described in our Privacy Policy. 
              Key points:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>We collect business information, analytics data, and usage data</li>
              <li>We use Lovable Analytics for tracking—not Fathom or other third-party analytics</li>
              <li>We do NOT sell, rent, or share your data with advertisers or data brokers</li>
              <li>Payment information is handled exclusively by Stripe</li>
              <li>Data is retained until you request deletion</li>
              <li>Data deletion requests must be sent to tap@tapaway.co</li>
            </ul>
          </section>

          {/* 15. DATA DELETION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">15. Data Retention & Deletion</h2>
            <p className="text-muted-foreground mb-4">
              <strong>DATA IS NOT AUTOMATICALLY DELETED</strong> when you cancel or stop paying. Your data remains 
              in our systems until you explicitly request deletion.
            </p>
            <p className="text-muted-foreground mb-4">
              To request complete data deletion, you must email <strong>tap@tapaway.co</strong> with the subject 
              line "Data Deletion Request." We will verify your identity before processing the request. Once verified, 
              all data will be permanently deleted within 30 days.
            </p>
          </section>

          {/* 16. INTELLECTUAL PROPERTY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">16. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              TapAway owns all rights, title, and interest in the Service, including but not limited to software, 
              algorithms, designs, branding, trademarks, and proprietary technology.
            </p>
            <p className="text-muted-foreground">
              You retain ownership of content you upload (logos, menus, etc.). By uploading content, you grant 
              TapAway a non-exclusive, royalty-free license to use, display, and process that content for 
              providing the Service. You represent that you have all necessary rights to upload such content.
            </p>
          </section>

          {/* 17. LIMITATION OF LIABILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">17. Limitation of Liability</h2>
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
              <li>Loss of customers or reputation</li>
              <li>Business interruption or downtime</li>
              <li>Data loss or corruption</li>
              <li>Issues caused by Google, Yelp, or other platforms</li>
              <li>NFC/QR code misuse or staff misconduct</li>
              <li>AI-generated content errors or consequences</li>
              <li>Third-party service outages or failures</li>
              <li>Any claim related to review counts, ratings, or outcomes</li>
              <li>International access or compliance issues</li>
            </ul>
            <p className="text-muted-foreground font-semibold">
              MAXIMUM LIABILITY: IN NO EVENT SHALL TAPAWAY'S TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO TAPAWAY 
              IN THE MOST RECENT BILLING CYCLE (MONTHLY OR YEARLY).
            </p>
          </section>

          {/* 18. INDEMNIFICATION */}
          <section>
            <h2 className="text-2xl font-bold mb-4">18. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify, defend, and hold harmless TapAway and its officers, directors, employees, 
              agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, 
              and expenses (including reasonable attorneys' fees) arising from: your use of the Service, violation 
              of these Terms, violation of third-party platform policies, any content you upload, any fraudulent 
              or illegal activity, staff misconduct, customer disputes, or any claim that your use of TapAway 
              caused harm to a third party.
            </p>
          </section>

          {/* 19. ARBITRATION & CLASS ACTION WAIVER */}
          <section>
            <h2 className="text-2xl font-bold mb-4">19. Arbitration & Class Action Waiver</h2>
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
            <p className="text-muted-foreground">
              Arbitration shall take place in the State of California. The arbitrator's decision shall be final 
              and binding. Judgment on the award may be entered in any court of competent jurisdiction.
            </p>
          </section>

          {/* 20. GOVERNING LAW */}
          <section>
            <h2 className="text-2xl font-bold mb-4">20. Governing Law & Jurisdiction</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the State of California, 
              United States, without regard to its conflict of law provisions. Any legal action not subject to 
              arbitration shall be brought exclusively in the state or federal courts located in California.
            </p>
          </section>

          {/* 21. INTERNATIONAL USERS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">21. International Users</h2>
            <p className="text-muted-foreground">
              TapAway is operated from the United States. If you access the Service from outside the United States, 
              you do so at your own risk and are responsible for compliance with local laws. We make no 
              representations that the Service is appropriate or available for use in other locations.
            </p>
          </section>

          {/* 22. MODIFICATIONS */}
          <section>
            <h2 className="text-2xl font-bold mb-4">22. Modifications to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these Terms at any time, with or without prior notice. The "Last Updated" 
              date at the top of this page reflects the most recent revision. Your continued use of TapAway after 
              any modifications constitutes acceptance of the updated Terms. You are responsible for reviewing 
              these Terms periodically.
            </p>
          </section>

          {/* 23. SEVERABILITY */}
          <section>
            <h2 className="text-2xl font-bold mb-4">23. Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is found to be unenforceable or invalid by a court of competent 
              jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and 
              the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          {/* 24. ENTIRE AGREEMENT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">24. Entire Agreement</h2>
            <p className="text-muted-foreground">
              These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement 
              between you and TapAway regarding the Service and supersede all prior agreements, representations, 
              and understandings.
            </p>
          </section>

          {/* 25. CONTACT */}
          <section>
            <h2 className="text-2xl font-bold mb-4">25. Contact</h2>
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