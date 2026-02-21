import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const DMCA = () => {
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
        <h1 className="text-4xl font-bold mb-8">DMCA Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Overview</h2>
            <p className="text-muted-foreground">
              TapAway respects the intellectual property rights of others and expects its users to do the same. In
              accordance with the Digital Millennium Copyright Act of 1998 ("DMCA"), 17 U.S.C. § 512, TapAway will
              respond to claims of copyright infringement committed using the TapAway platform. This policy describes
              how to submit a DMCA takedown notice and counter-notification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Designated DMCA Agent</h2>
            <p className="text-muted-foreground mb-4">
              TapAway's designated agent for receiving DMCA takedown notices is:
            </p>
            <p className="text-muted-foreground">
              <strong>Email:</strong> tap@tapaway.co<br />
              <strong>Subject Line:</strong> DMCA Takedown Notice<br />
              <strong>Company:</strong> TapAway
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Filing a Takedown Notice</h2>
            <p className="text-muted-foreground mb-4">
              If you believe that content hosted on TapAway infringes your copyright, you may submit a DMCA takedown
              notice containing the following information, as required by 17 U.S.C. § 512(c)(3):
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf</li>
              <li>Identification of the copyrighted work claimed to have been infringed (or a representative list if multiple works are covered)</li>
              <li>Identification of the material that is claimed to be infringing, including the URL or other specific location on TapAway where the material can be found</li>
              <li>Your contact information, including name, address, telephone number, and email address</li>
              <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law</li>
              <li>A statement, made under penalty of perjury, that the information in the notification is accurate and that you are the copyright owner or are authorized to act on behalf of the copyright owner</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>IMPORTANT:</strong> Knowingly submitting a materially false DMCA notice may subject you to
              liability for damages, including costs and attorneys' fees, under 17 U.S.C. § 512(f).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Counter-Notification</h2>
            <p className="text-muted-foreground mb-4">
              If you believe that content removed (or to which access was disabled) is not infringing, or that you
              have authorization from the copyright owner or the law to use the material, you may submit a
              counter-notification containing:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your physical or electronic signature</li>
              <li>Identification of the material that has been removed or to which access has been disabled, and the location where the material appeared before it was removed</li>
              <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification</li>
              <li>Your name, address, and telephone number</li>
              <li>A statement that you consent to the jurisdiction of the federal district court for the judicial district in which your address is located, or if outside the United States, the Northern District of California, and that you will accept service of process from the person who provided the original DMCA notification</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Upon receipt of a valid counter-notification, TapAway will forward it to the original complainant and
              restore the removed material within 10-14 business days, unless the complainant files a court action
              seeking to restrain the allegedly infringing activity.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Repeat Infringer Policy</h2>
            <p className="text-muted-foreground">
              TapAway maintains a policy of terminating, in appropriate circumstances, the accounts of users who
              are repeat infringers of copyright. If a user receives multiple valid DMCA takedown notices, their
              account may be suspended or permanently terminated at TapAway's sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Good Faith Requirement</h2>
            <p className="text-muted-foreground">
              All DMCA notices and counter-notifications must be submitted in good faith. Abuse of the DMCA process,
              including submitting false or fraudulent notices, is prohibited and may result in legal liability. TapAway
              reserves the right to disregard notices that do not substantially comply with DMCA requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              For DMCA-related inquiries, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DMCA;
