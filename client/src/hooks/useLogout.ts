import { toast } from "@/lib/toast";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";

export default function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);

  return async () => {
    // Leave the protected page before clearing auth remounts its route guard.
    flushSync(() => navigate("/", { replace: true }));
    try {
      await logout();
      if (!useAuthStore.getState().token) toast.success("Signed out of this tab");
    } catch (error) {
      toast.error("Could not sign out of this tab. Please try again.");
      throw error;
    }
  };
}
