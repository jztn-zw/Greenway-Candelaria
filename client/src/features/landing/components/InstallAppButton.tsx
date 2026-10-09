import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InstallAppButton({ className }: { className?: string }) {
  const apkDownloadUrl = import.meta.env.VITE_RESIDENT_APK_URL?.trim();

  return apkDownloadUrl ? (
    <Button asChild className={className}>
      <a href={apkDownloadUrl} download><Download aria-hidden="true" />Install GreenWay App</a>
    </Button>
  ) : (
    <Button variant="secondary" disabled className={className}>
      <Download aria-hidden="true" />Install GreenWay App
    </Button>
  );
}
