import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Critical routes - loaded immediately
import Index from "./pages/Index";
import Personal from "./pages/Personal";
import UsernameResolver from "./pages/UsernameResolver";
import NotFound from "./pages/NotFound";

// Auth routes - relatively lightweight
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
const MagicLinkVerify = lazy(() => import("./pages/auth/MagicLinkVerify"));

// Personal TapAway - code split for fast public profile loads
const PersonalSignup = lazy(() => import("./pages/personal/PersonalSignup"));
const PersonalSignupComplete = lazy(() => import("./pages/personal/PersonalSignupComplete"));
const PersonalDashboard = lazy(() => import("./pages/personal/PersonalDashboard"));
const PersonalPricing = lazy(() => import("./pages/personal/PersonalPricing"));
const LegacyProfileRedirect = lazy(() => import("./pages/personal/LegacyProfileRedirect"));

// Business routes - lazy loaded
const Demo = lazy(() => import("./pages/Demo"));
const DashboardSelector = lazy(() => import("./pages/DashboardSelector"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Paywall = lazy(() => import("./pages/Paywall"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReviewHub = lazy(() => import("./pages/ReviewHub"));
const Admin = lazy(() => import("./pages/Admin"));

// Legal pages - rarely visited
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refund = lazy(() => import("./pages/Refund"));
const Support = lazy(() => import("./pages/Support"));

// Sales Rep Portal - lazy loaded
const RepHome = lazy(() => import("./pages/rep/RepHome"));
const RepRestaurants = lazy(() => import("./pages/rep/RepRestaurants"));
const RepClose = lazy(() => import("./pages/rep/RepClose"));
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
const AffiliateDashboard = lazy(() => import("./pages/affiliate/AffiliateDashboard"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/business" element={<Index />} />
                <Route path="/personal" element={<Personal />} />
                <Route path="/personal/signup" element={<PersonalSignup />} />
                <Route path="/personal/signup/complete" element={<PersonalSignupComplete />} />
                <Route path="/personal/dashboard" element={<PersonalDashboard />} />
                <Route path="/personal/pricing" element={<PersonalPricing />} />
                <Route path="/personal/order" element={<Navigate to="/personal/signup" replace />} />
                <Route path="/demo" element={<Demo />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/magic" element={<MagicLinkVerify />} />
                <Route path="/select-dashboard" element={<DashboardSelector />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/onboarding-start" element={<Navigate to="/onboarding?source=stripe" replace />} />
                <Route path="/onboarding/start" element={<Navigate to="/onboarding?source=stripe" replace />} />
                <Route path="/start" element={<Navigate to="/onboarding" replace />} />
                <Route path="/paywall" element={<Paywall />} />
                <Route path="/trial-confirmed" element={<Navigate to="/onboarding?source=stripe" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/support" element={<Support />} />
                
                {/* Sales Rep Portal */}
                <Route path="/rep" element={<RepHome />} />
                <Route path="/rep/restaurants" element={<RepRestaurants />} />
                <Route path="/rep/close" element={<RepClose />} />
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
                
                <Route path="/affiliate" element={<AffiliateDashboard />} />
                
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
);

export default App;
