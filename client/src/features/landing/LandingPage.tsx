import { useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import TopBar from "./components/TopBar";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import ServicesSection from "./components/ServicesSection";
import ImpactStatsSection from "./components/ImpactStatsSection";
import AwardsSection from "./components/AwardsSection";
import BlogSection, { LandingBlogPost } from "./components/BlogSection";
import TestimonialsSection from "./components/TestimonialsSection";
import FAQSection from "./components/FAQSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import postsService from "@/services/postsService";
import { CONTENT } from "./landingContent";

const Index = () => {
  const [blogPosts, setBlogPosts] = useState<LandingBlogPost[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadPosts = async () => {
      try {
        const posts = await postsService.getAll({ status: "PUBLISHED" });
        if (!isMounted) return;
        setBlogPosts(
          (posts ?? []).slice(0, 3).map((post: any) => ({
            id: post.id,
            category: post.category,
            created_at: post.created_at,
            title: post.title,
          })),
        );
      } catch {
        // posts are optional — silently fall back to empty list
      }
    };

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      <AnimatedSection>
        <HeroSection content={CONTENT.hero} />
      </AnimatedSection>
      <AnimatedSection>
        <AboutSection content={CONTENT.about} />
      </AnimatedSection>
      <AnimatedSection>
        <ServicesSection content={CONTENT.services} />
      </AnimatedSection>
      <AnimatedSection>
        <ImpactStatsSection content={CONTENT.statistics} />
      </AnimatedSection>
      <AnimatedSection>
        <AwardsSection content={CONTENT.awards} />
      </AnimatedSection>
      <AnimatedSection>
        <BlogSection content={CONTENT.blog} posts={blogPosts} />
      </AnimatedSection>
      <AnimatedSection>
        <TestimonialsSection content={CONTENT.testimonials} />
      </AnimatedSection>
      <AnimatedSection>
        <FAQSection content={CONTENT.faq} />
      </AnimatedSection>
      <AnimatedSection>
        <ContactSection content={CONTENT.contact} />
      </AnimatedSection>
      <Footer content={CONTENT.footer} contactContent={CONTENT.contact} />
    </div>
  );
};

export default Index;
