import { useEffect, useRef } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string }
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      return;
    }

    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition =
      "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.willChange = "transform, opacity";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          // Release will-change after animation completes
          setTimeout(() => {
            if (el) el.style.willChange = "auto";
          }, 800);
          observer.unobserve(el);
        }
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return ref;
}

export function useStaggerReveal(count: number, options?: { threshold?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const children = Array.from(container.children) as HTMLElement[];

    if (prefersReducedMotion()) {
      children.forEach((child) => {
        child.style.opacity = "1";
      });
      return;
    }

    children.forEach((child, i) => {
      child.style.opacity = "0";
      child.style.transform = "translateY(20px)";
      child.style.transition = `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`;
      child.style.willChange = "transform, opacity";
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          children.forEach((child) => {
            child.style.opacity = "1";
            child.style.transform = "translateY(0)";
          });
          // Release will-change after stagger completes
          setTimeout(() => {
            children.forEach((child) => {
              child.style.willChange = "auto";
            });
          }, 600 + children.length * 80);
          observer.unobserve(container);
        }
      },
      { threshold: options?.threshold ?? 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [count, options?.threshold]);

  return ref;
}
