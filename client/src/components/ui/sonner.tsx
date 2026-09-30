import { useThemeMode } from "@/hooks/useThemeMode";
import { AlertTriangle, Check, Info, LoaderCircle, X } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import "./sonner.css";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeMode();

  return (
    <Sonner
      theme={theme}
      className="greenway-toaster"
      position="bottom-right"
      offset={{ bottom: 20, right: 20 }}
      mobileOffset={{ bottom: 16, left: 16, right: 16 }}
      expand
      visibleToasts={3}
      gap={10}
      duration={4200}
      closeButton
      icons={{
        success: <Check aria-hidden="true" />,
        error: <X aria-hidden="true" />,
        warning: <AlertTriangle aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle aria-hidden="true" />,
        close: <X aria-hidden="true" />,
      }}
      toastOptions={{
        classNames: {
          toast: "greenway-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
