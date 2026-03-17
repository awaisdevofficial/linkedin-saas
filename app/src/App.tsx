import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Onboarding from './pages/onboarding/Onboarding';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import PostsActivity from './pages/dashboard/PostsActivity';
import CommentsActivity from './pages/dashboard/CommentsActivity';
import AutomationSettings from './pages/dashboard/AutomationSettings';
import Settings from './pages/dashboard/Settings';
import AdminLogin from './pages/admin/AdminLogin';
import AdminPanel from './pages/admin/AdminPanel';

// Auth context for simple state management
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const auth = localStorage.getItem('postpilot_auth');
    if (auth) {
      setUser(JSON.parse(auth));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (userData: any) => {
    localStorage.setItem('postpilot_auth', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('postpilot_auth');
    setUser(null);
    setIsAuthenticated(false);
  };

  return { isAuthenticated, isLoading, user, login, logout };
};

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = localStorage.getItem('postpilot_auth');
  if (!auth) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <div className="relative min-h-screen">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          
          {/* Onboarding */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="posts/activity" element={<PostsActivity />} />
            <Route path="comments/activity" element={<CommentsActivity />} />
            <Route path="automation" element={<AutomationSettings />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPanel />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Grain overlay for texture */}
        <div className="grain-overlay" />
      </div>
    </Router>
  );
}

export default App;
