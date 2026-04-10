import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Image, Zap, BookOpen, Grid3X3, Handshake, BarChart3, Trophy,
  Newspaper, HelpCircle, Quote, Megaphone, Mail, LayoutTemplate,
  Lock, Pencil, Eye, EyeOff,
} from "lucide-react";
import { LandingSection } from "./types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const iconMap: Record<string, React.ElementType> = {
  Image, Zap, BookOpen, Grid3X3, Handshake, BarChart3, Trophy,
  Newspaper, HelpCircle, Quote, Megaphone, Mail, LayoutTemplate,
};

interface Props {
  sections: LandingSection[];
  selectedSection: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}

const SectionListPanel = ({ sections, selectedSection, onSelect, onToggle }: Props) => {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const visibleCount = sorted.filter((s) => s.visible).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-foreground">Page Sections</h2>
          <Badge variant="secondary" className="text-[10px]">
            {visibleCount}/{sorted.length} visible
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Select a section to edit its content. Toggle visibility to show or hide on the public page.
        </p>
      </div>

      {/* Section list */}
      <div className="bg-card border rounded-xl divide-y divide-border overflow-hidden">
        {sorted.map((section, idx) => {
          const Icon = iconMap[section.icon] || BookOpen;
          const isSelected = selectedSection === section.id;

          return (
            <div
              key={section.id}
              className={`relative flex items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer group ${
                isSelected
                  ? "bg-primary/10"
                  : "hover:bg-primary/5"
              } ${!section.visible ? "opacity-50" : ""}`}
              onClick={() => onSelect(section.id)}
              style={isSelected ? { boxShadow: 'inset 3px 0 0 0 hsl(var(--primary))' } : undefined}
            >
              {/* Order number */}
              <span className={`text-[10px] font-mono w-4 text-center shrink-0 transition-colors duration-200 ${
                isSelected ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-primary/60"
              }`}>
                {idx + 1}
              </span>

              {/* Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                  isSelected ? "bg-primary/10 shadow-sm shadow-primary/10" : "bg-muted group-hover:bg-primary/10"
                }`}
              >
                <Icon className={`w-4 h-4 transition-colors duration-200 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium truncate transition-colors duration-200 ${isSelected ? "text-primary" : "group-hover:text-primary/80"}`}>
                    {section.label}
                  </span>
                  {section.locked && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>This section cannot be hidden</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {section.visible ? (
                    <span className="text-[10px] text-primary flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" /> Visible
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <EyeOff className="w-2.5 h-2.5" /> Hidden
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle + Edit */}
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={section.visible}
                  onCheckedChange={(e) => {
                    e && e; // prevent event bubbling
                    onToggle(section.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  disabled={section.locked}
                  className="data-[state=checked]:bg-primary scale-90"
                />
                <Button
                  size="icon"
                  variant={isSelected ? "default" : "ghost"}
                  className={`h-7 w-7 shrink-0 transition-all duration-200 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(section.id);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionListPanel;
