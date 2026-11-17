import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@clinic/shared';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PatientAppointmentsPage } from './pages/patient/AppointmentsPage';
import { PatientReportsPage } from './pages/patient/ReportsPage';
import { PatientReportDetailPage } from './pages/patient/ReportDetailPage';
import { StaffSchedulePage } from './pages/staff/SchedulePage';
import { StaffPatientsPage } from './pages/staff/PatientsPage';
import { StaffReportsPage } from './pages/staff/ReportsPage';
import { StaffReportEditorPage } from './pages/staff/ReportEditorPage';

const queryClient = new QueryClient();

function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Carregando...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === UserRole.STAFF ? '/staff/schedule' : '/patient/appointments'}
        replace
      />
    );
  }
  return <Layout>{children}</Layout>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Navigate
      to={user.role === UserRole.STAFF ? '/staff/schedule' : '/patient/appointments'}
      replace
    />
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/patient/appointments"
              element={
                <RequireRole role={UserRole.PATIENT}>
                  <PatientAppointmentsPage />
                </RequireRole>
              }
            />
            <Route
              path="/patient/reports"
              element={
                <RequireRole role={UserRole.PATIENT}>
                  <PatientReportsPage />
                </RequireRole>
              }
            />
            <Route
              path="/patient/reports/:id"
              element={
                <RequireRole role={UserRole.PATIENT}>
                  <PatientReportDetailPage />
                </RequireRole>
              }
            />

            <Route
              path="/staff/schedule"
              element={
                <RequireRole role={UserRole.STAFF}>
                  <StaffSchedulePage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/patients"
              element={
                <RequireRole role={UserRole.STAFF}>
                  <StaffPatientsPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/reports"
              element={
                <RequireRole role={UserRole.STAFF}>
                  <StaffReportsPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/reports/new/:appointmentId"
              element={
                <RequireRole role={UserRole.STAFF}>
                  <StaffReportEditorPage />
                </RequireRole>
              }
            />
            <Route
              path="/staff/reports/:id"
              element={
                <RequireRole role={UserRole.STAFF}>
                  <StaffReportEditorPage />
                </RequireRole>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
