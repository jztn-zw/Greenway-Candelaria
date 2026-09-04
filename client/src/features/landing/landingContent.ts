/**
 * landingContent.ts
 *
 * Static content for the public GreenWay Landing Page.
 * This file is the single source of truth for all landing page section content.
 * Content is fixed and not editable through the Admin Panel.
 */

// ─── Type Interfaces ─────────────────────────────────────────────────────────

export interface HeroServiceCard {
  id: string;
  title: string;
  description: string;
}

export interface HeroContent {
  badge: string;
  headline: string;
  subtitle: string;
  ctaPrimaryLabel: string;
  ctaPrimaryLink: string;
  ctaSecondaryLabel: string;
  ctaSecondaryLink: string;
  serviceCards: HeroServiceCard[];
}

export interface AboutContent {
  sectionLabel: string;
  heading: string;
  paragraph1: string;
  paragraph2: string;
  badges: string[];
  pillars: { id: string; title: string; description: string }[];
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
}

export interface ServicesContent {
  sectionLabel: string;
  heading: string;
  items: ServiceItem[];
}

export interface StatisticsContent {
  sectionLabel: string;
  heading: string;
  stats: { id: string; value: string; label: string; sub: string }[];
  ctaLabel: string;
  ctaLink: string;
}

export interface AwardItem {
  id: string;
  name: string;
  description: string;
  awardingBody: string;
  year: string;
  imageUrl: string;
}

export interface AwardsContent {
  sectionLabel: string;
  heading: string;
  items: AwardItem[];
}

