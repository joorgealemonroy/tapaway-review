import { Button } from "@/components/ui/button";
import { openConsentSettings } from "@/lib/consent";
import { PricingSection } from "@/components/landing/PricingSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { Helmet } from "react-helmet-async";
import { HeroSection } from "@/components/landing/HeroSection";
import { DoneForYouSection } from "@/components/landing/DoneForYouSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { DashboardControlSection } from "@/components/landing/DashboardControlSection";

import { RiskReversalSection } from "@/components/landing/RiskReversalSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FooterCTA } from "@/components/landing/FooterCTA";
import { TrialBanner } from "@/components/TrialBanner";
import { LandingNav } from "@/components/landing/LandingNav";


const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>TapAway | Custom NFC Cards & Business Hubs</title>
        <meta name="description" content="Custom NFC and QR cards with your logo, menus, reviews, and business links. Done-for-you setup with a 14-day trial." />
        <link rel="canonical" href="https://tapaway.co" />
        <meta property="og:title" content="TapAway | Custom NFC Cards & Business Hubs" />
        <meta property="og:description" content="Custom NFC and QR cards with your logo, menus, reviews, and business links. Done-for-you setup with a 14-day trial." />
        <meta property="og:url" content="https://tapaway.co" />
        <meta property="og:image" content="https://tapaway.co/logo-og.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content="TapAway | Custom NFC Cards & Business Hubs" />
        <meta name="twitter:description" content="Get more 5-star Google reviews on autopilot with TapAway's NFC cards and smart review tools." />
        <meta name="twitter:image" content="https://tapaway.co/logo-og.png" />
      </Helmet>
      
      {/* Trial Resume Banner */}
      <TrialBanner />
      
      
      {/* Navigation */}
      <LandingNav />


      {/* Main Content */}
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <DoneForYouSection />
      <ComparisonSection />
      <DashboardControlSection />
      
      <RiskReversalSection />
      <FAQSection />
      <FooterCTA />

      {/* Footer */}
      <footer className="py-8 px-4 bg-hero text-hero-foreground/75 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} TapAway. Your business, one tap away.</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm">
              <a href="https://www.tiktok.com/@tapawayco" rel="me" target="_blank" className="hover:text-hero-foreground transition-colors">TikTok</a>
              <a href="https://www.instagram.com/tapawayco" rel="me" target="_blank" className="hover:text-hero-foreground transition-colors">Instagram</a>
              <a href="https://twitter.com/tapawayco" rel="me" target="_blank" className="hover:text-hero-foreground transition-colors">X</a>
              <a href="https://www.youtube.com/@tapawayco" rel="me" target="_blank" className="hover:text-hero-foreground transition-colors">YouTube</a>
              <span className="text-hero-foreground/50">|</span>
              <a href="/support" className="hover:text-hero-foreground transition-colors">Support</a>
               <Button variant="link" onClick={openConsentSettings} className="h-auto p-0 text-hero-foreground/75">Cookie settings</Button>
               <a href="/terms" className="hover:text-hero-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-hero-foreground transition-colors">Privacy Policy</a>
              <a href="/refund" className="hover:text-hero-foreground transition-colors">Refund</a>
              <a href="/cookie-policy" className="hover:text-hero-foreground transition-colors">Cookies</a>
              <a href="/rep/apply" className="hover:text-hero-foreground transition-colors">Sales Partners</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;
