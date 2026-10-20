import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — wraps a route so only authenticated users with the
 * correct role can access it.
 *
 * Supports:
 *   <ProtectedRoute role="beneficiary"><ProfilePage /></ProtectedRoute>
 *   <ProtectedRoute allowedRoles={["reviewer", "admin"]}><ReviewerQueuePage /></ProtectedRoute>
 */
const ProtectedRoute = ({ children, role, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const validRoles = allowedRoles || (role ? [role] : null);
  if (validRoles && !validRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
