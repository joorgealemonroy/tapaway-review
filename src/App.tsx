import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Demo from "./pages/Demo";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Paywall from "./pages/Paywall";
import TrialConfirmed from "./pages/TrialConfirmed";
import Dashboard from "./pages/Dashboard";
import ReviewHub from "./pages/ReviewHub";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";

// Sales Rep Portal
import RepHome from "./pages/rep/RepHome";
import RepRestaurants from "./pages/rep/RepRestaurants";
import RepClose from "./pages/rep/RepClose";
import RepCommissions from "./pages/rep/RepCommissions";
import RepResources from "./pages/rep/RepResources";
import RepDocs from "./pages/rep/RepDocs";
import RepProfile from "./pages/rep/RepProfile";
import RepApply from "./pages/rep/RepApply";
import RepSetupPassword from "./pages/rep/RepSetupPassword";

// Admin Rep Management
import AdminReps from "./pages/admin/AdminReps";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminCompSettings from "./pages/admin/AdminCompSettings";
import AdminTaxReview from "./pages/admin/AdminTaxReview";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminDemoRequests from "./pages/admin/AdminDemoRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/paywall" element={<Paywall />} />
            <Route path="/trial-confirmed" element={<TrialConfirmed />} />
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
            
            <Route path="/hub/:restaurantId" element={<ReviewHub />} />
            <Route path="/:customSlug" element={<ReviewHub />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
