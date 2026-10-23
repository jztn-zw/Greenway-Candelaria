import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function IosDownloadButton({ className }: { className?: string }) {
  return (
    <Button type="button" variant="outline" disabled className={cn("h-11 gap-2 px-4", className)} aria-label="iOS download not available">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" />
        <path d="m8 15.5 5-8m3 8L11 8m-5 4h10" fill="none" stroke="hsl(var(--background))" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="flex flex-col items-start leading-tight">
        <span>iOS</span>
        <span className="text-[10px] font-normal">Not available</span>
      </span>
    </Button>
  );
}
