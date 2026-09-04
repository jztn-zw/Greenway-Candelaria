import { Navigate, Outlet } from "react-router-dom";
import CollectorSidebar from "./CollectorSidebar";
import CollectorTopBar from "./CollectorTopbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import PageTransition from "@/components/PageTransition";
import authService from "@/services/authService";

const CollectorLayout = () => {
  const user = authService.getCurrentUser();

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
    <SidebarProvider>
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
      </div>
    </SidebarProvider>
  );
};

export default CollectorLayout;
