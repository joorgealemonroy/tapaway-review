import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/landing/HeroSection";
import { DoneForYouSection } from "@/components/landing/DoneForYouSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { QRComparisonSection } from "@/components/landing/QRComparisonSection";
import { HowItWorksNew } from "@/components/landing/HowItWorksNew";
import { ProofSection } from "@/components/landing/ProofSection";
import { RiskReversalSection } from "@/components/landing/RiskReversalSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FooterCTA } from "@/components/landing/FooterCTA";
import { TrialBanner } from "@/components/TrialBanner";
import { LandingNav } from "@/components/landing/LandingNav";
import { FreeTrialPopup } from "@/components/landing/FreeTrialPopup";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>TapAway for Business — Generate 5-Star Google Reviews Instantly</title>
        <meta name="description" content="Transform your customer experience. Use TapAway to capture more 5-star reviews and grow your business reputation on autopilot." />
        <link rel="canonical" href="https://tapaway.co/business" />
        <meta property="og:title" content="TapAway for Business — Generate 5-Star Google Reviews Instantly" />
        <meta property="og:description" content="Transform your customer experience. Use TapAway to capture more 5-star reviews and grow your business reputation on autopilot." />
        <meta property="og:url" content="https://tapaway.co/business" />
        <meta property="og:image" content="https://tapaway.co/logo-og.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="TapAway for Business — Generate 5-Star Google Reviews Instantly" />
        <meta name="twitter:description" content="Transform your customer experience. Use TapAway to capture more 5-star reviews and grow your business reputation on autopilot." />
        <meta name="twitter:image" content="https://tapaway.co/logo-og.png" />
      </Helmet>
      
      {/* Trial Resume Banner */}
      <TrialBanner />
      
      {/* Navigation */}
      <LandingNav />

      {/* For Businesses Label */}
      <div className="bg-primary/5 border-b border-primary/10">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            For Businesses
          </span>
        </div>
      </div>

      {/* Main Content */}
      <HeroSection />
      <DoneForYouSection />
      <ComparisonSection />
      <QRComparisonSection />
      
      {/* How It Works with secondary NFC Card appearance */}
      <HowItWorksNew />
      <ProofSection />
      <RiskReversalSection />
      <FAQSection />
      <FooterCTA />

      {/* Footer */}
      <footer className="py-8 px-4 bg-foreground text-background/60 border-t border-background/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2025 TapAway. More 5-star reviews, effortlessly.</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link to="/personal" className="hover:text-background transition-colors">
                Personal Cards
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
              <a href="/rep/apply" className="hover:text-background transition-colors">
                Sales Partners
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

export default Index;
