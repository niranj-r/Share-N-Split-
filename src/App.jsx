import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import TopNav from './components/TopNav';
import LoadingSpinner from './components/LoadingSpinner';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BudgetsPage from './pages/BudgetsPage';
import TripsPage from './pages/TripsPage';
import ExpensesPage from './pages/ExpensesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GroupsPage from './pages/GroupsPage';
import SettingsPage from './pages/SettingsPage';
import ScanBillPage from './pages/ScanBillPage';
import BillDetailsPage from './pages/BillDetailsPage';

// Animated page wrapper
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Protected route wrapper — renders layout + sidebar + mobile navs
function AppShell({ theme, toggleTheme }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <Sidebar />

      {/* Mobile Navs (hidden on desktop via CSS) */}
      <TopNav />
      <MobileNav />

      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/dashboard" element={<PageWrapper><DashboardPage /></PageWrapper>} />
            <Route path="/budgets" element={<PageWrapper><BudgetsPage /></PageWrapper>} />
            <Route path="/trips" element={<PageWrapper><TripsPage /></PageWrapper>} />
            <Route path="/expenses" element={<PageWrapper><ExpensesPage /></PageWrapper>} />
            <Route path="/analytics" element={<PageWrapper><AnalyticsPage /></PageWrapper>} />
            <Route path="/groups" element={<PageWrapper><GroupsPage /></PageWrapper>} />
            <Route path="/settings" element={<PageWrapper><SettingsPage theme={theme} toggleTheme={toggleTheme} /></PageWrapper>} />
            <Route path="/scan" element={<PageWrapper><ScanBillPage /></PageWrapper>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Public route — redirect to dashboard if logged in
function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes({ theme, toggleTheme }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PublicRoute><PageWrapper><LoginPage /></PageWrapper></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><PageWrapper><RegisterPage /></PageWrapper></PublicRoute>} />
        <Route path="/bill/:id" element={<PageWrapper><BillDetailsPage /></PageWrapper>} />
        <Route path="/*" element={<AppShell theme={theme} toggleTheme={toggleTheme} />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('sharensplit-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sharensplit-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes theme={theme} toggleTheme={toggleTheme} />
      </BrowserRouter>
    </AuthProvider>
  );
}
