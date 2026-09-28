import AppProviders from "@/app/providers/AppProviders";
import AppRoutes from "@/app/routes/AppRoutes";
import { BrowserRouter } from "react-router-dom";

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </BrowserRouter>
);

export default App;
