import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const AcceptableUse = () => {
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
        <h1 className="text-4xl font-bold mb-8">Acceptable Use Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Purpose</h2>
            <p className="text-muted-foreground">
              This Acceptable Use Policy ("AUP") governs your use of all TapAway services, including personal profiles,
              business hubs, NFC cards, QR codes, the dashboard, Review Hub, AI Coach, and any content you create, upload,
              or distribute through the platform. This AUP is incorporated into and forms part of the TapAway Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Prohibited Content</h2>
            <p className="text-muted-foreground mb-4">You may not use TapAway to create, host, display, or distribute content that:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Is unlawful, fraudulent, deceptive, or misleading</li>
              <li>Contains or promotes hate speech, discrimination, or harassment based on race, ethnicity, gender, religion, sexual orientation, disability, or any other protected characteristic</li>
              <li>Contains threats of violence, intimidation, or personal attacks</li>
              <li>Contains sexually explicit or pornographic material</li>
              <li>Promotes terrorism, extremism, or violent ideologies</li>
              <li>Contains malware, viruses, trojans, or any malicious code</li>
              <li>Infringes on copyrights, trademarks, patents, or other intellectual property rights of third parties</li>
              <li>Contains personal information of others without their consent (doxxing)</li>
              <li>Promotes illegal drugs, controlled substances, or illegal activities</li>
              <li>Contains spam, phishing attempts, or deceptive links</li>
              <li>Impersonates any person, business, or entity</li>
              <li>Violates any applicable local, state, federal, or international law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Prohibited Conduct</h2>
            <p className="text-muted-foreground mb-4">You may not:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Create multiple accounts to circumvent bans, suspensions, or usage limits</li>
              <li>Use automated tools, bots, scrapers, or scripts to access or interact with TapAway</li>
              <li>Attempt to reverse-engineer, decompile, disassemble, or otherwise derive the source code of TapAway</li>
              <li>Probe, scan, or test the vulnerability of TapAway systems or networks</li>
              <li>Interfere with or disrupt the operation of TapAway or the experience of other users</li>
              <li>Resell, sublicense, or redistribute TapAway services without written authorization</li>
              <li>Use TapAway to send unsolicited communications (spam)</li>
              <li>Harvest or collect user data from TapAway without authorization</li>
              <li>Circumvent or disable any security or access control features</li>
              <li>Engage in identity fraud or impersonation</li>
              <li>Create fake reviews, fake accounts, or fake referrals</li>
              <li>Use TapAway in any manner that could damage, disable, overburden, or impair the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Personal Profile & Business Hub Content</h2>
            <p className="text-muted-foreground mb-4">
              Users who create personal profiles (tapaway.co/username) or business hubs are responsible for all content
              displayed on their pages, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Profile photos, banners, and header images</li>
              <li>Bio text, headlines, and descriptions</li>
              <li>Links, URLs, and embedded content</li>
              <li>Contact information shared publicly</li>
              <li>Menu items, logos, and branding assets</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              TapAway does not pre-screen user content but reserves the right to review, remove, or disable any content
              that violates this AUP, at our sole discretion, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Review Platform Compliance</h2>
            <p className="text-muted-foreground">
              Users must comply with the terms of service of all third-party review platforms accessed through TapAway,
              including Google, Yelp, Instagram, Apple Maps, TripAdvisor, and others. TapAway is not responsible for
              enforcing third-party platform policies but may take action if violations are brought to our attention.
              Specifically, you must not use TapAway to engage in review gating, incentivized reviews, or any practice
              prohibited by these platforms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Enforcement</h2>
            <p className="text-muted-foreground mb-4">
              TapAway reserves the right to take any of the following actions in response to violations of this AUP,
              at our sole discretion:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Warning:</strong> A written notice of the violation with a request to remedy</li>
              <li><strong>Content Removal:</strong> Removal of offending content without prior notice</li>
              <li><strong>Account Suspension:</strong> Temporary suspension of account access</li>
              <li><strong>Account Termination:</strong> Permanent termination of account without refund</li>
              <li><strong>Legal Action:</strong> Referral to law enforcement or initiation of legal proceedings</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              The severity of the enforcement action will be determined by the nature and severity of the violation.
              Repeated violations will result in escalating enforcement measures.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Reporting Violations</h2>
            <p className="text-muted-foreground">
              If you become aware of any content or conduct that violates this AUP, please report it to
              <strong> tap@tapaway.co</strong> with the subject line "AUP Violation Report." Include the URL of the
              offending content, a description of the violation, and any supporting evidence. We will review reports
              promptly and take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Acceptable Use Policy at any time. The "Last Updated" date at the top reflects the
              most recent revision. Continued use of TapAway constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Contact</h2>
            <p className="text-muted-foreground">
              For questions about this Acceptable Use Policy, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AcceptableUse;
