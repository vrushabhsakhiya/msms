import { Navigate, useLocation } from "react-router-dom";

/**
 * Route guard implementing spec §2 User Roles & Permissions.
 * - Not logged in → redirect to login /
 * - Wrong role → redirect to /access-denied (shows what they can access)
 * - Correct role → render children
 */
function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role")?.toLowerCase();
  const location = useLocation();

  // 1. Not authenticated → go to login
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. No role stored (corrupted session) → force re-login
  if (!role) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }

  // 3. Role-based guard (spec §2 + §15)
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Dashboard is always allowed as fallback landing for all roles
    if (location.pathname === "/dashboard") {
      return children;
    }
    return <Navigate to="/access-denied" state={{ attempted: location.pathname }} replace />;
  }

  return children;
}

export default PrivateRoute;
