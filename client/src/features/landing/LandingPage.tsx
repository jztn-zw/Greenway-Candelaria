import AnimatedSection from "@/components/motion/AnimatedSection";
import TopBar from "./components/TopBar";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import CollectionScheduleGuide from "./components/CollectionScheduleGuide";
import HowItWorksSection from "./components/HowItWorksSection";
import AppDownloadSection from "./components/AppDownloadSection";
import FAQSection from "./components/FAQSection";
import ContactSection from "./components/ContactSection";
import Footer from "./components/Footer";
import { CONTENT } from "./landingContent";
import "./LandingPage.css";

const Index = () => {
  return (
    <div className="landing-page min-h-screen">
      <TopBar />
      <Navbar />
      <HeroSection content={CONTENT.hero} />
      <AnimatedSection>
        <CollectionScheduleGuide content={CONTENT.collectionScheduleGuide} />
      </AnimatedSection>
      <AnimatedSection>
        <HowItWorksSection content={CONTENT.howItWorks} />
      </AnimatedSection>
      <AnimatedSection>
        <AppDownloadSection content={CONTENT.appDownload} />
      </AnimatedSection>
      <AnimatedSection>
        <FAQSection content={CONTENT.faq} />
      </AnimatedSection>
      <AnimatedSection>
        <ContactSection content={CONTENT.contact} />
      </AnimatedSection>
      <AnimatedSection animation="fade-in">
        <Footer content={CONTENT.footer} contactContent={CONTENT.contact} />
      </AnimatedSection>
    </div>
  );
};

export default Index;
