import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RequestsPage from "./pages/RequestsPage";
import ReviewerQueuePage from "./pages/ReviewerQueuePage";
import ReviewerDetailPage from "./pages/ReviewerDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Beneficiary Portal */}
        <Route
          path="/portal/profile"
          element={
            <ProtectedRoute allowedRoles={["beneficiary", "reviewer", "admin"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/requests"
          element={
            <ProtectedRoute allowedRoles={["beneficiary", "reviewer", "admin"]}>
              <RequestsPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Reviewer Portal (Member 3) */}
        <Route
          path="/reviewer/queue"
          element={
            <ProtectedRoute allowedRoles={["reviewer", "admin"]}>
              <ReviewerQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/requests/:id"
          element={
            <ProtectedRoute allowedRoles={["reviewer", "admin"]}>
              <ReviewerDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Admin Console (Member 4) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Unauthorized page */}
        <Route
          path="/unauthorized"
          element={
            <div style={{ color: "#fff", textAlign: "center", padding: "4rem", background: "#0f172a", minHeight: "100vh" }}>
              <h1>🚫 403 — Access Denied</h1>
              <p style={{ color: "#64748b" }}>You don't have permission to view this page.</p>
              <a href="/login" style={{ color: "#38bdf8" }}>← Back to Login</a>
            </div>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
