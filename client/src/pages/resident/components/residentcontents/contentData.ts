export interface ContentPost {
  id: string;
  badge: "Waste Tip" | "Event";
  title: string;
  description: string;
  body: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  images: string[];
  tags: string[];
  eventDate?: string; // ISO date for events
  isFeatured?: boolean;
  imageHeadline?: string;
  imageLine1?: string;
  imageLine2?: string;
  source?: string;
}

export const allTags = [
  "composting",
  "recycling",
  "cleanup",
  "segregation",
  "eco-brick",
  "food-waste",
  "tree-planting",
  "diy",
  "schedule",
  "zero-waste",
];

export const featuredPosts: ContentPost[] = [
  {
    id: "f1",
    badge: "Waste Tip",
    isFeatured: true,
    imageHeadline: "REDUCE & REFUSE",
    imageLine1: 'Think before you buy. Pause and ask: "Do I really need this?"',
    imageLine2: "Say NO to single-use plastics, excessive packaging, unnecessary items, and impulse purchases.",
    title: "Zero Waste in Action",
    description: "A practical guide to reducing waste at the source — starting with the choices you make every day.",
    body: "Zero waste living starts with a simple mindset shift. Before making any purchase, ask yourself: Do I really need this? Can I find a reusable alternative? The zero waste movement isn't about perfection — it's about making better choices, one decision at a time. Start by refusing single-use plastics. Bring your own bags, bottles, and containers. Choose products with minimal packaging. Support local businesses that prioritize sustainability. Remember, every piece of plastic ever made still exists. By reducing our consumption, we reduce the burden on our waste management systems and protect our environment for future generations. Here are five practical steps you can start today: First, audit your trash. Look at what you throw away most and find alternatives. Second, invest in reusable items — water bottles, shopping bags, food containers. Third, learn to say no to freebies and promotional items you don't need. Fourth, buy in bulk to reduce packaging waste. Fifth, support businesses with sustainable practices. The journey to zero waste is a marathon, not a sprint. Every small change adds up to make a big difference in our community.",
    source: "MENRO–CANDELARIA, QUEZON – National Zero Waste Month Tip of the Week",
    author: "MENRO Admin",
    date: "March 21, 2026",
    likes: 12,
    comments: 4,
    images: [],
    tags: ["zero-waste", "recycling"],
  },
  {
    id: "f2",
    badge: "Event",
    isFeatured: true,
    imageHeadline: "CLEAN-UP DRIVE",
    imageLine1: "Join us for a community-wide clean-up drive this weekend.",
    imageLine2: "Together we can make Candelaria cleaner and greener.",
    title: "Community Clean-Up Drive 2026",
    description: "A massive barangay-wide clean-up initiative bringing together residents, volunteers, and local officials.",
    body: "Mark your calendars! The annual Community Clean-Up Drive is happening this April 5th, 2026. This year, we're expanding our efforts to cover all major waterways, parks, and public spaces in Candelaria. Meeting point is at the Barangay Hall at 6:00 AM. Gloves, trash bags, and refreshments will be provided. Participants will receive a certificate of participation and a special eco-friendly kit. Last year's clean-up collected over 2 tons of waste and brought together more than 500 volunteers. Let's beat that record this year! Families with children are welcome — there will be a special kids' eco-activity area. Don't forget to wear comfortable clothes and bring your own water bottle. Together, we can make a visible difference in our community.",
    source: "MENRO–CANDELARIA, QUEZON – Quarterly Barangay Clean-Up",
    author: "MENRO Admin",
    date: "March 25, 2026",
    likes: 24,
    comments: 8,
    images: [],
    tags: ["cleanup", "tree-planting"],
    eventDate: "2026-04-05",
  },
];

