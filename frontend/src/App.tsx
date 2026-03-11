import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Signup from './pages/auth/Signup';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import CreatePassword from './pages/auth/CreatePassword';
import AuthCallback from './pages/auth/AuthCallback';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import PostsLayout from './pages/dashboard/posts/PostsLayout';
import PostsActivity from './pages/dashboard/posts/PostsActivity';
import PostsSettings from './pages/dashboard/posts/PostsSettings';
import CommentsLayout from './pages/dashboard/comments/CommentsLayout';
import CommentsActivity from './pages/dashboard/comments/CommentsActivity';
import CommentsSettings from './pages/dashboard/comments/CommentsSettings';
import Settings from './pages/dashboard/Settings';
import Onboarding from './pages/Onboarding';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/create-password" element={<CreatePassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Onboarding - Protected */}
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* Dashboard Routes - Protected */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="posts" element={<PostsLayout />}>
            <Route index element={<Navigate to="activity" replace />} />
            <Route path="activity" element={<PostsActivity />} />
            <Route path="settings" element={<PostsSettings />} />
          </Route>
          <Route path="comments" element={<CommentsLayout />}>
            <Route index element={<Navigate to="activity" replace />} />
            <Route path="activity" element={<CommentsActivity />} />
            <Route path="settings" element={<CommentsSettings />} />
          </Route>
          <Route path="settings" element={<Settings />} />
          <Route path="schedule" element={<Navigate to="/dashboard/posts/settings" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
