import { Outlet } from "react-router-dom";
import ResidentSidebar from "./ResidentSidebar";
import ResidentTopBar from "./ResidentTopbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import PageTransition from "@/components/motion/PageTransition";

import ResidentLiveSync from "./ResidentLiveSync";
import useAuthStore from "@/store/authStore";
import ResidentSetup from "@/features/resident/profile/ResidentSetup";

const ResidentLayout = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  if (user?.profile_completed === false) return <ResidentSetup key={`${user.id}:${token}`} />;
  return (
    <SidebarProvider mobileBreakpoint={1024}>
      <div className="min-h-screen flex w-full">
        <ResidentLiveSync />
        <ResidentSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <ResidentTopBar />
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

export default ResidentLayout;
