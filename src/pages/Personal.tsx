import { Link, useSearchParams } from "react-router-dom";
import { LandingNav } from "@/components/landing/LandingNav";
import { PersonalHero } from "@/components/landing/personal/PersonalHero";
import { PersonalHowItWorks } from "@/components/landing/personal/PersonalHowItWorks";
import { PersonalUseCases } from "@/components/landing/personal/PersonalUseCases";
import { PersonalFeatures } from "@/components/landing/personal/PersonalFeatures";
import PersonalShopShowcase from "@/components/landing/personal/PersonalShopShowcase";
import { PersonalFAQ } from "@/components/landing/personal/PersonalFAQ";
import { PersonalFooterCTA } from "@/components/landing/personal/PersonalFooterCTA";
import { FreeTrialPopup } from "@/components/landing/FreeTrialPopup";
import { AffiliateOnboarding } from "@/components/affiliate/AffiliateOnboarding";
import { FoundingBanner } from "@/components/landing/personal/FoundingBanner";
import { FoundingCounter } from "@/components/landing/personal/FoundingCounter";

const Personal = () => {
  const [searchParams] = useSearchParams();
  const affiliateRef = searchParams.get("ref");

  if (affiliateRef) {
    sessionStorage.setItem("tapaway_ref", affiliateRef);
    return <AffiliateOnboarding refCode={affiliateRef} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <LandingNav />

      {/* SEO Title */}
      <title>TapAway Personal Cards — Share Everything with One Tap</title>

      {/* Main Content */}
      <PersonalHero />
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
              <Link to="/business" className="hover:text-background transition-colors">
                For Business
              </Link>
              <a href="/terms" className="hover:text-background transition-colors">
                Terms
              </a>
              <a href="/privacy" className="hover:text-background transition-colors">
                Privacy
              </a>
              <a href="/refund" className="hover:text-background transition-colors">
                Refund
              </a>
              <a href="/cookie-policy" className="hover:text-background transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Free Trial Popup */}
      <FreeTrialPopup />
    </div>
  );
};

export default Personal;
