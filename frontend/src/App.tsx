import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AuthCallback from './pages/auth/AuthCallback';
import SetPassword from './pages/auth/SetPassword';
import Onboarding from './pages/onboarding/Onboarding';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import PostsActivity from './pages/dashboard/PostsActivity';
import CommentsActivity from './pages/dashboard/CommentsActivity';
import AutomationSettings from './pages/dashboard/AutomationSettings';
import Settings from './pages/dashboard/Settings';
import Billing from './pages/dashboard/Billing';
import BannedPage from './pages/Banned';
import ExpiredPage from './pages/Expired';
import PricingPage from './pages/PricingPage';
import BillingSuccess from './pages/BillingSuccess';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-dvh min-h-screen bg-[#F6F8FC] flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={400}>
        <Router>
          <div className="relative min-h-dvh min-h-screen w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route
              path="/billing/success"
              element={
                <ProtectedRoute>
                  <BillingSuccess />
                </ProtectedRoute>
              }
            />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />

            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/auth/set-password"
              element={
                <ProtectedRoute>
                  <SetPassword />
                </ProtectedRoute>
              }
            />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="posts/activity" element={<PostsActivity />} />
              <Route path="comments/activity" element={<CommentsActivity />} />
              <Route path="automation" element={<AutomationSettings />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/banned" element={<BannedPage />} />
            <Route path="/expired" element={<ExpiredPage />} />

            {/* Redirect old / typo URLs to canonical routes */}
            <Route path="/Pricing" element={<Navigate to="/pricing" replace />} />
            <Route path="/Pricing&page" element={<Navigate to="/pricing" replace />} />
            <Route path="/terms" element={<Navigate to="/terms-and-conditions" replace />} />
            <Route path="/term-condition" element={<Navigate to="/terms-and-conditions" replace />} />
            <Route path="/term&condition" element={<Navigate to="/terms-and-conditions" replace />} />
            <Route path="/Privacy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/Privacy&policy" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/Refund" element={<Navigate to="/refund-policy" replace />} />
            <Route path="/refund" element={<Navigate to="/refund-policy" replace />} />
            <Route path="/refund&policy" element={<Navigate to="/refund-policy" replace />} />
            <Route path="/billing" element={<Navigate to="/dashboard/billing" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <div className="grain-overlay" />
          <Toaster />
        </div>
      </Router>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
