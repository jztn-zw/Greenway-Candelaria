import { FileText, Eye, Clock, Archive } from "lucide-react";
import { Post } from "./types";

interface PostStatsProps {
  posts: Post[];
}

const PostStats = ({ posts }: PostStatsProps) => {
  const published = posts.filter((p) => p.status === "Published").length;
  const drafts = posts.filter((p) => p.status === "Draft").length;
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
  const archived = posts.filter((p) => p.status === "Archived").length;

  const stats = [
    {
      label: "Total Posts",
      value: posts.length,
      trend: `${published} published`,
      trendUp: true,
      icon: FileText,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Total Views",
      value: totalViews.toLocaleString(),
      trend: "+12.5%",
      trendUp: true,
      icon: Eye,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Drafts",
      value: drafts,
      trend: "Pending review",
      trendUp: false,
      icon: Clock,
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Archived",
      value: archived,
      trend: "Preserved",
      trendUp: false,
      icon: Archive,
      accent: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className="text-2xl font-bold font-display text-foreground mt-2 tabular-nums">{stat.value}</p>
              <p className={`text-[10px] font-medium mt-1.5 ${stat.trendUp ? "text-primary" : "text-muted-foreground"}`}>
                {stat.trend}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.accent}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostStats;
