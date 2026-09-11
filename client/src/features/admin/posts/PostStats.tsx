import React from "react";
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
      trend: `${published} published to feed`,
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      trend: "Across all public posts",
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Community Reacts",
      value: totalReacts.toLocaleString(),
      trend: "Resident engagement",
      tag: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    },
    {
      label: "Archived Posts",
      value: archived,
      trend: "Preserved records",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {stats.map((stat, idx) => (
        <div
          key={stat.label}
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
            // Mobile (2 columns): right border on even index (0, 2)
            idx % 2 === 0 ? "border-r border-border/70" : "",
            // Desktop (4 columns): right border on 0, 1, 2, none on 3
            idx < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
            // Mobile (2 columns): bottom border on top row (0, 1)
            idx < 2 ? "border-b lg:border-b-0 border-border/70" : ""
          )}
        >
          <div className="flex items-center min-h-[22px]">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                stat.tag
              )}
            >
              {stat.label}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight tabular-nums">
            {stat.value}
          </div>

          <div className="text-[11px] text-muted-foreground font-medium truncate">
            {stat.trend}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostStats;
