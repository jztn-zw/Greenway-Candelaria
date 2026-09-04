import React from "react";
import { FileText, Eye, Heart, Archive } from "lucide-react";
import { Post } from "./types";
import { cn } from "@/lib/utils";

interface PostStatsProps {
  posts: Post[];
}

const PostStats: React.FC<PostStatsProps> = ({ posts }) => {
  const published = posts.filter((p) => p.status === "Published").length;
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalReacts = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const archived = posts.filter((p) => p.status === "Archived").length;

  const stats = [
    {
      label: "Total Posts",
      value: posts.length,
      trend: `${published} published`,
      icon: FileText,
      accent: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      trend: "Across all posts",
      icon: Eye,
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Total Reacts",
      value: totalReacts.toLocaleString(),
      trend: "Community engagement",
      icon: Heart,
      accent: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
    {
      label: "Archived",
      value: archived,
      trend: "Preserved records",
      icon: Archive,
      accent: "bg-muted text-muted-foreground border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {stat.label}
              </span>
              <div
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                  stat.accent
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {stat.value}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {stat.trend}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PostStats;
