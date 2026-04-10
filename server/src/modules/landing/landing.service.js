const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const { log } = require("../audit/audit.service");

const SECTION_ORDER = [
  "hero",
  "about",
  "services",
  "statistics",
  "awards",
  "blog",
  "testimonials",
  "faq",
  "contact",
  "footer",
];

const SECTION_DEFAULTS = {
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
        id: "hero-card-1",
        title: "Schedule Tracking",
        description:
          "Know exactly when your barangay's collection day is updated in real time and always accurate.",
      },
      {
        id: "hero-card-2",
        title: "Route Monitoring",
        description:
          "Live truck tracking so you always know how close the collection crew is to your street.",
      },
      {
        id: "hero-card-3",
        title: "Instant Alerts",
        description:
          "Get notified before your pickup day so you never miss a collection again.",
      },
    ],
  },
  about: {
    sectionLabel: "About the System",
    heading: "Rethinking Waste for Candelaria",
    paragraph1:
      "GreenWay is a Smart Community Garbage Schedule and Tracker System designed specifically for the Municipality of Candelaria, Quezon. It addresses the inefficiencies of traditional waste collection through technology-driven scheduling, monitoring, and community engagement.",
    paragraph2:
      "By digitizing collection routes, enabling real-time status updates, and fostering resident participation, GreenWay transforms waste management from a reactive process into a proactive, data-informed system that benefits the entire community.",
    badges: [
      "LGU Candelaria Certified",
      "DepEd Endorsed",
      "Open Data Compliant",
    ],
    pillars: [
      {
        id: "about-pillar-1",
        title: "Sustainability First",
        description:
          "Every feature is built around reducing waste, optimizing routes, and promoting ecological responsibility across the municipality.",
      },
      {
        id: "about-pillar-2",
        title: "Full Transparency",
        description:
          "Real-time data gives residents and officials clear visibility into collection schedules, compliance, and community performance.",
      },
      {
        id: "about-pillar-3",
        title: "Precision Systems",
        description:
          "Smart scheduling algorithms ensure no missed pickups, reduced fuel consumption, and optimized resource allocation for every barangay.",
      },
    ],
  },
  services: {
    sectionLabel: "Services",
    heading: "Built for every layer of the system",
    items: [
      {
        id: "service-1",
        title: "Smart Scheduling",
        description:
          "Automated collection schedules tailored per barangay with real-time adjustments for holidays and weather.",
      },
      {
        id: "service-2",
        title: "Route Tracking",
        description:
          "Live GPS tracking of collection trucks so residents know exactly when service reaches their area.",
      },
      {
        id: "service-3",
        title: "Instant Notifications",
        description:
          "Push alerts for upcoming pickups, schedule changes, and community waste management updates.",
      },
      {
        id: "service-4",
        title: "Analytics Dashboard",
        description:
          "Comprehensive data on collection rates, waste volumes, and compliance for municipal decision-makers.",
      },
      {
        id: "service-5",
        title: "Community Portal",
        description:
          "Resident-facing interface for reporting issues, checking schedules, and participating in recycling programs.",
      },
      {
        id: "service-6",
        title: "Compliance Monitoring",
        description:
          "Track waste segregation compliance and identify areas needing additional education or enforcement.",
      },
    ],
  },
  statistics: {
    sectionLabel: "By the Numbers",
    heading: "GreenWay Is Built on Real Community Impact",
    stats: [
      { id: "stat-1", value: "25", label: "Barangays", sub: "Covered in Candelaria" },
      { id: "stat-2", value: "2", label: "Trucks", sub: "Currently Operating" },
      { id: "stat-3", value: "1,200+", label: "Residents", sub: "Registered in GreenWay" },
      { id: "stat-4", value: "500+", label: "Reports", sub: "Submitted by the Community" },
    ],
    ctaLabel: "Start Tracking",
    ctaLink: "/resident",
  },
  awards: {
    sectionLabel: "Recognition",
    heading: "Awards & Recognition",
    items: [
      {
        id: "award-1",
        name: "Cleanest & Greenest Municipality",
        description:
          "Recognized for exemplary waste management and environmental programs",
        awardingBody: "DILG Region IV-A",
        year: "2024",
        imageUrl: "",
      },
      {
        id: "award-2",
        name: "Outstanding Solid Waste Management",
        description: "Excellence in solid waste management implementation",
        awardingBody: "DENR Quezon Province",
        year: "2023",
        imageUrl: "",
      },
      {
        id: "award-3",
        name: "Best Environmental Program",
        description: "Top environmental program among municipalities",
        awardingBody: "League of Municipalities",
        year: "2023",
        imageUrl: "",
      },
      {
        id: "award-4",
        name: "Seal of Good Local Governance",
        description:
          "Meeting standards for financial administration, disaster preparedness, and social protection",
        awardingBody: "DILG National",
        year: "2022",
        imageUrl: "",
      },
    ],
  },
  blog: {
    sectionLabel: "Stay Informed",
    heading: "News & Updates",
  },
  testimonials: {
    sectionLabel: "What Residents Say",
    heading: "Resident Feedback",
    items: [
      {
        id: "testimonial-1",
        quote: "I never miss collection day anymore. The notifications are a lifesaver!",
        name: "Maria Santos",
        role: "Resident, Brgy. Poblacion",
        rating: 5,
      },
      {
        id: "testimonial-2",
        quote: "The truck tracker is incredibly helpful. I can prepare my waste just in time.",
        name: "Roberto Cruz",
        role: "Resident, Brgy. Malabanban Norte",
        rating: 5,
      },
      {
        id: "testimonial-3",
        quote: "GreenWay made waste management so much easier for our entire barangay.",
        name: "Elena Reyes",
        role: "Brgy. Captain, Brgy. Mangilag Sur",
        rating: 4,
      },
      {
        id: "testimonial-4",
        quote: "Reporting illegal dumping is now quick and easy. Great system!",
        name: "Juan Dela Cruz",
        role: "Resident, Brgy. Bukal Sur",
        rating: 5,
      },
    ],
  },
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
        id: "faq-1",
        question: "How does GreenWay determine my collection schedule?",
        answer:
          "GreenWay uses barangay-specific scheduling algorithms that account for population density, waste volume data, and geographic routing to create optimal collection timetables for each area.",
      },
      {
        id: "faq-2",
        question: "Can I report a missed garbage collection?",
        answer:
          "Yes. The community portal allows residents to submit missed-collection reports instantly, which are routed to the operations team for immediate follow-up and resolution.",
      },
      {
        id: "faq-3",
        question: "Is the system available on mobile devices?",
        answer:
          "GreenWay is fully responsive and works on any smartphone, tablet, or desktop browser. Push notifications are available for schedule reminders and updates.",
      },
      {
        id: "faq-4",
        question: "How does waste segregation tracking work?",
        answer:
          "Collection crews log segregation compliance at each pickup point. The data is aggregated into dashboards that help officials identify areas needing additional education or support.",
      },
      {
        id: "faq-5",
        question: "Who has access to the analytics dashboard?",
        answer:
          "Municipal officials, MENRO staff, and barangay captains have tiered access to analytics. Residents see simplified summaries relevant to their area.",
      },
      {
        id: "faq-6",
        question: "Is my personal information secure?",
        answer:
          "GreenWay follows strict data privacy protocols compliant with the Philippine Data Privacy Act. Only necessary information is collected and encrypted at rest.",
      },
    ],
  },
  contact: {
    sectionLabel: "Contact",
    heading: "Get in touch",
    address: "MENRO Office, Brgy. Poblacion, Candelaria, Quezon",
    phone: "Hotline: 383",
    email: "menro@candelaria.gov.ph",
    hours: "Mon - Fri, 8:00 AM - 5:00 PM",
  },
  footer: {
    tagline: "Smart Community Garbage Schedule and Tracker System",
    systemLinks: ["Dashboard", "Schedules", "Reports", "Notifications"],
    informationLinks: ["About", "News & Updates", "FAQ"],
    legalLinks: ["Privacy Policy", "Terms of Service", "Data Protection", "Accessibility"],
    copyright: "© 2026 GreenWay | MENRO Candelaria, Quezon. All rights reserved.",
    bottomTagline: "Built for a cleaner, smarter community.",
  },
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const safeParseJson = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeRow = (row) => ({
  ...row,
  is_visible: Boolean(row.is_visible),
  content: safeParseJson(row.content, deepClone(SECTION_DEFAULTS[row.section] || {})),
});

