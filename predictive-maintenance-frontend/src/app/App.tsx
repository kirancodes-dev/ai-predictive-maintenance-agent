import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuthContext } from '../context/AuthContext';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

const DashboardPage   = lazy(() => import('../pages/DashboardPage'));
const AlertsPage      = lazy(() => import('../pages/AlertsPage'));
const MaintenancePage = lazy(() => import('../pages/MaintenancePage'));
const MonitoringPage  = lazy(() => import('../pages/MonitoringPage'));
const SettingsPage    = lazy(() => import('../pages/SettingsPage'));
const MachineDetailPage = lazy(() => import('../pages/MachineDetailPage'));
const ReportsPage     = lazy(() => import('../pages/ReportsPage'));
const LoginPage       = lazy(() => import('../pages/LoginPage'));
const NotFoundPage    = lazy(() => import('../pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
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
        <main style={{
          flex: 1, padding: '1.75rem 2rem', background: 'var(--color-bg)',
          minHeight: 'calc(100vh - 56px)', overflowY: 'auto',
          color: 'var(--color-text)',
          transition: 'background 0.2s, color 0.2s',
        }}>
          <Suspense fallback={
            <div style={{ padding: '2rem', color: 'var(--color-muted)', fontSize: 14 }}>Loading…</div>
          }>
            <Routes>
              <Route path="/"            element={<DashboardPage />} />
              <Route path="/machines/:id" element={<MachineDetailPage />} />
              <Route path="/monitoring"  element={<MonitoringPage />} />
              <Route path="/alerts"      element={<AlertsPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/reports"     element={<ReportsPage />} />
              <Route path="/settings"    element={<SettingsPage />} />
              <Route path="*"            element={<NotFoundPage />} />
            </Routes>
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
