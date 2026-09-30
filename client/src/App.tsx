import AppProviders from "@/app/providers/AppProviders";
import AppRoutes from "@/app/routes/AppRoutes";
import WebPageBoundary from "@/components/WebPageBoundary";
import { BrowserRouter } from "react-router-dom";

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <WebPageBoundary>
      <AppProviders><AppRoutes /></AppProviders>
    </WebPageBoundary>
  </BrowserRouter>
);

export default App;
