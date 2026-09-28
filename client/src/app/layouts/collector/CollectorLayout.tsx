import CollectorLiveSync from "./CollectorLiveSync";
import { Navigate, Outlet } from "react-router-dom";
import CollectorSidebar from "./CollectorSidebar";
import CollectorTopBar from "./CollectorTopbar";
import CollectorDispatchBubble from "./CollectorDispatchBubble";
import { SidebarProvider } from "@/components/ui/sidebar";
import PageTransition from "@/components/PageTransition";
import useAuthStore from "@/store/authStore";

import { CollectorTrackingProvider } from "@/features/collector/route-map/CollectorTrackingProvider";

const CollectorLayout = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "DRIVER") {
    if (user.role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === "RESIDENT") {
      return <Navigate to="/resident" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return (
    <CollectorTrackingProvider key={user.id}>
    <SidebarProvider>
      <CollectorLiveSync />
      <div className="min-h-screen flex w-full">
        <CollectorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CollectorTopBar />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
        <CollectorDispatchBubble key={user.id} />
      </div>
    </SidebarProvider>
    </CollectorTrackingProvider>
  );
};

export default CollectorLayout;
