import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "@/app/layouts/admin/AdminLayout";
import CollectorLayout from "@/app/layouts/collector/CollectorLayout";
import ResidentLayout from "@/app/layouts/resident/ResidentLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminAnalyticsDashboard from "@/features/admin/analytics/AdminAnalyticsDashboard";
import AdminAnnouncements from "@/features/admin/announcements/AdminAnnouncements";
import AdminAuditLogs from "@/features/admin/audit-logs/AdminAuditLogs";
import AdminDashboard from "@/features/admin/dashboard/AdminDashboard";
import AdminDrivers from "@/features/admin/drivers/AdminDrivers";
import AdminNotifications from "@/features/admin/notifications/AdminNotifications";
import AdminPosts from "@/features/admin/posts/AdminPosts";
import AdminProfile from "@/features/admin/profile/AdminProfile";
import AdminResidents from "@/features/admin/residents/AdminResidents";
import AdminRouteManager from "@/features/admin/route-manager/AdminRouteManager";
import AdminWasteReports from "@/features/admin/reports/AdminWasteReports";
import AdminCollectionSchedule from "@/features/admin/schedule/AdminCollectionSchedule";
import AdminSettings from "@/features/admin/settings/AdminSettings";
import AdminTruckTracking from "@/features/admin/truck-tracking/AdminTruckTracking";
import CollectorDashboard from "@/features/collector/dashboard/CollectorDashboard";
import CollectorNotifications from "@/features/collector/notifications/CollectorNotifications";
import CollectorProfile from "@/features/collector/profile/CollectorProfile";
import CollectorRouteHistory from "@/features/collector/route-history/CollectorRouteHistory";
import CollectorRouteMap from "@/features/collector/route-map/CollectorRouteMap";
import LandingPage from "@/features/landing/LandingPage";
import ResidentContents from "@/features/resident/content/ResidentContents";
import ResidentDashboard from "@/features/resident/dashboard/ResidentDashboard";
import ResidentNotifications from "@/features/resident/notifications/ResidentNotifications";
import ResidentProfile from "@/features/resident/profile/ResidentProfile";
import ResidentSchedule from "@/features/resident/schedule/ResidentSchedule";
import ResidentSettings from "@/features/resident/settings/ResidentSettings";
import ResidentTruckTracking from "@/features/resident/truck-tracking/ResidentTruckTracking";
import MyReports from "@/features/resident/waste-reporting/MyReports";
import ResidentSubmitReport from "@/features/resident/waste-reporting/ResidentSubmitReport";
import NotFound from "./NotFound";

const AppRoutes = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage />} />
      <Route path="/resident" element={<ProtectedRoute allowedRoles={["RESIDENT"]}><ResidentLayout /></ProtectedRoute>}>
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
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["ADMIN"]}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="reports" element={<AdminWasteReports />} />
        <Route path="posts" element={<AdminPosts />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="schedule" element={<AdminCollectionSchedule />} />
        <Route path="routes" element={<AdminRouteManager />} />
        <Route path="residents" element={<AdminResidents />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="tracking" element={<AdminTruckTracking />} />
        <Route path="analytics" element={<AdminAnalyticsDashboard />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
      <Route path="/collector" element={<ProtectedRoute allowedRoles={["DRIVER"]}><CollectorLayout /></ProtectedRoute>}>
        <Route index element={<CollectorDashboard />} />
        <Route path="route-map" element={<CollectorRouteMap />} />
        <Route path="route-history" element={<CollectorRouteHistory />} />
        <Route path="notifications" element={<CollectorNotifications />} />
        <Route path="profile" element={<CollectorProfile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
