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
import { TrialBanner } from "@/components/TrialBanner";
import { ProductNavToggle } from "@/components/landing/ProductNavToggle";

const Index = () => {
  const { user } = useAuth();
  const { isSalesRep } = useSalesRep();

  // Determine dashboard link based on role
  const dashboardLink = isSalesRep ? "/rep" : "/dashboard";

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Title */}
      <title>TapAway for Businesses — Get More 5-Star Google Reviews</title>
      
      {/* Trial Resume Banner */}
      <TrialBanner />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-6">
              <a href="https://tapaway.co" className="font-black text-xl tracking-tight text-foreground">
                TapAway
              </a>
              <ProductNavToggle />
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/personal"
                className="hidden sm:inline-flex px-4 py-2 rounded-lg font-medium text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Personal Cards
              </Link>
              {user ? (
                <Link
                  to={dashboardLink}
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/start"
                  className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  Start Free Trial
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

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
            <div className="flex items-center gap-4 text-sm">
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