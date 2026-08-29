import { BrowserRouter, Navigate, Route, Routes } from 'react';
import { BrowserRouter as Router, Routes as AppRoutes, Route as AppRoute } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';
import Events from './pages/Events';
import Home from './pages/Home';
import Feed from './pages/Feed';
import AssignmentDetail from './pages/AssignmentDetail';
import Login from './pages/Login';
import Leaderboard from './pages/Leaderboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-page">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes>
            <AppRoute path="/login" element={<Login />} />
            <AppRoute
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <AppRoute index element={<Home />} />
              <AppRoute path="feed" element={<Feed />} />
              <AppRoute path="assignment/:assignmentId" element={<AssignmentDetail />} />
              <AppRoute path="leaderboard" element={<Leaderboard />} />
              <AppRoute path="progress" element={<Navigate to="/leaderboard" replace />} />
              <AppRoute path="events" element={<Events />} />
            </AppRoute>
            <AppRoute path="*" element={<Navigate to="/" replace />} />
          </AppRoutes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
