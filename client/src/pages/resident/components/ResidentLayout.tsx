import { Outlet } from "react-router-dom";
import ResidentSidebar from "./ResidentSidebar";
import ResidentTopBar from "./ResidentTopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import PageTransition from "@/components/PageTransition";

const ResidentLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
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
