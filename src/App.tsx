import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { Suspense, useEffect } from "react";
import { lazyWithRetry as lazy, clearChunkReloadGuard } from "@/lib/lazyWithRetry";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RepImpersonationOverlay } from "@/components/rep/RepImpersonationOverlay";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";

// Critical routes - loaded immediately
import Index from "./pages/Index";
import UsernameResolver from "./pages/UsernameResolver";
import CardResolver from "./pages/CardResolver";
import NotFound from "./pages/NotFound";

// Auth routes - lazy loaded (not needed on landing page)
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MagicLinkVerify = lazy(() => import("./pages/auth/MagicLinkVerify"));

// Personal TapAway - code split (Business Lite dashboard still used internally)
const ImportProfile = lazy(() => import("./pages/personal/ImportProfile"));
const PersonalDashboard = lazy(() => import("./pages/personal/PersonalDashboard"));
const LegacyProfileRedirect = lazy(() => import("./pages/personal/LegacyProfileRedirect"));

// Business routes - lazy loaded
const Demo = lazy(() => import("./pages/Demo"));

const Onboarding = lazy(() => import("./pages/Onboarding"));
const OnboardingSuccess = lazy(() => import("./pages/OnboardingSuccess"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReviewHub = lazy(() => import("./pages/ReviewHub"));
const RepCheckoutSuccess = lazy(() => import("./pages/RepCheckoutSuccess"));
const Admin = lazy(() => import("./pages/Admin"));

// Legal pages - rarely visited
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const Support = lazy(() => import("./pages/Support"));
const AcceptableUse = lazy(() => import("./pages/AcceptableUse"));
const AffiliateTerms = lazy(() => import("./pages/AffiliateTerms"));
const NFCDisclaimer = lazy(() => import("./pages/NFCDisclaimer"));
const AIDisclaimer = lazy(() => import("./pages/AIDisclaimer"));
const DMCA = lazy(() => import("./pages/DMCA"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const DPA = lazy(() => import("./pages/DPA"));

// Sales Rep Portal - lazy loaded
const RepHome = lazy(() => import("./pages/rep/RepHome"));
const RepRestaurants = lazy(() => import("./pages/rep/RepBusinesses"));
// RepClose REMOVED 2026-09-09 (locked): the rep only creates demos, Jorge closes.
const RepDemoCreate = lazy(() => import("./pages/rep/RepDemoCreate"));
const RepCommissions = lazy(() => import("./pages/rep/RepCommissions"));
const RepResources = lazy(() => import("./pages/rep/RepResources"));
const RepDocs = lazy(() => import("./pages/rep/RepDocs"));
const RepProfile = lazy(() => import("./pages/rep/RepProfile"));
const RepApply = lazy(() => import("./pages/rep/RepApply"));
const RepSetupPassword = lazy(() => import("./pages/rep/RepSetupPassword"));

// Admin Rep Management - lazy loaded
const AdminReps = lazy(() => import("./pages/admin/AdminReps"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminCompSettings = lazy(() => import("./pages/admin/AdminCompSettings"));
const AdminTaxReview = lazy(() => import("./pages/admin/AdminTaxReview"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminDemoRequests = lazy(() => import("./pages/admin/AdminDemoRequests"));
const AdminPersonalAccounts = lazy(() => import("./pages/admin/AdminPersonalAccounts"));
const AdminAffiliates = lazy(() => import("./pages/admin/AdminAffiliates"));
const AdminCards = lazy(() => import("./pages/admin/AdminCards"));
const AdminFounders = lazy(() => import("./pages/admin/AdminFounders"));
const AdminSmsSubscribers = lazy(() => import("./pages/admin/AdminSmsSubscribers"));
const AdminHubHealth = lazy(() => import("./pages/admin/AdminHubHealth"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminPrintQueue = lazy(() => import("./pages/admin/AdminPrintQueue"));
const AdminFulfillment = lazy(() => import("./pages/admin/AdminFulfillment"));
const AdminErrors = lazy(() => import("./pages/admin/AdminErrors"));
const AdminLocations = lazy(() => import("./pages/admin/AdminLocations"));
const VanVisit = lazy(() => import("./pages/admin/VanVisit"));
const AdminDiscounts = lazy(() => import("./pages/admin/AdminDiscounts"));
const AdminCustomPlans = lazy(() => import("./pages/admin/AdminCustomPlans"));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails"));
const VanSuccess = lazy(() => import("./pages/VanSuccess"));
const AffiliateDashboard = lazy(() => import("./pages/affiliate/AffiliateDashboard"));
const Examples = lazy(() => import("./pages/Examples"));
const Compliance = lazy(() => import("./pages/Compliance"));
const SmsSignup = lazy(() => import("./pages/SmsSignup"));
const ClaimHubPage = lazy(() => import("./pages/ClaimHubPage"));
const Paywall = lazy(() => import("./pages/Paywall"));


// Minimal loading spinner
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

// /start is the NFC tap-to-claim entry point — forward the query string
// (e.g. ?card=CODE) to /onboarding so the card claim flow survives the redirect.
function StartRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/onboarding${search}`} replace />;
}

const App = () => {
  // A successful boot means the current bundle loaded — release the one-shot
  // reload guard so a future deploy can reload again if needed.
  useEffect(() => {
    clearChunkReloadGuard();
  }, []);

  return (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <RepImpersonationOverlay />
              <SiteAnalytics />
              <Routes>

              <Route path="/" element={<Index />} />
                <Route path="/business" element={<Navigate to="/" replace />} />
                {/* /personal/* routes redirect — namespace deprecated */}
                <Route path="/personal" element={<Navigate to="/" replace />} />
                <Route path="/personal/vibe" element={<Navigate to="/" replace />} />
                <Route path="/personal/signup" element={<Navigate to="/" replace />} />
                <Route path="/personal/signup/complete" element={<Navigate to="/" replace />} />
                <Route path="/personal/pricing" element={<Navigate to="/" replace />} />
                <Route path="/personal/order" element={<Navigate to="/" replace />} />
                <Route path="/personal/dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/import" element={<ImportProfile />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/magic" element={<MagicLinkVerify />} />
                <Route path="/select-dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding-success" element={<OnboardingSuccess />} />
                <Route path="/van-success" element={<VanSuccess />} />
                <Route path="/onboarding-start" element={<Navigate to="/onboarding?source=stripe" replace />} />
                <Route path="/onboarding/start" element={<Navigate to="/onboarding?source=stripe" replace />} />
                <Route path="/start" element={<StartRedirect />} />
                <Route path="/paywall" element={<Paywall />} />
                <Route path="/trial-confirmed" element={<Navigate to="/onboarding?source=stripe" replace />} />
                <Route path="/claim" element={<ClaimHubPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/support" element={<Support />} />
                <Route path="/acceptable-use" element={<AcceptableUse />} />
                <Route path="/affiliate-terms" element={<AffiliateTerms />} />
                <Route path="/nfc-disclaimer" element={<NFCDisclaimer />} />
                <Route path="/ai-disclaimer" element={<AIDisclaimer />} />
                <Route path="/dmca" element={<DMCA />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/dpa" element={<DPA />} />
                
                {/* Sales Rep Portal */}
                <Route path="/rep" element={<RepHome />} />
                <Route path="/rep/restaurants" element={<RepRestaurants />} />
                {/* /rep/close removed 2026-09-09 (locked): rep creates demos, Jorge closes */}
                <Route path="/rep/demo/new" element={<RepDemoCreate />} />
                <Route path="/rep/demo/:id" element={<RepDemoCreate />} />
                <Route path="/rep/commissions" element={<RepCommissions />} />
                <Route path="/rep/resources" element={<RepResources />} />
                <Route path="/rep/docs" element={<RepDocs />} />
                <Route path="/rep/profile" element={<RepProfile />} />
                <Route path="/rep/apply" element={<RepApply />} />
                <Route path="/rep/setup-password" element={<RepSetupPassword />} />
                
                {/* Admin Rep Management */}
                <Route path="/admin/reps" element={<AdminReps />} />
                <Route path="/admin/commissions" element={<AdminCommissions />} />
                <Route path="/admin/settings/comp" element={<AdminCompSettings />} />
                <Route path="/admin/tax-review" element={<AdminTaxReview />} />
                <Route path="/admin/payouts" element={<AdminPayouts />} />
                <Route path="/admin/demo-requests" element={<AdminDemoRequests />} />
                <Route path="/admin/personal-accounts" element={<AdminPersonalAccounts />} />
                <Route path="/admin/affiliates" element={<AdminAffiliates />} />
                <Route path="/admin/cards" element={<AdminCards />} />
                <Route path="/admin/founders" element={<AdminFounders />} />
                <Route path="/admin/sms-subscribers" element={<AdminSmsSubscribers />} />
                <Route path="/admin/hub-health" element={<AdminHubHealth />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/print-queue" element={<AdminPrintQueue />} />
                <Route path="/admin/fulfillment" element={<AdminFulfillment />} />
                <Route path="/admin/errors" element={<AdminErrors />} />
                <Route path="/admin/locations" element={<AdminLocations />} />
                <Route path="/admin/van" element={<VanVisit />} />
                <Route path="/admin/discounts" element={<AdminDiscounts />} />
                <Route path="/admin/custom-plans" element={<AdminCustomPlans />} />
                <Route path="/admin/emails" element={<AdminEmails />} />
                
                <Route path="/affiliate" element={<AffiliateDashboard />} />
                <Route path="/rep-checkout-success" element={<RepCheckoutSuccess />} />
                <Route path="/examples" element={<Examples />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/sms-signup" element={<SmsSignup />} />
                
                {/* NFC Card Activation */}
                <Route path="/c/:publicCode" element={<CardResolver />} />
                
                <Route path="/hub/:restaurantId" element={<ReviewHub />} />
                
                {/* Legacy Personal Profile URL - 301 redirect to /:username */}
                <Route path="/u/:username" element={<LegacyProfileRedirect />} />
                
                {/* Dynamic username/slug resolver - handles both personal profiles and restaurant slugs */}
                <Route path="/:slug" element={<UsernameResolver />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
