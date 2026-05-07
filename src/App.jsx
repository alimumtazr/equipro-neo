import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell.jsx";
import RoleGuard from "./components/RoleGuard.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Catalog from "./pages/student/Catalog.jsx";
import MyRequests from "./pages/student/MyRequests.jsx";
import StudentRequestDetail from "./pages/student/RequestDetail.jsx";
import Dashboard from "./pages/manager/Dashboard.jsx";
import ManagerRequestDetail from "./pages/manager/RequestDetail.jsx";
import ReturnWizard from "./pages/manager/ReturnWizard.jsx";
import Maintenance from "./pages/manager/Maintenance.jsx";

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center font-display font-bold text-neo-muted">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route element={<RoleGuard role="student" />}>
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/my-requests" element={<MyRequests />} />
          <Route path="/requests/:id" element={<StudentRequestDetail />} />
        </Route>
        <Route element={<RoleGuard role="manager" />}>
          <Route path="/manager" element={<Dashboard />} />
          <Route path="/manager/inventory" element={<Catalog />} />
          <Route path="/manager/requests/:id" element={<ManagerRequestDetail />} />
          <Route path="/manager/requests/:id/return" element={<ReturnWizard />} />
          <Route path="/manager/maintenance" element={<Maintenance />} />
        </Route>
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "manager" ? "/manager" : "/catalog"} replace />;
}
