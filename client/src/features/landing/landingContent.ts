/**
 * landingContent.ts
 *
 * Static content for the public GreenWay Landing Page.
 * This file is the single source of truth for all landing page section content.
 * Content is fixed and not editable through the Admin Panel.
 */

import type { CollectionDay } from "@/lib/collectionSchedule";

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

export interface HowItWorksContent {
  sectionLabel: string;
  heading: string;
  subtitle: string;
  steps: { id: string; title: string; description: string }[];
}

export interface AppDownloadContent {
  sectionLabel: string;
  heading: string;
  description: string;
  benefits: { id: string; title: string; description: string; previewLabel: string }[];
}

export interface CollectionScheduleGuideContent {
  sectionLabel: string;
  heading: string;
  description: string;
  steps: { title: string; description: string }[];
  days: {
    day: CollectionDay;
    shortLabel: string;
    guidance: { accepted: string[]; avoid: string[]; tip: string };
  }[];
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
  description: string;
  officeName: string;
  address: string;
  phone: string;
  phoneHref: string;
  email: string;
  website: string;
  hours: string;
}

export interface FooterContent {
  tagline: string;
  links: { label: string; href: string }[];
  copyright: string;
}

// ─── Static Content ──────────────────────────────────────────────────────────

export const CONTENT = {
  hero: {
    badge: "Candelaria, Quezon Official Waste System",
    headline: "Smart GreenWay for Candelaria",
    subtitle:
      "The official waste collection schedule and tracking system for the Municipality of Candelaria, Quezon. Stay informed, stay clean, and help build a smarter, greener community.",
    ctaPrimaryLabel: "Start Tracking",
    ctaPrimaryLink: "/resident",
    ctaSecondaryLabel: "Learn More",
    ctaSecondaryLink: "#how-it-works",
    serviceCards: [
      {
        id: "hsc1",
        title: "Know Your Collection Days",
        description:
          "Stay updated easily",
      },
      {
        id: "hsc2",
        title: "Track Collection Trucks",
        description:
          "Real-time updates",
      },
      {
        id: "hsc3",
        title: "Cleaner Community",
        description:
          "A greener Candelaria",
      },
    ],
  } satisfies HeroContent,

  collectionScheduleGuide: {
    sectionLabel: "Regular Collection Schedule",
    heading: "A Cleaner Week Starts Here",
    description: "Know the waste type assigned to each day. Follow the fixed weekly guide, with simple examples and preparation tips for a cleaner community.",
    steps: [
      { title: "Choose a Day", description: "Explore the weekly guide from Monday through Sunday." },
      { title: "Follow the Day's Waste Type", description: "See what belongs in the assigned collection and what to keep separate." },
      { title: "Keep It Clean and Covered", description: "Secure your waste and keep the collection point clear." },
    ],
    // Weekday waste types come from the shared Route Manager schedule.
    days: [
      {
        day: "Monday", shortLabel: "Mon",
        guidance: { accepted: ["Cooked rice and food leftovers", "Fruit skins and cores", "Vegetable stems"], avoid: ["Plastic food packaging", "Disposable cutlery", "Cooking oil and other liquids"], tip: "Drain excess liquid from kitchen scraps and keep them in a covered container." },
      },
      {
        day: "Tuesday", shortLabel: "Tue",
        guidance: { accepted: ["Cardboard packaging", "Clean paper bags", "Dry cartons"], avoid: ["Food-soaked paper", "Wet vegetable scraps", "Chemical containers"], tip: "Flatten clean cardboard and keep it dry. Separate recyclable paper from soiled packaging." },
      },
      {
        day: "Wednesday", shortLabel: "Wed",
        guidance: { accepted: ["Dry garden leaves", "Grass clippings", "Wilted flowers"], avoid: ["Plastic plant pots", "Stones and soil", "Pesticide bottles"], tip: "Collect loose garden material in a secure container so it cannot scatter into drains." },
      },
      {
        day: "Thursday", shortLabel: "Thu",
        guidance: { accepted: ["Empty glass jars", "Intact drink bottles", "Dry bottle caps"], avoid: ["Loose broken glass", "Leftover drinks", "Medicine and chemical bottles"], tip: "Keep intact glass separate and protected against breakage. Ask MENRO about handling broken glass." },
      },
      {
        day: "Friday", shortLabel: "Fri",
        guidance: { accepted: ["Bread and cooked pasta scraps", "Corn husks", "Banana and citrus peelings"], avoid: ["Foil food trays", "Plastic cling wrap", "Styrofoam takeaway boxes"], tip: "Remove all takeaway packaging before sorting leftovers, then close your bio-waste container." },
      },
      {
        day: "Saturday", shortLabel: "Sat",
        guidance: { accepted: ["Clean paper sheets", "Dry cardboard boxes", "Empty household packaging"], avoid: ["Greasy food scraps", "Light bulbs", "Cleaning chemicals"], tip: "Bundle clean paper and cardboard separately. Keep chemicals and bulbs out of regular household waste." },
      },
      {
        day: "Sunday", shortLabel: "Sun",
        guidance: { accepted: ["Fresh fruit scraps", "Vegetable offcuts", "Collected organic garden waste"], avoid: ["Mixed household rubbish", "Plastic bin liners in the bio waste", "Pet litter"], tip: "Keep organic waste covered and separated. Secure the container before putting it out." },
      },
    ],
  } satisfies CollectionScheduleGuideContent,

  howItWorks: {
    sectionLabel: "How GreenWay Works",
    heading: "Your Collection Day, Made Easier",
    subtitle: "Set up your resident account, prepare for collection, and stay connected with MENRO.",
    steps: [
      {
        id: "profile",
        title: "Set Up Your Profile",
        description: "Create your account, then add your barangay and street so GreenWay can show your area.",
      },
      {
        id: "schedule",
        title: "Check Your Schedule",
        description: "Check your regular collection days and prepare the waste type assigned for the day.",
      },
      {
        id: "tracking",
        title: "Track and Report",
        description: "Follow collection progress and send missed collection or waste concerns to MENRO.",
      },
    ],
  } satisfies HowItWorksContent,

  appDownload: {
    sectionLabel: "Get the GreenWay App",
    heading: "Your Community, Always Within Reach",
    description: "Use the same GreenWay account on the website or in the app for collection schedules, truck updates, and waste reports. Install the Android app for a more convenient phone experience.",
    benefits: [
      {
        id: "phone-alerts",
        title: "Phone Push Notifications",
        description: "Get collection, report, and community alerts on your phone without keeping the website open. Requires notification permission.",
        previewLabel: "Phone Notifications",
      },
      {
        id: "quick-access",
        title: "One-Tap Access",
        description: "Open GreenWay from your home screen whenever you need your schedule, truck tracking, or report updates.",
        previewLabel: "Resident Dashboard",
      },
      {
        id: "phone-tools",
        title: "Ready for Reports on the Go",
        description: "Use your phone's camera and location to add photos and place details to a waste concern, then follow its status.",
        previewLabel: "Waste Reports",
      },
    ],
  } satisfies AppDownloadContent,

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
    heading: "Built for Every Layer of the System",
    items: [
      {
        id: "sv1",
        title: "Smart Scheduling",
        description:
          "Regular collection schedules for your area help you plan your weekly routine and prepare your waste.",
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
          "Collection reminders and official community waste management announcements help residents stay informed.",
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
    sectionLabel: "Frequently Asked Questions",
    heading: "A Few Answers Before You Start",
    subtitle:
      "Get familiar with your collection routine, the app, and how to reach MENRO when you need help.",
    featuredQuestion: "Can I use GreenWay without installing the app?",
    featuredAnswer:
      "Yes. Open the resident website on your phone, tablet, or laptop. You can check the public weekly guide without an account, then sign in for your resident features.",
    items: [
      {
        id: "fq1",
        question: "Do I need an account to use GreenWay?",
        answer:
          "You can view the weekly waste guide on this page without an account. Create a resident account and complete your profile to access your area's collection schedule, truck tracking, and waste reports.",
      },
      {
        id: "fq2",
        question: "Does the assigned waste type change each week?",
        answer:
          "No. MENRO follows a fixed weekly pattern for biodegradable and non-biodegradable collection. Select a day in the Regular Collection Schedule guide to see its assigned waste type, preparation tips, and items to avoid.",
      },
      {
        id: "fq3",
        question: "Where can I see the schedule for my area?",
        answer:
          "Sign in to your resident account and open Collection Schedule. Keep your barangay and street or purok correct in your profile so GreenWay can show the schedule for your area. The public weekly guide explains the fixed waste type for each day.",
      },
      {
        id: "fq4",
        question: "How do I install the Android app?",
        answer:
          "When the download is enabled, choose Install GreenWay App on this page to download the Android APK. Open the downloaded file on your Android phone and follow its installation prompts. You can also use the resident website.",
      },
      {
        id: "fq5",
        question: "Why can't I see a collection truck?",
        answer:
          "Truck tracking depends on an active collection run for your area and available location updates. A truck may not appear when there is no active run or its connection is interrupted. Check your profile location and the tracking page's status; contact MENRO if you need help.",
      },
      {
        id: "fq6",
        question: "How do I report a missed collection or waste concern?",
        answer:
          "Open the report feature in your resident account, choose the concern type, and provide the location, description, and required photos. Submit the report to MENRO and check its status in your reports. Sending a report does not change the regular collection schedule.",
      },
    ],
  } satisfies FAQContent,

  contact: {
    sectionLabel: "Here to Help",
    heading: "Contact MENRO",
    description: "Need help with collection or a waste concern? Reach MENRO directly by phone, email, or a visit to the office.",
    officeName: "Municipal Environment and Natural Resources Office",
    address: "2nd Floor, Right Wing, Candelaria Municipal Hall, Candelaria, Quezon, 4323",
    phone: "Hotline: 383",
    phoneHref: "tel:383",
    email: "menro@candelaria.gov.ph",
    website: "https://www.candelaria.gov.ph",
    hours: "Mon - Fri, 8:00 AM - 5:00 PM",
  } satisfies ContactContent,

  footer: {
    tagline: "Know your collection days. Help keep Candelaria clean.",
    links: [
      { label: "Home", href: "#home" },
      { label: "Weekly Guide", href: "#collection-schedule" },
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "#contact" },
    ],
    copyright: "© 2026 GreenWay | MENRO Candelaria, Quezon. All rights reserved.",
  } satisfies FooterContent,
} as const;
