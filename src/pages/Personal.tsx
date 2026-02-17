import { Link } from "react-router-dom";
import { LandingNav } from "@/components/landing/LandingNav";
import { PersonalHero } from "@/components/landing/personal/PersonalHero";
import { PersonalHowItWorks } from "@/components/landing/personal/PersonalHowItWorks";
import { PersonalUseCases } from "@/components/landing/personal/PersonalUseCases";
import { PersonalFAQ } from "@/components/landing/personal/PersonalFAQ";
import { PersonalFooterCTA } from "@/components/landing/personal/PersonalFooterCTA";
import { FreeTrialPopup } from "@/components/landing/FreeTrialPopup";

const Personal = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <LandingNav />

      {/* SEO Title */}
      <title>TapAway Personal Cards — Share Everything with One Tap</title>

      {/* Main Content */}
      <PersonalHero />
      <PersonalHowItWorks />
      <PersonalUseCases />
      <PersonalFAQ />
      <PersonalFooterCTA />

      {/* Footer */}
      <footer className="py-8 px-4 bg-foreground text-background/60 border-t border-background/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2025 TapAway. Share everything with one tap.</p>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/business" className="hover:text-background transition-colors">
                For Business
              </Link>
              <a href="/terms" className="hover:text-background transition-colors">
                Terms
              </a>
              <a href="/privacy" className="hover:text-background transition-colors">
                Privacy
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