export interface BlogContent {
  sectionLabel: string;
  heading: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQContent {
  sectionLabel: string;
  heading: string;
  subtitle: string;
  featuredQuestion: string;
  featuredAnswer: string;
  items: FAQItem[];
}

export interface TestimonialItem {
  id: string;
  quote: string;
  name: string;
  role: string;
  rating: number;
}

export interface TestimonialsContent {
  sectionLabel: string;
  heading: string;
  items: TestimonialItem[];
}

export interface ContactContent {
  sectionLabel: string;
  heading: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
}

export interface FooterContent {
  tagline: string;
  systemLinks: string[];
  informationLinks: string[];
  legalLinks: string[];
  copyright: string;
  bottomTagline: string;
}

// ─── Static Content ──────────────────────────────────────────────────────────

export const CONTENT = {
  hero: {
    badge: "Candelaria, Quezon Official Waste System",
    headline: "Smart GreenWay For Candelaria",
    subtitle:
      "The official waste collection schedule and tracking system for the Municipality of Candelaria, Quezon. Stay informed, stay clean, and help build a smarter community.",
    ctaPrimaryLabel: "Start Tracking",
    ctaPrimaryLink: "/resident",
    ctaSecondaryLabel: "Learn More",
    ctaSecondaryLink: "#about",
    serviceCards: [
      {
        id: "hsc1",
        title: "Schedule Tracking",
        description:
          "Know exactly when your barangay's collection day is — updated in real time and always accurate.",
      },
      {
        id: "hsc2",
        title: "Route Monitoring",
        description:
          "Live truck tracking so you always know how close the collection crew is to your street.",
      },
      {
        id: "hsc3",
        title: "Instant Alerts",
        description:
          "Get notified before your pickup day so you never miss a collection again.",
      },
    ],
  } satisfies HeroContent,

  about: {
    sectionLabel: "About the System",
    heading: "Rethinking Waste for Candelaria",
    paragraph1:
      "GreenWay is a Smart Community Garbage Schedule and Tracker System designed specifically for the Municipality of Candelaria, Quezon. It addresses the inefficiencies of traditional waste collection through technology-driven scheduling, monitoring, and community engagement.",
    paragraph2:
      "By digitizing collection routes, enabling real-time status updates, and fostering resident participation, GreenWay transforms waste management from a reactive process into a proactive, data-informed system that benefits the entire community.",
    badges: ["LGU Candelaria Certified", "DepEd Endorsed", "Open Data Compliant"],
    pillars: [
      {
        id: "p1",
        title: "Sustainability First",
        description:
          "Every feature is built around reducing waste, optimizing routes, and promoting ecological responsibility across the municipality.",
      },
      {
        id: "p2",
        title: "Full Transparency",
        description:
          "Real-time data gives residents and officials clear visibility into collection schedules, compliance, and community performance.",
      },
      {
        id: "p3",
        title: "Precision Systems",
        description:
          "Smart scheduling algorithms ensure no missed pickups, reduced fuel consumption, and optimized resource allocation for every barangay.",
      },
    ],
  } satisfies AboutContent,

  services: {
    sectionLabel: "Services",
    heading: "Built for every layer of the system",
    items: [
      {
        id: "sv1",
        title: "Smart Scheduling",
        description:
          "Automated collection schedules tailored per barangay with real-time adjustments for holidays and weather.",
      },
      {
        id: "sv2",
        title: "Route Tracking",
        description:
          "Live GPS tracking of collection trucks so residents know exactly when service reaches their area.",
      },
      {
        id: "sv3",
        title: "Instant Notifications",
        description:
          "Push alerts for upcoming pickups, schedule changes, and community waste management updates.",
      },
      {
        id: "sv4",
        title: "Analytics Dashboard",
        description:
          "Comprehensive data on collection rates, waste volumes, and compliance for municipal decision-makers.",
      },
      {
        id: "sv5",
        title: "Community Portal",
        description:
          "Resident-facing interface for reporting issues, checking schedules, and participating in recycling programs.",
      },
      {
        id: "sv6",
        title: "Compliance Monitoring",
        description:
          "Track waste segregation compliance and identify areas needing additional education or enforcement.",
      },
    ],
  } satisfies ServicesContent,

  statistics: {
    sectionLabel: "By the Numbers",
    heading: "GreenWay Is Built on Real Community Impact",
    stats: [
      { id: "s1", value: "25", label: "Barangays", sub: "Covered in Candelaria" },
      { id: "s2", value: "2", label: "Trucks", sub: "Currently Operating" },
      { id: "s3", value: "1,200+", label: "Residents", sub: "Registered in GreenWay" },
      { id: "s4", value: "500+", label: "Reports", sub: "Submitted by the Community" },
    ],
    ctaLabel: "Start Tracking",
    ctaLink: "/resident",
  } satisfies StatisticsContent,

  awards: {
    sectionLabel: "Recognition",
    heading: "Awards & Recognition",
    items: [
      {
        id: "aw1",
        name: "Cleanest & Greenest Municipality",
        description: "Recognized for exemplary waste management and environmental programs",
        awardingBody: "DILG Region IV-A",
        year: "2024",
        imageUrl: "",
      },
      {
        id: "aw2",
        name: "Outstanding Solid Waste Management",
        description: "Excellence in solid waste management implementation",
        awardingBody: "DENR Quezon Province",
        year: "2023",
        imageUrl: "",
      },
      {
        id: "aw3",
        name: "Best Environmental Program",
        description: "Top environmental program among municipalities",
        awardingBody: "League of Municipalities",
        year: "2023",
        imageUrl: "",
      },
      {
        id: "aw4",
        name: "Seal of Good Local Governance",
        description:
          "Meeting standards for financial administration, disaster preparedness, and social protection",
        awardingBody: "DILG National",
        year: "2022",
        imageUrl: "",
      },
    ],
  } satisfies AwardsContent,

  blog: {
    sectionLabel: "Stay Informed",
    heading: "News & Updates",
  } satisfies BlogContent,

  testimonials: {
    sectionLabel: "What Residents Say",
    heading: "Resident Feedback",
    items: [
      {
        id: "t1",
        quote: "I never miss collection day anymore. The notifications are a lifesaver!",
        name: "Maria Santos",
        role: "Resident, Brgy. Poblacion",
        rating: 5,
      },
      {
        id: "t2",
        quote: "The truck tracker is incredibly helpful. I can prepare my waste just in time.",
        name: "Roberto Cruz",
        role: "Resident, Brgy. Malabanban Norte",
        rating: 5,
      },
      {
        id: "t3",
        quote: "GreenWay made waste management so much easier for our entire barangay.",
        name: "Elena Reyes",
        role: "Brgy. Captain, Brgy. Mangilag Sur",
        rating: 4,
      },
      {
        id: "t4",
        quote: "Reporting illegal dumping is now quick and easy. Great system!",
        name: "Juan Dela Cruz",
        role: "Resident, Brgy. Bukal Sur",
        rating: 5,
      },
    ],
  } satisfies TestimonialsContent,

  faq: {
    sectionLabel: "FAQ",
    heading: "Questions & Answers",
    subtitle:
      "Everything you need to know about GreenWay and how it serves the Candelaria community.",
    featuredQuestion: "What happens to waste data after it is collected?",
    featuredAnswer:
      "All collection data is logged in real time and stored securely in GreenWay's encrypted database. Waste volumes, segregation compliance rates, and route completion records are aggregated into dashboards accessible to authorized municipal officials and MENRO staff. No personal resident data is shared beyond what is required by law.",
    items: [
      {
        id: "fq1",
        question: "How does GreenWay determine my collection schedule?",
        answer:
          "GreenWay uses barangay-specific scheduling algorithms that account for population density, waste volume data, and geographic routing to create optimal collection timetables for each area.",
      },
      {
        id: "fq2",
        question: "Can I report a missed garbage collection?",
        answer:
          "Yes. The community portal allows residents to submit missed-collection reports instantly, which are routed to the operations team for immediate follow-up and resolution.",
      },
      {
        id: "fq3",
        question: "Is the system available on mobile devices?",
        answer:
          "GreenWay is fully responsive and works on any smartphone, tablet, or desktop browser. Push notifications are available for schedule reminders and updates.",
      },
      {
        id: "fq4",
        question: "How does waste segregation tracking work?",
        answer:
          "Collection crews log segregation compliance at each collection point. The data is aggregated into dashboards that help officials identify areas needing additional education or support.",
      },
      {
        id: "fq5",
        question: "Who has access to the analytics dashboard?",
        answer:
          "Municipal officials, MENRO staff, and barangay captains have tiered access to analytics. Residents see simplified summaries relevant to their area.",
      },
      {
        id: "fq6",
        question: "Is my personal information secure?",
        answer:
          "GreenWay follows strict data privacy protocols compliant with the Philippine Data Privacy Act. Only necessary information is collected and encrypted at rest.",
      },
    ],
  } satisfies FAQContent,

  contact: {
    sectionLabel: "Contact",
    heading: "Get in touch",
    address: "MENRO Office, Brgy. Poblacion, Candelaria, Quezon",
    phone: "Hotline: 383",
    email: "menro@candelaria.gov.ph",
    hours: "Mon - Fri, 8:00 AM - 5:00 PM",
  } satisfies ContactContent,

  footer: {
    tagline: "Smart Community Garbage Schedule and Tracker System",
    systemLinks: ["Dashboard", "Schedules", "Reports", "Notifications"],
    informationLinks: ["About", "News & Updates", "FAQ"],
    legalLinks: ["Privacy Policy", "Terms of Service", "Data Protection", "Accessibility"],
    copyright: "© 2026 GreenWay | MENRO Candelaria, Quezon. All rights reserved.",
    bottomTagline: "Built for a cleaner, smarter community.",
  } satisfies FooterContent,
} as const;
