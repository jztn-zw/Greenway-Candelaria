import { useEffect, useMemo, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import TopBar from "@/pages/landingpage/components/TopBar";
import Navbar from "@/pages/landingpage/components/Navbar";
import HeroSection from "@/pages/landingpage/components/HeroSection";
import AboutSection from "@/pages/landingpage/components/AboutSection";
import ServicesSection from "@/pages/landingpage/components/ServicesSection";
import ImpactStatsSection from "@/pages/landingpage/components/ImpactStatsSection";
import AwardsSection from "@/pages/landingpage/components/AwardsSection";
import BlogSection, { LandingBlogPost } from "@/pages/landingpage/components/BlogSection";
import TestimonialsSection from "@/pages/landingpage/components/TestimonialsSection";
import FAQSection from "@/pages/landingpage/components/FAQSection";
import ContactSection from "@/pages/landingpage/components/ContactSection";
import Footer from "@/pages/landingpage/components/Footer";
import landingService from "@/services/landingService";
import postsService from "@/services/postsService";
import { DEFAULT_CONTENT, DEFAULT_SECTIONS, LandingSectionKey, SectionContent } from "@/pages/admin/components/landingmanager/types";

const Index = () => {
  const [content, setContent] = useState<SectionContent>(DEFAULT_CONTENT);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [blogPosts, setBlogPosts] = useState<LandingBlogPost[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadLandingPage = async () => {
      try {
        const [landingSnapshot, posts] = await Promise.all([
          landingService.getAll(),
          postsService.getAll({ status: "PUBLISHED" }),
        ]);

        if (!isMounted) return;

        setContent(landingSnapshot.content);
        setSections(landingSnapshot.sections);
        setBlogPosts(
          (posts ?? []).slice(0, 3).map((post: any) => ({
            id: post.id,
            category: post.category,
            created_at: post.created_at,
            title: post.title,
          })),
        );
      } catch {
        if (!isMounted) return;
        setContent(DEFAULT_CONTENT);
        setSections(DEFAULT_SECTIONS);
      }
    };

    void loadLandingPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleSections = useMemo(
    () => new Set(sections.filter((section) => section.visible).map((section) => section.id as LandingSectionKey)),
    [sections],
  );

  return (
    <div className="min-h-screen">
      <TopBar />
      <Navbar />
      {visibleSections.has("hero") && (
        <AnimatedSection>
          <HeroSection content={content.hero} />
        </AnimatedSection>
      )}
      {visibleSections.has("about") && (
        <AnimatedSection>
          <AboutSection content={content.about} />
        </AnimatedSection>
      )}
      {visibleSections.has("services") && (
        <AnimatedSection>
          <ServicesSection content={content.services} />
        </AnimatedSection>
      )}
      {visibleSections.has("statistics") && (
        <AnimatedSection>
          <ImpactStatsSection content={content.statistics} />
        </AnimatedSection>
      )}
      {visibleSections.has("awards") && (
        <AnimatedSection>
          <AwardsSection content={content.awards} />
        </AnimatedSection>
      )}
      {visibleSections.has("blog") && (
        <AnimatedSection>
          <BlogSection content={content.blog} posts={blogPosts} />
        </AnimatedSection>
      )}
      {visibleSections.has("testimonials") && (
        <AnimatedSection>
          <TestimonialsSection content={content.testimonials} />
        </AnimatedSection>
      )}
      {visibleSections.has("faq") && (
        <AnimatedSection>
          <FAQSection content={content.faq} />
        </AnimatedSection>
      )}
      {visibleSections.has("contact") && (
        <AnimatedSection>
          <ContactSection content={content.contact} />
        </AnimatedSection>
      )}
      {visibleSections.has("footer") && <Footer content={content.footer} contactContent={content.contact} />}
    </div>
  );
};

export default Index;
