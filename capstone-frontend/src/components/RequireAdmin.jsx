import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export default function RequireAdmin({ children }) {
  const hydrated = useHydrated();
  const user = useAuth((s) => s.user);
  const loc = useLocation();

  if (!hydrated) return null;               // wait until Zustand rehydrates
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return children;
}
