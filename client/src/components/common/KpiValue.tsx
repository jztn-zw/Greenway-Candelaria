import type { ReactNode } from "react";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";

const AnimatedNumber = ({ text }: { text: string }) => {
  const target = Number(text.replace(/,/g, ""));
  const decimals = text.split(".")[1]?.length ?? 0;
  const count = useCountUp(target, 600, true, decimals);
  return <>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
};

// Counts, percentages, ratios and shift durations share one animation.
// Placeholders stay unchanged; screen readers receive the final value.
export default function KpiValue({ value }: { value: ReactNode }) {
  const text = typeof value === "number" ? value.toLocaleString() : typeof value === "string" ? value : null;
  const duration = text?.match(/^(\d+)h (\d+)m$/);
  if (duration) return <span><span className="sr-only">{text}</span><span aria-hidden="true"><AnimatedNumber text={duration[1]} />h <AnimatedNumber text={duration[2]} />m</span></span>;
  const match = text?.match(/^(-?\d+(?:,\d{3})*(?:\.\d+)?)(%|\+|m)?(?:\/(\d+(?:,\d{3})*))?$/);
  if (!match) return <>{value}</>;
  return <span><span className="sr-only">{text}</span><span aria-hidden="true"><AnimatedNumber text={match[1]} />{match[2]}{match[3] !== undefined && <>/{match[3]}</>}</span></span>;
}
