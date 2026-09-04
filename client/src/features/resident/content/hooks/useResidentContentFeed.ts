import { useMemo } from "react";
import type { PostItem } from "../types";

export const RESIDENT_CONTENT_PAGE_SIZE = 6;

export type ResidentContentCategory = "All" | "Waste Tips" | "Events";
export type ResidentContentSort = "latest" | "oldest" | "most-reacted";

export const RESIDENT_CONTENT_CATEGORIES: ResidentContentCategory[] = [
  "All",
  "Waste Tips",
  "Events",
];

interface UseResidentContentFeedOptions {
  posts: PostItem[];
  activeCategory: ResidentContentCategory;
  search: string;
  sort: ResidentContentSort;
  currentPage: number;
}

export const useResidentContentFeed = ({
  posts,
  activeCategory,
  search,
  sort,
  currentPage,
}: UseResidentContentFeedOptions) => {
  const featuredPosts = useMemo(() => {
    const featured = posts.filter((post) => Boolean(post.is_featured));
    return featured.length > 0 ? featured : posts.slice(0, 2);
  }, [posts]);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        if (activeCategory === "Waste Tips" && post.category !== "WASTE_TIP") return false;
        if (activeCategory === "Events" && post.category !== "EVENT") return false;

        if (!search.trim()) return true;

        const query = search.toLowerCase();
        return Boolean(
          post.title?.toLowerCase().includes(query) ||
            post.body?.toLowerCase().includes(query) ||
            post.source?.toLowerCase().includes(query) ||
            (Array.isArray(post.tags) && post.tags.some((tag) => tag.toLowerCase().includes(query))),
        );
      }),
    [posts, activeCategory, search],
  );

  const sortedPosts = useMemo(
    () =>
      [...filteredPosts].sort((first, second) => {
        if (sort === "most-reacted") {
          return Number(second.like_count || 0) - Number(first.like_count || 0);
        }

        const firstDate = new Date(first.published_at || first.created_at).getTime();
        const secondDate = new Date(second.published_at || second.created_at).getTime();
        return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
      }),
    [filteredPosts, sort],
  );

  const totalPages = Math.max(1, Math.ceil(sortedPosts.length / RESIDENT_CONTENT_PAGE_SIZE));
  const paginatedPosts = useMemo(
    () =>
      sortedPosts.slice(
        (currentPage - 1) * RESIDENT_CONTENT_PAGE_SIZE,
        currentPage * RESIDENT_CONTENT_PAGE_SIZE,
      ),
    [sortedPosts, currentPage],
  );

  return { featuredPosts, filteredPosts, sortedPosts, paginatedPosts, totalPages };
};
