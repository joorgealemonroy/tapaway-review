import { openConsentSettings } from "@/lib/consent";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const CookiePolicy = () => {
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
        <h1 className="text-4xl font-bold mb-8">Cookie & Analytics Policy</h1>
        <p className="text-muted-foreground mb-8">Tracking description updated: October 14, 2026</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground">
              Cookies are small text files placed on your device by websites you visit. They are widely used to make
              websites work efficiently, remember your preferences, and provide information to website owners. TapAway
              uses cookies and similar technologies (such as local storage) to operate the platform securely and
              reliably.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Types of Cookies We Use</h2>
            <p className="text-muted-foreground mb-4">
              TapAway uses necessary authentication and security storage, saved signup selections, preferences, and optional tracking. Optional Meta, Trybe, and returning-visitor analytics identifiers are enabled only after explicit acceptance.
            </p>

            <h3 className="text-xl font-semibold mb-2">Authentication & Session Cookies</h3>
            <p className="text-muted-foreground mb-4">
              These cookies are essential for logging you in, maintaining your session, and keeping you authenticated
              as you navigate the platform. Without these cookies, you would need to log in on every page.
            </p>

            <h3 className="text-xl font-semibold mb-2">UI Preference Cookies</h3>
            <p className="text-muted-foreground mb-4">
              These cookies remember your interface preferences, such as theme selection (light/dark mode), sidebar
              state, and other UI settings. They enhance your experience by remembering your choices.
            </p>

            <h3 className="text-xl font-semibold mb-2">Security Cookies</h3>
            <p className="text-muted-foreground">
              These cookies support security features, including fraud prevention, session integrity verification,
              and protection against cross-site request forgery (CSRF).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Optional Meta and Trybe Tracking</h2>
            <p className="text-muted-foreground">After you accept, Meta (Facebook and Instagram) receives browser page and event information for advertising measurement, optimization, and retargeting. Trybe receives browser and referral information for creator attribution. These providers may use cookies or similar identifiers under their own policies. Trybe automatic tracking is disabled in our configuration.</p>
            <p className="mt-4 text-muted-foreground">The browser stores your choice with a visitor-specific reference, timestamp, notice version, and notice text. A declined choice retains the preceding acceptance notice for context. Legacy or absent choices prompt a new decision. Blocked storage fails closed for optional tracking.</p>
            <p className="mt-4 text-muted-foreground">Server advertising and order attribution reports are disabled in this source revision because current, revocable server consent evidence is not available. Checkout contact information and a saved visitor ID are not permission to send those reports.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Analytics Tracking</h2>
            <p className="text-muted-foreground mb-4">
              TapAway collects analytics data through <strong>first-party tracking</strong> stored directly in our
              database. This is not cookie-based third-party analytics. The analytics data we collect includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>NFC card tap events and device/session information</li>
              <li>QR code scan events</li>
              <li>Hub page views and button clicks (Google, Yelp, Instagram, Directions)</li>
              <li>Profile page views for personal accounts</li>
              <li>Link clicks on personal profiles</li>
              <li>Dashboard usage activity</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              First-party reporting supports customer dashboards and product usage insights. A returning-visitor identifier is stored only after acceptance and removed from this browser after decline. Usage and tap events can still be recorded without that identifier; this is not a claim that all technical data is anonymous.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Consent Choice</h2>
            <p className="text-muted-foreground">You can accept or decline optional tracking without affecting billing or your hub. Reopen Cookie settings at any time. After decline, new Meta calls and Trybe visitor identifiers stop. If Trybe has already loaded, the page reloads to stop the SDK reliably. Previously sent data cannot be recalled through this setting. Reaccepting enables optional tracking again.</p>
            <Button variant="outline" className="mt-4" onClick={openConsentSettings}>Cookie settings</Button>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Managing Cookies</h2>
            <p className="text-muted-foreground mb-4">
              You can manage or delete cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>View what cookies are stored on your device</li>
              <li>Delete specific cookies or all cookies</li>
              <li>Block cookies from specific websites</li>
              <li>Block all cookies (this may prevent TapAway from functioning properly)</li>
              <li>Set your browser to notify you when cookies are being set</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Please note that disabling or deleting strictly necessary cookies may prevent you from logging in or
              using TapAway's core features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Local Storage & Session Storage</h2>
            <p className="text-muted-foreground">
              In addition to cookies, TapAway may use browser local storage and session storage to store preferences,
              authentication tokens, and temporary data needed for the application to function. These technologies
              include the consent record and, only with acceptance, optional returning-visitor identifiers. They are governed by this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie & Analytics Policy at any time. The "Last Updated" date at the top reflects
              the most recent revision. Material changes to optional tracking are reflected in the notice and consent settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Contact</h2>
            <p className="text-muted-foreground">
              For questions about cookies or analytics, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
