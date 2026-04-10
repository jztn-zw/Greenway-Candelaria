import { cn } from "@/lib/utils";
import { BarChart3, Building2, FileText, Users, Truck } from "lucide-react";

const sections = [
  { id: "collection-performance", label: "Collection", icon: BarChart3 },
  { id: "barangay-compliance", label: "Barangays", icon: Building2 },
  { id: "waste-reports", label: "Reports", icon: FileText },
  { id: "resident-engagement", label: "Residents", icon: Users },
  { id: "truck-driver", label: "Trucks", icon: Truck },
];

interface Props {
  activeSection: string;
  onSectionChange: (id: string) => void;
}

const AnalyticsSectionNav = ({ activeSection, onSectionChange }: Props) => {
  return (
    <>
      {/* Desktop horizontal tab bar */}
      <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border">
        {sections.map((s) => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSectionChange(s.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                active
                  ? "bg-card text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <s.icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Mobile horizontal scroll tabs */}
      <div className="md:hidden overflow-x-auto -mx-2 px-2 pb-1">
        <div className="flex gap-1.5 min-w-max bg-muted/50 rounded-xl p-1 border border-border">
          {sections.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onSectionChange(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-card text-primary shadow-sm border border-border"
                    : "text-muted-foreground"
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export { sections };
export default AnalyticsSectionNav;
