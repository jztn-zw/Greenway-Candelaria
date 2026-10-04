import { FileText, Eye, Heart, Archive } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import React from "react";
import { Post } from "./types";
import type { AdminPostStats } from "@/services/postsService";

interface PostStatsProps {
  posts: Post[];
  stats?: AdminPostStats | null;
}

const PostStats: React.FC<PostStatsProps> = ({ posts, stats: serverStats }) => {
  const publishedPosts = posts.filter((p) => p.status === "Published");
  const published = serverStats?.published ?? publishedPosts.length;
  const totalViews = serverStats?.totalViews ?? publishedPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalReacts = serverStats?.totalReacts ?? publishedPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
  const archived = serverStats?.archived ?? posts.filter((p) => p.status === "Archived").length;

  const stats = [
    {
      icon: FileText,
      label: "Total Posts",
      value: serverStats?.totalPosts ?? posts.length,
      trend: `${published} published to feed`,
      tone: "neutral" as const,
    },
    {
      icon: Eye,
      label: "Total Views",
      value: totalViews.toLocaleString(),
      trend: "Across all public posts",
      tone: "success" as const,
    },
    {
      icon: Heart,
      label: "Community Reacts",
      value: totalReacts.toLocaleString(),
      trend: "Resident engagement",
      tone: "danger" as const,
    },
    {
      icon: Archive,
      label: "Archived Posts",
      value: archived,
      trend: "Preserved records",
      tone: "neutral" as const,
    },
  ];

  return (
    <AdminKpiGrid>
      {stats.map((kpi) => (
        <AdminKpiCard key={kpi.label} label={kpi.label} value={kpi.value}
          description={kpi.trend} icon={kpi.icon} tone={kpi.tone} />
      ))}
    </AdminKpiGrid>
  );
};

export default PostStats;
