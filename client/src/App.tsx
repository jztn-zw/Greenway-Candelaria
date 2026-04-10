import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "@/pages/landingpage/Index";
import NotFound from "@/pages/NotFound";
import ResidentLayout from "@/pages/resident/components/ResidentLayout";
import ResidentDashboard from "@/pages/resident/ResidentDashboard";
import ResidentContents from "@/pages/resident/components/residentcontents/ResidentContents";
import ResidentTruckTracking from "@/pages/resident/components/residenttrucktracking/ResidentTruckTracking";
import ResidentSubmitReport from "@/pages/resident/components/residentsubmitreport/ResidentSubmitReport";
import MyReports from "@/pages/resident/components/residentsubmitreport/MyReports";
import ResidentNotifications from "@/pages/resident/components/residentnotifications/ResidentNotifications";
import ResidentProfile from "@/pages/resident/components/residentprofile/ResidentProfile";
import ResidentSettings from "@/pages/resident/components/residentsettings/ResidentSettings";
import ResidentSchedule from "@/pages/resident/components/residentschedule/ResidentSchedule";
import AdminLayout from "@/pages/admin/components/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminPosts from "@/pages/admin/components/posts/AdminPosts";
import AdminAnnouncements from "@/pages/admin/components/announcements/AdminAnnouncements";
import LandingPageManager from "@/pages/admin/components/landingmanager/LandingPageManager";
import AdminCollectionSchedule from "@/pages/admin/components/schedule/AdminCollectionSchedule";
import AdminRouteManager from "@/pages/admin/components/routes/AdminRouteManager";
import AdminResidents from "@/pages/admin/components/residents/AdminResidents";
import AdminDrivers from "@/pages/admin/components/drivers/AdminDrivers";
import AdminAccountManager from "@/pages/admin/components/admins/AdminAccountManager";
import AdminWasteReports from "@/pages/admin/components/reports/AdminWasteReports";
import AdminTruckTracking from "@/pages/admin/components/tracking/AdminTruckTracking";
import AdminPickupPoints from "@/pages/admin/components/pickuppoints/AdminPickupPoints";
import AdminBarangays from "@/pages/admin/components/barangays/AdminBarangays";
import AdminAnalyticsDashboard from "@/pages/admin/components/analytics/AdminAnalyticsDashboard";
import AdminAuditLogs from "@/pages/admin/components/auditlogs/AdminAuditLogs";
import AdminNotifications from "@/pages/admin/components/notifications/AdminNotifications";
import AdminSettings from "@/pages/admin/components/settings/AdminSettings";
import AdminProfile from "@/pages/admin/components/profile/AdminProfile";
import CollectorLayout from "@/pages/collector/components/CollectorLayout";
import CollectorDashboard from "@/pages/collector/CollectorDashboard";
import CollectorRouteMap from "@/pages/collector/components/routemap/CollectorRouteMap";
import CollectorRouteHistory from "@/pages/collector/components/routehistory/CollectorRouteHistory";
import CollectorProfile from "@/pages/collector/components/profile/CollectorProfile";
import CollectorNotifications from "@/pages/collector/components/notifications/CollectorNotifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Index />} />
          <Route
            path="/resident"
            element={
              <ProtectedRoute allowedRoles={["RESIDENT"]}>
                <ResidentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ResidentDashboard />} />
            <Route path="contents" element={<ResidentContents />} />
            <Route path="tracking" element={<ResidentTruckTracking />} />
            <Route path="report" element={<ResidentSubmitReport />} />
            <Route path="my-reports" element={<MyReports />} />
            <Route path="notifications" element={<ResidentNotifications />} />
            <Route path="profile" element={<ResidentProfile />} />
            <Route path="settings" element={<ResidentSettings />} />
            <Route path="schedule" element={<ResidentSchedule />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminWasteReports />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="landing-manager" element={<LandingPageManager />} />
            <Route path="schedule" element={<AdminCollectionSchedule />} />
            <Route path="routes" element={<AdminRouteManager />} />
            <Route path="residents" element={<AdminResidents />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="admins" element={<AdminAccountManager />} />
            <Route path="tracking" element={<AdminTruckTracking />} />
            <Route path="pickup-points" element={<AdminPickupPoints />} />
            <Route path="barangays" element={<AdminBarangays />} />
            <Route path="analytics" element={<AdminAnalyticsDashboard />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>
          <Route
            path="/collector"
            element={
              <ProtectedRoute allowedRoles={["DRIVER"]}>
                <CollectorLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CollectorDashboard />} />
            <Route path="route-map" element={<CollectorRouteMap />} />
            <Route path="route-history" element={<CollectorRouteHistory />} />
            <Route path="notifications" element={<CollectorNotifications />} />
            <Route path="profile" element={<CollectorProfile />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
