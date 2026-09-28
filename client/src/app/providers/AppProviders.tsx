import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import useAuthStore from "@/store/authStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, type PropsWithChildren } from "react";

let nextSessionKey = 0;
const createSessionCache = (_token: string | null, _identity: string) => ({ queryClient: new QueryClient(), sessionKey: ++nextSessionKey });

const AppProviders = ({ children }: PropsWithChildren) => {
  const token = useAuthStore((state) => state.token);
  const identity = useAuthStore((state) => `${state.user?.id ?? ""}:${state.user?.role ?? ""}`);
  // Never reuse authenticated query or mutation data across sessions.
  const { queryClient, sessionKey } = useMemo(() => createSessionCache(token, identity), [token, identity]);
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return (
  <QueryClientProvider key={sessionKey} client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {children}
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default AppProviders;
