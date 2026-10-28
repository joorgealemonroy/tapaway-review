import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Cookie & Analytics Policy | TapAway</title><meta name="description" content="How TapAway uses browser storage for accounts, saved designs, checkout, support, and product analytics." /></Helmet>
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
        <p className="text-muted-foreground mb-8">Tracking description updated: October 20, 2026</p>

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
              TapAway uses browser storage for authentication, security, saved designs and checkout selections, interface preferences, and support abuse prevention. Advertising pixels and persistent returning-visitor analytics identifiers are not enabled.
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
            <h2 className="text-2xl font-bold mb-4">3. Advertising Tracking</h2>
            <p className="text-muted-foreground">Our previous advertising pixels and server advertising reports have been removed. We do not send page, purchase, or renewal events to advertising attribution services. There is no advertising acceptance prompt. Removing an integration does not delete historical information already received by its provider.</p>
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
              First-party reporting supports customer dashboards and product usage insights. Visit identifiers are temporary and held in page memory rather than saved in cookies or browser storage. We do not keep a persistent returning-visitor identifier. Usage and tap events still contain technical information; this is not a claim that all data is anonymous.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Your Choices</h2>
            <p className="text-muted-foreground">You can manage browser storage in your browser settings and contact tap@tapaway.co about privacy requests. Removing saved data may sign you out or clear an unfinished card design. Our AI helper is optional; you can contact our team directly instead.</p>
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
              include saved card designs, checkout selections, theme preferences, dismissal of the seasonal offer, and a support visitor reference used to enforce question limits. They are governed by this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Cookie & Analytics Policy at any time. The "Last Updated" date at the top reflects
              the most recent revision. We will update this page when our use of browser storage changes.
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
