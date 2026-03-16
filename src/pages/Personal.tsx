import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { LandingNav } from "@/components/landing/LandingNav";
import { PersonalHero } from "@/components/landing/personal/PersonalHero";
import { PersonalHowItWorks } from "@/components/landing/personal/PersonalHowItWorks";
import { PersonalUseCases } from "@/components/landing/personal/PersonalUseCases";
import { PersonalFeatures } from "@/components/landing/personal/PersonalFeatures";
import PersonalShopShowcase from "@/components/landing/personal/PersonalShopShowcase";
import { PersonalFAQ } from "@/components/landing/personal/PersonalFAQ";
import { PersonalFooterCTA } from "@/components/landing/personal/PersonalFooterCTA";

import { AffiliateOnboarding } from "@/components/affiliate/AffiliateOnboarding";
import { FoundingBanner } from "@/components/landing/personal/FoundingBanner";
import { FoundingCounter } from "@/components/landing/personal/FoundingCounter";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "TapAway",
  "url": "https://tapaway.co",
  "logo": "https://tapaway.co/favicon.png",
  "sameAs": [
    "https://www.tiktok.com/@tapawayco",
    "https://www.instagram.com/tapawayco",
    "https://twitter.com/tapawayco",
    "https://www.youtube.com/@tapawayco"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "url": "https://tapaway.co/support"
  }
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "TapAway",
  "url": "https://tapaway.co",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://tapaway.co/{username}",
    "query-input": "required name=username"
  }
};

const Personal = () => {
  const [searchParams] = useSearchParams();
  const affiliateRef = searchParams.get("ref");

  if (affiliateRef) {
    sessionStorage.setItem("tapaway_ref", affiliateRef);
    return <AffiliateOnboarding refCode={affiliateRef} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>TapAway | All Your Links, One Tap Away</title>
        <meta name="description" content="The ultimate digital business card and link-sharing platform. Connect with one tap using TapAway." />
        <link rel="canonical" href="https://tapaway.co/" />
        <meta property="og:title" content="TapAway | All Your Links, One Tap Away" />
        <meta property="og:description" content="The ultimate digital business card and link-sharing platform. Connect with one tap using TapAway." />
        <meta property="og:url" content="https://tapaway.co/" />
        <meta property="og:image" content="https://tapaway.co/logo-og.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="TapAway | All Your Links, One Tap Away" />
        <meta name="twitter:description" content="The ultimate digital business card and link-sharing platform. Connect with one tap using TapAway." />
        <meta name="twitter:image" content="https://tapaway.co/logo-og.png" />
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      </Helmet>

      {/* Founding Creator Banner */}
      <FoundingBanner />

      {/* Navigation */}
      <LandingNav />

      {/* Main Content */}
      <PersonalHero />
      <FoundingCounter />
      <PersonalHowItWorks />
      <PersonalFeatures />
      <PersonalShopShowcase />
      <PersonalUseCases />
      <PersonalFAQ />
      <PersonalFooterCTA />

      {/* Footer */}
      <footer className="py-8 px-4 bg-foreground text-background/60 border-t border-background/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2025 TapAway. Share everything with one tap.</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
              <a href="https://www.tiktok.com/@tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">TikTok</a>
              <a href="https://www.instagram.com/tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">Instagram</a>
              <a href="https://twitter.com/tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">X</a>
              <a href="https://www.youtube.com/@tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">YouTube</a>
              <span className="text-background/30">|</span>
              <Link to="/business" className="hover:text-background transition-colors">For Business</Link>
              <a href="/terms" className="hover:text-background transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-background transition-colors">Privacy</a>
              <a href="/refund" className="hover:text-background transition-colors">Refund</a>
              <a href="/cookie-policy" className="hover:text-background transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Personal;
