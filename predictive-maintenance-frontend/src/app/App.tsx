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
  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{
          flex: 1, padding: '2rem', background: 'var(--color-bg)',
          minHeight: 'calc(100vh - 56px)', overflowY: 'auto',
          color: 'var(--color-text)',
          transition: 'background 0.2s, color 0.2s',
        }}>
          <Suspense fallback={<div style={{ padding: '2rem', color: '#888' }}>Loading…</div>}>
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