const sortRows = (rows) => {
  const indexMap = new Map(SECTION_ORDER.map((section, index) => [section, index]));
  return [...rows].sort((a, b) => {
    const aIndex = indexMap.get(a.section) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = indexMap.get(b.section) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
};

const ensureSections = async () => {
  const [rows] = await pool.query("SELECT section FROM landing_content");
  const existing = new Set(rows.map((row) => row.section));

  const missingRows = SECTION_ORDER.filter((section) => !existing.has(section)).map((section) => [
    generateId(),
    section,
    JSON.stringify(deepClone(SECTION_DEFAULTS[section])),
    1,
    null,
  ]);

  if (missingRows.length > 0) {
    await pool.query(
      `INSERT INTO landing_content (id, section, content, is_visible, updated_by)
       VALUES ?`,
      [missingRows],
    );
  }
};

const getAll = async () => {
  await ensureSections();

  const [rows] = await pool.query(
    `SELECT
       lc.*,
       u.full_name AS updated_by_name
     FROM landing_content lc
     LEFT JOIN users u ON u.id = lc.updated_by`,
  );

  return sortRows(rows).map(normalizeRow);
};

const getBySection = async (section) => {
  await ensureSections();

  const [rows] = await pool.query(
    `SELECT
       lc.*,
       u.full_name AS updated_by_name
     FROM landing_content lc
     LEFT JOIN users u ON u.id = lc.updated_by
     WHERE lc.section = ?`,
    [section],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: `Section "${section}" not found` };
  }

  return normalizeRow(rows[0]);
};

const updateSection = async (section, content, adminId, ip) => {
  const existing = await getBySection(section);

  await pool.query(
    `INSERT INTO landing_history (id, section, snapshot, saved_by)
     VALUES (?, ?, ?, ?)`,
    [generateId(), section, JSON.stringify(existing.content), adminId],
  );

  await pool.query(
    `UPDATE landing_content
     SET content = ?, updated_by = ?
     WHERE section = ?`,
    [JSON.stringify(content), adminId, section],
  );

  await log({
    user_id: adminId,
    action: "UPDATE_LANDING_CONTENT",
    module: "landing-content",
    record_id: existing.id,
    old_value: { section, content: existing.content },
    new_value: { section, content },
    ip_address: ip,
  });

  return getBySection(section);
};

const toggleVisibility = async (section, is_visible, adminId, ip) => {
  const existing = await getBySection(section);

  await pool.query(
    `UPDATE landing_content
     SET is_visible = ?, updated_by = ?
     WHERE section = ?`,
    [is_visible, adminId, section],
  );

  await log({
    user_id: adminId,
    action: is_visible ? "SHOW_SECTION" : "HIDE_SECTION",
    module: "landing-content",
    record_id: existing.id,
    old_value: { is_visible: existing.is_visible },
    new_value: { is_visible },
    ip_address: ip,
  });

  return getBySection(section);
};

const getHistory = async (section) => {
  await ensureSections();

  const [rows] = await pool.query(
    `SELECT
       lh.*,
       u.full_name AS saved_by_name,
       u.avatar_url AS saved_by_avatar
     FROM landing_history lh
     LEFT JOIN users u ON u.id = lh.saved_by
     WHERE lh.section = ?
     ORDER BY lh.created_at DESC`,
    [section],
  );

  return rows.map((row) => ({
    ...row,
    snapshot: safeParseJson(row.snapshot, {}),
  }));
};

module.exports = {
  getAll,
  getBySection,
  updateSection,
  toggleVisibility,
  getHistory,
};
