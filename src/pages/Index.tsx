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
import { OfferBanner } from "@/components/OfferBanner";
import { LandingNav } from "@/components/landing/LandingNav";


const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>TapAway | Smart NFC Cards & Review Tools for Businesses</title>
        <meta name="description" content="Get more 5-star Google reviews on autopilot with TapAway's NFC cards and smart review tools. Built for restaurants, salons, and local businesses." />
        <link rel="canonical" href="https://tapaway.co" />
        <meta property="og:title" content="TapAway | Smart NFC Cards & Review Tools for Businesses" />
        <meta property="og:description" content="Get more 5-star Google reviews on autopilot with TapAway's NFC cards and smart review tools. Built for restaurants, salons, and local businesses." />
        <meta property="og:url" content="https://tapaway.co" />
        <meta property="og:image" content="https://tapaway.co/logo-og.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="TapAway | Smart NFC Cards & Review Tools for Businesses" />
        <meta name="twitter:description" content="Get more 5-star Google reviews on autopilot with TapAway's NFC cards and smart review tools." />
        <meta name="twitter:image" content="https://tapaway.co/logo-og.png" />
      </Helmet>
      
      {/* Trial Resume Banner */}
      <TrialBanner />
      <OfferBanner />
      
      
      {/* Navigation */}
      <LandingNav />


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
            <p className="text-sm">© {new Date().getFullYear()} TapAway. More 5-star reviews, effortlessly.</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
              <a href="https://www.tiktok.com/@tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">TikTok</a>
              <a href="https://www.instagram.com/tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">Instagram</a>
              <a href="https://twitter.com/tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">X</a>
              <a href="https://www.youtube.com/@tapawayco" rel="me" target="_blank" className="hover:text-background transition-colors">YouTube</a>
              <span className="text-background/30">|</span>
              <a href="/terms" className="hover:text-background transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-background transition-colors">Privacy Policy</a>
              <a href="/refund" className="hover:text-background transition-colors">Refund</a>
              <a href="/cookie-policy" className="hover:text-background transition-colors">Cookies</a>
              <a href="/rep/apply" className="hover:text-background transition-colors">Sales Partners</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;
