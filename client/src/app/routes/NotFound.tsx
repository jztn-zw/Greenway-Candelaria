import PageErrorState from "@/components/PageErrorState";
import { webHomePath } from "@/lib/webHomePath";
import useAuthStore from "@/store/authStore";

const NotFound = () => {
  const role = useAuthStore((state) => state.user?.role);
  const homeHref = webHomePath(role);

  return (
    <PageErrorState
      kind="not-found"
      homeHref={homeHref}
      homeLabel={homeHref === "/" ? "Go to home" : "Go to dashboard"}
      fullScreen
    />
  );
};

export default NotFound;
