import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const NFCDisclaimer = () => {
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
        <h1 className="text-4xl font-bold mb-8">Physical NFC Product Disclaimer</h1>
        <p className="text-muted-foreground mb-8">Last Updated: February 21, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. NFC Cards Are Optional</h2>
            <p className="text-muted-foreground">
              TapAway NFC cards are an optional physical product designed to enhance the TapAway experience. Your
              TapAway hub, personal profile, or business page is fully functional without a physical NFC card. All
              profiles can be accessed via direct URL (tapaway.co/username), QR codes, or shared links. Purchasing
              an NFC card is not required to use TapAway's core features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Device Compatibility</h2>
            <p className="text-muted-foreground mb-4">
              <strong>NFC COMPATIBILITY IS NOT GUARANTEED.</strong> NFC functionality depends on the recipient's device
              and its settings. Not all smartphones support NFC, and NFC may be disabled by default on some devices.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Most modern iPhones (iPhone 7 and later) support NFC reading</li>
              <li>Most modern Android devices support NFC, but functionality varies by manufacturer and model</li>
              <li>Some phone cases, particularly thick or metal cases, may interfere with NFC reading</li>
              <li>NFC must be enabled in device settings on some Android devices</li>
              <li>Older devices may not support NFC at all</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              TapAway is not responsible for NFC incompatibility with any specific device, operating system version,
              or configuration. Each TapAway card includes a QR code as a backup that works independently of NFC.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Physical Durability & Lifespan</h2>
            <p className="text-muted-foreground mb-4">
              TapAway NFC cards are manufactured using industry-standard materials. However:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Cards are subject to normal wear and tear from daily use</li>
              <li>Exposure to extreme temperatures, water, bending, or physical force may damage the card or NFC chip</li>
              <li>The NFC chip lifespan may vary depending on usage conditions and environment</li>
              <li>Printing quality may fade over time with exposure to sunlight or abrasion</li>
              <li>TapAway does not warrant any specific lifespan or durability period for physical cards</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>NO WARRANTY ON DURABILITY.</strong> TapAway provides no express or implied warranty on the
              physical durability, longevity, or continued functionality of NFC cards beyond the initial delivery
              inspection period (7 days from delivery).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Shipping & Delivery</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Estimated delivery times are approximate and not guaranteed</li>
              <li>TapAway is not responsible for delays caused by shipping carriers (USPS, FedEx, UPS, DHL, etc.)</li>
              <li>International shipments may be subject to customs delays, duties, or taxes that are your responsibility</li>
              <li>Risk of loss or damage passes to you upon delivery to the carrier</li>
              <li>You are responsible for providing a correct and complete shipping address</li>
              <li>Cards shipped to incorrect addresses due to customer error will not be reshipped at no charge</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Customer Input Responsibility</h2>
            <p className="text-muted-foreground">
              You are solely responsible for all information provided during the card ordering process, including
              but not limited to: logos, branding, profile URLs, usernames, design choices, and quantity. TapAway
              prints cards based on the information you provide. Errors in customer-provided information (typos,
              wrong logos, incorrect links, wrong quantities) are not grounds for refund, replacement, or reprint.
              Please review all order details carefully before confirming.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Lost, Stolen, or Damaged Cards</h2>
            <p className="text-muted-foreground mb-4">
              After delivery, cards are your property and responsibility. TapAway is not liable for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Cards lost after delivery confirmation</li>
              <li>Cards stolen from your possession or location</li>
              <li>Cards damaged through use, mishandling, or environmental factors after delivery</li>
              <li>Unauthorized use of your cards by third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Defective Card Replacement</h2>
            <p className="text-muted-foreground">
              If a card arrives with a manufacturing defect (defective NFC chip that does not function upon arrival,
              significant printing errors not caused by customer input), you may request a replacement by contacting
              <strong> tap@tapaway.co</strong> within 7 days of delivery with photographic evidence. Replacement
              is provided at TapAway's sole discretion and does not constitute a refund. TapAway reserves the right
              to verify all claims before issuing replacements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. QR Code Functionality</h2>
            <p className="text-muted-foreground">
              Each TapAway card includes a QR code that functions independently of NFC technology. QR codes can
              be scanned by any smartphone camera or QR code reader app. The QR code provides the same functionality
              as the NFC tap. QR code functionality depends on the scanning device's camera quality, lighting
              conditions, and QR reader capabilities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Non-Refundable</h2>
            <p className="text-muted-foreground">
              <strong>ALL PHYSICAL NFC CARDS ARE NON-REFUNDABLE</strong> once production has begun. This includes
              cards ordered as part of a subscription, cards ordered separately, and replacement cards. See our
              full Refund Policy for complete details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
            <p className="text-muted-foreground">
              For questions about physical NFC products, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NFCDisclaimer;
