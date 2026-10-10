import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";

export default function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);

  return () => {
    // Leave the protected page before clearing auth remounts its route guard.
    flushSync(() => navigate("/", { replace: true }));
    return logout();
  };
}
