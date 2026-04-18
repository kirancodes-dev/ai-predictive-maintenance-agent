import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuthContext } from '../context/AuthContext';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import PageTransition from '../components/common/PageTransition';
import CommandPalette from '../components/common/CommandPalette';
import KeyboardShortcuts from '../components/common/KeyboardShortcuts';
import { Skeleton } from '../components/common/Skeleton';

const DashboardPage       = lazy(() => import('../pages/DashboardPage'));
const AlertsPage          = lazy(() => import('../pages/AlertsPage'));
const MaintenancePage     = lazy(() => import('../pages/MaintenancePage'));
const MonitoringPage      = lazy(() => import('../pages/MonitoringPage'));
const SettingsPage        = lazy(() => import('../pages/SettingsPage'));
const MachineDetailPage   = lazy(() => import('../pages/MachineDetailPage'));
const ReportsPage         = lazy(() => import('../pages/ReportsPage'));
const LoginPage           = lazy(() => import('../pages/LoginPage'));
const NotFoundPage        = lazy(() => import('../pages/NotFoundPage'));
const AgentDashboardPage  = lazy(() => import('../pages/AgentDashboardPage'));
const LiveMonitoringPage  = lazy(() => import('../pages/LiveMonitoringPage'));
const HistoryPage         = lazy(() => import('../pages/HistoryPage'));
const InsightsPage        = lazy(() => import('../pages/InsightsPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const location = useLocation();
  if (isLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 14,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', animation: 'pulse 1.5s infinite',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </div>
        Loading…
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Header />
        <CommandPalette />
        <KeyboardShortcuts />
        <main style={{
          flex: 1, padding: '1.75rem 2rem', background: 'var(--color-bg)',
          minHeight: 'calc(100vh - 56px)', overflowY: 'auto',
          color: 'var(--color-text)',
          transition: 'background 0.2s, color 0.2s',
        }}>
          <Suspense fallback={
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Skeleton width={200} height={22} />
              <Skeleton width={360} height={13} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16, marginTop: 8 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Skeleton width={110} height={14} /><Skeleton width={60} height={22} borderRadius={20} />
                    </div>
                    <Skeleton width={160} height={11} />
                    <Skeleton width="100%" height={8} borderRadius={4} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[0,1,2,3].map(j => <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Skeleton width="60%" height={9} /><Skeleton width="80%" height={16} /></div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Routes location={location}>
                  <Route path="/"            element={<DashboardPage />} />
                  <Route path="/agent"       element={<AgentDashboardPage />} />
                  <Route path="/machines/:id" element={<MachineDetailPage />} />
                  <Route path="/live"         element={<LiveMonitoringPage />} />
                  <Route path="/history"      element={<HistoryPage />} />
                  <Route path="/monitoring"  element={<MonitoringPage />} />
                  <Route path="/alerts"      element={<AlertsPage />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/reports"     element={<ReportsPage />} />
                  <Route path="/insights"    element={<InsightsPage />} />
                  <Route path="/settings"    element={<SettingsPage />} />
                  <Route path="*"            element={<NotFoundPage />} />
                </Routes>
              </PageTransition>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster position="top-right" />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*"     element={<ProtectedLayout />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
