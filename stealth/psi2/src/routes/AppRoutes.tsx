import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const DashboardView = lazy(() => import("../features/dashboard/DashboardView"));
const PatientsView = lazy(() => import("../features/patients/PatientsView"));
const PatientDetailView = lazy(
  () => import("../features/patients/PatientDetailView"),
);
const FinancesView = lazy(() => import("../features/finances/FinancesView"));
const ChatView = lazy(() => import("../features/chat/ChatView"));
const SettingsView = lazy(() => import("../features/settings/SettingsView"));
const LoginView = lazy(() => import("../features/auth/LoginView"));

export default function AppRoutes() {
  // Simple auth check (replace with real auth later)
  const isLoggedIn = true; // ← you can use a real auth store/context here

  if (!isLoggedIn) {
    return <LoginView />;
  }

  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando...</div>}>
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/patients" element={<PatientsView />} />
        <Route path="/patients/:id" element={<PatientDetailView />} />
        <Route path="/finances" element={<FinancesView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
}
