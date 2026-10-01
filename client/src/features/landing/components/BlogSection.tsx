import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { ArrowUpRight, Calendar } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import MobileCarousel from "@/components/MobileCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { BlogContent, CONTENT } from "../landingContent";

export interface LandingBlogPost {
  id: string;
  category: string;
  created_at: string;
  title: string;
}

const catColor: Record<string, string> = {
  Event: getCategoryBadgeColors("Event").className + " border",
  "Waste Tip": getCategoryBadgeColors("Waste Tip").className + " border",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const BlogCard = ({
  post,
}: {
  post: LandingBlogPost;
}) => (
  <article className="group bg-card rounded-xl border border-border/60 overflow-hidden hover:border-primary/30 transition-all duration-300 h-full">
    <div className={`h-28 sm:h-40 lg:h-48 bg-muted/50 flex items-center justify-center`}>
      <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl bg-background/60 flex items-center justify-center">
        <Calendar className="w-5 h-5 sm:w-8 sm:h-8 text-muted-foreground/60" />
      </div>
    </div>
    <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium ${catColor[post.category] ?? "bg-primary/10 text-primary border border-primary/20"}`}>
          {post.category}
        </span>
        <span className="text-muted-foreground">{formatDate(post.created_at)}</span>
      </div>
      <h3 className="gw-heading text-sm leading-snug group-hover:text-primary transition-colors duration-300">{post.title}</h3>
    </div>
  </article>
);

interface BlogSectionProps {
  content?: BlogContent;
  posts?: LandingBlogPost[];
}

const BlogSection = ({ content = CONTENT.blog, posts = [] }: BlogSectionProps) => {
  const headRef = useScrollReveal();
  const gridRef = useStaggerReveal(Math.max(posts.length, 1));
  const isMobile = useIsMobile();
  const displayPosts = posts.slice(0, 3);

  return (
    <section id="news-updates" className="py-10 sm:py-16 lg:py-20 bg-secondary/30">
      <div className="container space-y-6 sm:space-y-10">
        <div ref={headRef} className="flex items-end justify-between gap-4">
          <div className="space-y-2 sm:space-y-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              {content.sectionLabel}
            </span>
            <h2 className="gw-heading text-2xl sm:text-3xl lg:text-4xl whitespace-pre-line">{content.heading}</h2>
          </div>
          {displayPosts.length > 0 && (
            <a href="/posts" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline transition-all duration-300 group">
              View all posts <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </a>
          )}
        </div>

        {displayPosts.length === 0 ? (
          <div ref={gridRef} className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-muted-foreground">
            No published posts yet. Publish a post in the admin Posts module and it will appear here automatically.
          </div>
        ) : (
          <>
            <MobileCarousel autoScrollInterval={4500} cardClassName="w-[72vw] shrink-0 snap-center">
              {displayPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </MobileCarousel>

            {!isMobile && (
              <div ref={gridRef} className="grid sm:grid-cols-3 gap-4 lg:gap-6">
                {displayPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
