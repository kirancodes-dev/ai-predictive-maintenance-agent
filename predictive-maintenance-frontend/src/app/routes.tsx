import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import InsightsPage from '../pages/InsightsPage';
import MachineDetailPage from '../pages/MachineDetailPage';
import LiveMonitoringPage from '../pages/LiveMonitoringPage';
import HistoryPage from '../pages/HistoryPage';
import MaintenancePage from '../pages/MaintenancePage';
import AlertsPage from '../pages/AlertsPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import AgentDashboardPage from '../pages/AgentDashboardPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/machines/:id"
      element={
        <ProtectedRoute>
          <MachineDetailPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/live"
      element={
        <ProtectedRoute>
          <LiveMonitoringPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/history"
      element={
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/maintenance"
      element={
        <ProtectedRoute>
          <MaintenancePage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/alerts"
      element={
        <ProtectedRoute>
          <AlertsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/reports"
      element={
        <ProtectedRoute>
          <ReportsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/settings"
      element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/insights"
      element={
        <ProtectedRoute>
          <InsightsPage />
        </ProtectedRoute>
      }
    />
    <Route
      path="/agent"
      element={
        <ProtectedRoute>
          <AgentDashboardPage />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AppRoutes;
