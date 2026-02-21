import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const DPA = () => {
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
        <h1 className="text-4xl font-bold mb-8">Data Processing Addendum</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              This Data Processing Addendum ("DPA") supplements the TapAway Terms of Service and Privacy Policy.
              It applies to the processing of personal data by TapAway on behalf of business users ("Controller")
              who use TapAway's platform to collect, manage, or display data related to their customers or contacts.
              This DPA is incorporated into and forms part of the agreement between you and TapAway.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>"Controller"</strong> means the entity (you, the business user) that determines the purposes and means of processing personal data</li>
              <li><strong>"Processor"</strong> means TapAway, which processes personal data on behalf of the Controller</li>
              <li><strong>"Sub-processor"</strong> means a third party engaged by TapAway to process personal data</li>
              <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person</li>
              <li><strong>"Processing"</strong> means any operation performed on personal data, including collection, storage, use, disclosure, and deletion</li>
              <li><strong>"Data Subject"</strong> means the individual to whom personal data relates</li>
              <li><strong>"Applicable Data Protection Laws"</strong> means all applicable laws relating to the processing of personal data, including GDPR, CCPA, and other relevant regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Scope of Processing</h2>
            <p className="text-muted-foreground mb-4">
              TapAway processes personal data on behalf of business users for the following purposes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Hosting and displaying business profiles, hubs, and review pages</li>
              <li>Collecting and displaying analytics events (taps, clicks, views)</li>
              <li>Processing email lead captures submitted through personal profiles</li>
              <li>Generating AI-powered insights and recommendations from business data</li>
              <li>Providing dashboard access and reporting</li>
              <li>Managing NFC card destinations and redirects</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              TapAway processes personal data only as instructed by the Controller and as necessary to provide
              the services described in the Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. TapAway's Obligations as Processor</h2>
            <p className="text-muted-foreground mb-4">TapAway shall:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process personal data only on documented instructions from the Controller, unless required by law</li>
              <li>Ensure that persons authorized to process personal data have committed to confidentiality</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Not engage another processor (sub-processor) without prior authorization from the Controller</li>
              <li>Assist the Controller in responding to data subject requests</li>
              <li>Assist the Controller in ensuring compliance with data protection obligations</li>
              <li>Delete or return all personal data upon termination of services, at the Controller's choice</li>
              <li>Make available to the Controller all information necessary to demonstrate compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Security Measures</h2>
            <p className="text-muted-foreground mb-4">
              TapAway implements and maintains the following security measures:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Encryption of data in transit using TLS/HTTPS</li>
              <li>Encryption of data at rest for sensitive information</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular security monitoring and vulnerability assessment</li>
              <li>Secure cloud infrastructure with industry-standard protections</li>
              <li>Incident response procedures</li>
              <li>Employee confidentiality obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Sub-processors</h2>
            <p className="text-muted-foreground mb-4">
              TapAway currently engages the following sub-processors:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Stripe, Inc.</strong> — Payment processing, subscription management, billing (San Francisco, CA, USA)</li>
              <li><strong>Cloud hosting provider</strong> — Database hosting, authentication, file storage (United States)</li>
              <li><strong>Resend</strong> — Transactional email delivery (United States)</li>
              <li><strong>AI model providers</strong> — AI-powered feature processing (United States)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              TapAway will notify the Controller of any intended changes to the list of sub-processors, giving the
              Controller the opportunity to object to such changes. If the Controller objects and TapAway cannot
              reasonably accommodate the objection, either party may terminate the affected services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data Breach Notification</h2>
            <p className="text-muted-foreground">
              TapAway will notify the Controller without undue delay (and in any event within 72 hours) after
              becoming aware of a personal data breach that is likely to result in a risk to the rights and freedoms
              of data subjects. The notification will include: the nature of the breach, the categories and
              approximate number of data subjects affected, the likely consequences, and the measures taken or
              proposed to address the breach.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Data Subject Requests</h2>
            <p className="text-muted-foreground">
              TapAway will assist the Controller in fulfilling data subject requests (access, rectification, erasure,
              portability, restriction, and objection) by providing appropriate technical and organizational measures.
              If TapAway receives a data subject request directly, TapAway will promptly redirect the request to the
              Controller unless legally required to respond directly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Data Deletion</h2>
            <p className="text-muted-foreground">
              Upon termination of services or upon the Controller's written request, TapAway will delete all personal
              data processed on behalf of the Controller within 30 days, unless retention is required by applicable
              law. TapAway will confirm deletion in writing upon request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Audit Rights</h2>
            <p className="text-muted-foreground">
              TapAway will make available to the Controller information reasonably necessary to demonstrate compliance
              with this DPA. Upon reasonable written request (no more than once per 12-month period), TapAway will
              allow and contribute to audits, including inspections, conducted by the Controller or an independent
              auditor mandated by the Controller. Such audits shall be conducted during normal business hours, with
              reasonable advance notice, and shall not unreasonably disrupt TapAway's operations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. International Data Transfers</h2>
            <p className="text-muted-foreground">
              TapAway is based in the United States. Personal data may be transferred to and processed in the
              United States. For transfers of personal data from the European Economic Area (EEA), United Kingdom,
              or Switzerland to the United States, TapAway relies on Standard Contractual Clauses (SCCs) as approved
              by the European Commission, or other legally recognized transfer mechanisms. By using TapAway, the
              Controller acknowledges and consents to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Liability</h2>
            <p className="text-muted-foreground">
              Each party's liability under this DPA is subject to the limitations of liability set forth in the
              TapAway Terms of Service. Nothing in this DPA limits or excludes either party's liability to data
              subjects or data protection authorities under applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Duration & Termination</h2>
            <p className="text-muted-foreground">
              This DPA remains in effect for as long as TapAway processes personal data on behalf of the Controller.
              Upon termination of the underlying services agreement, TapAway will comply with the data deletion
              obligations set forth in Section 9.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Contact</h2>
            <p className="text-muted-foreground">
              For questions about this Data Processing Addendum, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DPA;
