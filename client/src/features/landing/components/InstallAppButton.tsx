import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function InstallAppButton({ className }: { className?: string }) {
  const apkDownloadUrl = import.meta.env.VITE_RESIDENT_APK_URL?.trim() || `${import.meta.env.BASE_URL}downloads/greenway-candelaria.apk`;

  return (
    <Button asChild variant="default" className={cn("android-download-button gap-3 px-6", className)}>
      <a href={apkDownloadUrl} download="GreenWay-Candelaria.apk" aria-label="Download GreenWay for Android">
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
          <path d="m6.5 9-2-3.5m13 3.5 2-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path fill="currentColor" fillRule="evenodd" d="M3 17a9 9 0 0 1 18 0H3Zm5-4a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" />
        </svg>
        Android
      </a>
    </Button>
  );
}
