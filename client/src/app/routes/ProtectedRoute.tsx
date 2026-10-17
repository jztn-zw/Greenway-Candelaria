import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const { hasHydrated, user, isLoading, ensureSession } = useAuthStore();
  const [isVerified, setIsVerified] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    let active = true;

    const validate = async () => {
      const ok = await ensureSession();
      if (!active) return;
      setIsAllowed(ok);
      setIsVerified(true);
    };

    void validate();

    return () => {
      active = false;
    };
  }, [ensureSession, hasHydrated]);

  if (!hasHydrated || isLoading || !isVerified) {
    return null;
  }

  if (!isAllowed || !user) {
    const post = location.pathname === "/resident/contents" ? new URLSearchParams(location.search).get("post") : null;
    if (post) return <Navigate to={`/login?post=${encodeURIComponent(post)}`} replace />;
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === "DRIVER") {
      return <Navigate to="/collector" replace />;
    }
    return <Navigate to="/resident" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
