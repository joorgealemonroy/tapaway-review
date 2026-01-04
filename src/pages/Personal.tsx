import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { ProductNavToggle } from "@/components/landing/ProductNavToggle";
import { PersonalHero } from "@/components/landing/personal/PersonalHero";
import { PersonalHowItWorks } from "@/components/landing/personal/PersonalHowItWorks";
import { PersonalUseCases } from "@/components/landing/personal/PersonalUseCases";
import { PersonalFAQ } from "@/components/landing/personal/PersonalFAQ";
import { PersonalFooterCTA } from "@/components/landing/personal/PersonalFooterCTA";

const Personal = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
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
            {user ? (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/personal/signup"
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                Get Your Card
              </Link>
            )}
          </div>
        </div>
      </nav>

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
              <Link to="/" className="hover:text-background transition-colors">
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
    </div>
  );
};

export default Personal;