export const normalPosts: ContentPost[] = [
  {
    id: "n1",
    badge: "Waste Tip",
    title: "Composting at Home: A Beginner's Guide",
    description: "Learn the basics of turning your kitchen scraps into nutrient-rich compost for your garden.",
    body: "Composting is one of the most rewarding ways to reduce your household waste while creating something valuable for your garden. In this comprehensive guide, we'll walk you through everything you need to know to start composting at home. First, choose your composting method. You can use a simple pile in your backyard, a tumbler composter, or even a worm bin for indoor composting. The key ingredients are green materials (fruit and vegetable scraps, coffee grounds, fresh grass clippings) and brown materials (dried leaves, cardboard, newspaper). Aim for a ratio of roughly 3 parts brown to 1 part green. Keep your compost moist like a wrung-out sponge, and turn it regularly to add oxygen. In 2-3 months, you'll have rich, dark compost ready to use in your garden. Avoid adding meat, dairy, or oily foods as these attract pests. With just a little effort, you can divert up to 30% of your household waste from the landfill.",
    author: "MENRO Admin",
    date: "March 18, 2026",
    likes: 15,
    comments: 6,
    images: [],
    tags: ["composting", "diy", "recycling"],
  },
  {
    id: "n2",
    badge: "Event",
    title: "Waste Segregation Reminder for All Residents",
    description: "A friendly reminder to all residents: please segregate your waste properly into biodegradable, recyclable, and residual bins.",
    body: "Proper waste segregation is the foundation of effective waste management. This reminder covers the three main categories: Biodegradable waste includes food scraps, garden trimmings, and paper. Recyclable waste includes plastics, metals, glass, and cardboard. Residual waste is everything else that cannot be composted or recycled. Please ensure each type goes into the correct bin on collection day. Improper segregation leads to contamination of recyclable materials and reduces the efficiency of our waste processing facilities. If you're unsure about which bin to use, check the waste segregation guide posted on the barangay bulletin board or contact MENRO for assistance.",
    author: "MENRO Admin",
    date: "March 15, 2026",
    likes: 8,
    comments: 3,
    images: [],
    tags: ["segregation", "recycling"],
    eventDate: "2026-03-20",
  },
  {
    id: "n3",
    badge: "Waste Tip",
    title: "Before & After: Riverside Cleanup Results",
    description: "See the incredible transformation of our riverside area after last weekend's community cleanup effort.",
    body: "Last weekend's riverside cleanup was a tremendous success! Over 200 volunteers came together to clean the riverbanks in Barangay Malabanban Norte. The results speak for themselves — we collected over 800 kilograms of waste, including plastic bottles, food packaging, and discarded fishing nets. The before and after photos show a dramatic transformation. What was once a littered, polluted waterway now looks clean and inviting. But our work isn't done. We need to address the root causes of river pollution through better waste management practices and community education. Special thanks to the volunteer coordinators, the local government unit for providing equipment, and every single volunteer who gave their time.",
    author: "MENRO Admin",
    date: "March 12, 2026",
    likes: 22,
    comments: 9,
    images: [],
    tags: ["cleanup", "recycling"],
  },
  {
    id: "n4",
    badge: "Event",
    title: "Eco-Brick Workshop This Saturday",
    description: "Join us for a hands-on workshop where you'll learn how to create eco-bricks from plastic waste.",
    body: "Learn the art of eco-brick making! This Saturday at the Candelaria Community Center, we'll teach you how to transform soft plastic waste into durable building blocks. Eco-bricks are plastic bottles packed tightly with clean, dry plastic waste. These can be used for construction, furniture, and garden projects. The workshop runs from 9 AM to 12 PM. All materials will be provided, but we encourage you to bring your own clean plastic waste. Each participant will make at least two eco-bricks to take home. No prior experience needed — our trained facilitators will guide you through every step. This is a family-friendly event, and children aged 8 and above are welcome to participate with parental supervision.",
    author: "MENRO Admin",
    date: "March 10, 2026",
    likes: 18,
    comments: 5,
    images: [],
    tags: ["eco-brick", "diy", "recycling"],
    eventDate: "2026-04-12",
  },
  {
    id: "n5",
    badge: "Waste Tip",
    title: "How to Reduce Food Waste at Home",
    description: "Simple tips and tricks to minimize food waste in your household and save money in the process.",
    body: "Did you know that the average household wastes about 30% of the food they buy? That's money literally going into the trash. Here are proven strategies to reduce food waste: Plan your meals before shopping and stick to your list. Store food properly — learn which fruits and vegetables should be refrigerated and which shouldn't. Use the FIFO method (First In, First Out) to organize your pantry and fridge. Get creative with leftovers — yesterday's rice becomes today's fried rice. Learn to read expiration dates correctly — 'best before' doesn't mean 'unsafe after.' Freeze excess food before it goes bad. Compost whatever you can't eat. Start a food waste diary to track what you throw away most, then adjust your buying habits accordingly. Small changes in your kitchen routine can save your family thousands of pesos per year while reducing your environmental footprint.",
    author: "MENRO Admin",
    date: "March 8, 2026",
    likes: 19,
    comments: 7,
    images: [],
    tags: ["food-waste", "composting", "diy"],
  },
  {
    id: "n6",
    badge: "Event",
    title: "Tree Planting Activity in Barangay Park",
    description: "Be part of the greening initiative! Help us plant native trees in the barangay park this Sunday.",
    body: "Join our tree planting activity this Sunday at Barangay Park! We'll be planting 100 native tree seedlings including narra, molave, and kamagong. This activity is part of MENRO's long-term reforestation program aimed at increasing the green cover in urban areas. Participants will learn about native tree species, proper planting techniques, and tree care. Each participant gets to adopt a tree and will receive updates on its growth. The activity starts at 7 AM and ends at 11 AM. Light snacks and drinks will be provided. Please wear comfortable clothes and bring gardening gloves if you have them. This is a great activity for families and community groups.",
    author: "MENRO Admin",
    date: "March 5, 2026",
    likes: 31,
    comments: 12,
    images: [],
    tags: ["tree-planting", "cleanup"],
    eventDate: "2026-03-15",
  },
  {
    id: "n7",
    badge: "Waste Tip",
    title: "DIY Natural Cleaning Solutions",
    description: "Ditch the chemicals! Learn how to make effective cleaning solutions from everyday household items.",
    body: "Commercial cleaning products often contain harsh chemicals that end up in our waterways and harm the environment. The good news? You can make effective, eco-friendly cleaning solutions right at home. For an all-purpose cleaner, mix equal parts white vinegar and water in a spray bottle. Add a few drops of essential oil for a pleasant scent. For tougher jobs, make a paste with baking soda and water. Lemon juice is excellent for removing stains and disinfecting surfaces. For glass cleaning, mix 2 tablespoons of white vinegar with 1 liter of water. These natural solutions are not only better for the environment — they're also safer for your family and much cheaper than commercial alternatives. Start with one or two recipes and gradually replace your chemical cleaners.",
    author: "MENRO Admin",
    date: "March 2, 2026",
    likes: 14,
    comments: 3,
    images: [],
    tags: ["diy", "recycling"],
  },
  {
    id: "n8",
    badge: "Event",
    title: "Recycling Collection Schedule Update",
    description: "Please take note of the updated recycling collection schedule effective this month.",
    body: "Important update: The recycling collection schedule for all barangays in Candelaria has been updated effective April 2026. Biodegradable waste will now be collected every Monday and Thursday. Recyclable materials will be collected every Tuesday and Friday. Residual waste collection remains on Wednesdays and Saturdays. Special collection for bulky items and e-waste will be on the last Saturday of each month. Please have your properly segregated waste ready by 6:00 AM on collection days. Place bins at the designated pickup points in front of your property. For missed collections, contact the MENRO hotline at (042) 555-0123. This schedule change aims to improve collection efficiency and reduce the time waste sits uncollected in our communities.",
    author: "MENRO Admin",
    date: "February 28, 2026",
    likes: 7,
    comments: 2,
    images: [],
    tags: ["schedule", "segregation"],
    eventDate: "2026-02-15",
  },
];

export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function isEventPast(eventDate?: string): boolean {
  if (!eventDate) return false;
  return new Date(eventDate) < new Date();
}

export function formatEventDate(eventDate: string): { month: string; day: string } {
  const d = new Date(eventDate);
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
  };
}
