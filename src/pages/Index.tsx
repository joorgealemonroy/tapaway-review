import { useAuth } from "@/hooks/useAuth";
import { useSalesRep } from "@/hooks/useSalesRep";
import { Link } from "react-router-dom";
import { HeroSection } from "@/components/landing/HeroSection";
import { DoneForYouSection } from "@/components/landing/DoneForYouSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { QRComparisonSection } from "@/components/landing/QRComparisonSection";
import { HowItWorksNew } from "@/components/landing/HowItWorksNew";
import { ProofSection } from "@/components/landing/ProofSection";
import { RiskReversalSection } from "@/components/landing/RiskReversalSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FooterCTA } from "@/components/landing/FooterCTA";
import TapAwayCard3D from "@/components/TapAwayCard3D";
import { TrialBanner } from "@/components/TrialBanner";

const Index = () => {
  const { user } = useAuth();
  const { isSalesRep } = useSalesRep();

  // Determine dashboard link based on role
  const dashboardLink = isSalesRep ? "/rep" : "/dashboard";

  return (
    <div className="min-h-screen bg-white">
      {/* Trial Resume Banner */}
      <TrialBanner />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <a href="https://tapaway.co" className="font-black text-xl tracking-tight text-foreground">
              TapAway
            </a>
            {user ? (
              <Link
                to={dashboardLink}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/paywall"
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Start Free Trial
              </Link>
            )}
          </div>
        </div>
      </nav>

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
            <div className="flex items-center gap-4 text-sm">
              <a href="/terms" className="hover:text-background transition-colors">
                Terms
              </a>
              <a href="/privacy" className="hover:text-background transition-colors">
                Privacy
              </a>
              <a href="/refund" className="hover:text-background transition-colors">
                Refund
              </a>
              <a href="/rep/apply" className="hover:text-background transition-colors">
                Sales Partners
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;