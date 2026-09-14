import { AlertTriangle } from "lucide-react";

interface DuplicateWarningProps {
  barangay: string;
}

const DuplicateWarning = ({ barangay }: DuplicateWarningProps) => {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200">
      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Active Report Found</p>
        <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5 leading-relaxed">
          An active report for this issue type was submitted in <span className="font-semibold">{barangay}</span> within the last 14 days. You can still submit your report if it is a different location, a separate incident, or the issue is ongoing.
        </p>
      </div>
    </div>
  );
};

export default DuplicateWarning;
