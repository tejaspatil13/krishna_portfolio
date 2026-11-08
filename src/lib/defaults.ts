import type { SiteContent } from "./types";

/**
 * Initial content. Everything here is editable from /admin — nothing on the
 * public site is hardcoded beyond this seed. Package prices are placeholders
 * (the reference design shows none) and are flagged on the admin dashboard
 * until Krishna reviews them.
 */
export const DEFAULT_CONTENT: SiteContent = {
  version: 1,
  updatedAt: "2026-11-08T00:00:00.000Z",
  settings: {
    siteTitle: "Krishna Patil | Professional Video Editor & Creative Content Producer",
    metaDescription:
      "Krishna Patil — video editor, reel editor and motion graphics artist. Cinematic editing, social media reels and storytelling that turn ordinary footage into extraordinary visual stories.",
    pricesReviewed: false,
  },
  hero: {
    eyebrow: "Krishna Patil",
    headline: "We make every frame matter.",
    description:
      "Creative video editing, cinematic storytelling, and powerful motion graphics that turn ideas into unforgettable visual experiences.",
    designation: "Video Editor · Reel Editor · Motion Graphics Artist",
    tagline: "We turn ordinary footage into extraordinary visual stories.",
    primaryCta: "Explore the work",
    secondaryCta: "Start a project",
  },
  work: {
    eyebrow: "Watch",
    headline: "The Work",
  },
  packagesSection: {
    eyebrow: "Packages",
    headline: "Pick your cut.",
    intro:
      "Clear packages for creators and brands. Need something custom? Every project can be tailored.",
  },
  process: {
    eyebrow: "How we work",
    headline: "From your idea to the final frame.",
    intro:
      "Every great video starts with an idea. We combine creative thinking, professional editing, storytelling, and attention to detail to turn your vision into high-quality content.",
    steps: [
      {
        id: "step-1",
        title: "Creative Brief",
        description: "Understand the client's vision, objective, audience, and references.",
      },
      {
        id: "step-2",
        title: "Footage Analysis",
        description: "Inspect raw footage, identify the best shots, and select the strongest takes.",
      },
      {
        id: "step-3",
        title: "Storytelling & Editing",
        description: "Build the timeline, arrange footage, create pacing, and structure the story.",
      },
      {
        id: "step-4",
        title: "Motion Graphics & Visual Effects",
        description: "Add kinetic typography, animated elements, transitions, and creative visual effects.",
      },
      {
        id: "step-5",
        title: "Sound Design & Color",
        description: "Clean audio, balance music, create sound effects, and professionally grade the footage.",
      },
      {
        id: "step-6",
        title: "Final Delivery",
        description: "Review the complete video, make corrections, and export high-quality content.",
      },
    ],
  },
  contact: {
    headline: "Let's create something worth watching.",
    description: "Have a story, an idea, or a project in mind? Let's turn it into a visual experience.",
    name: "Krishna Patil",
    email: "patilkrishna7804@gmail.com",
    phone: "+91 84858 91427",
    whatsapp: "+91 84858 91427",
    whatsappMessage: "Hi Krishna, I saw your portfolio and would like to discuss a video project.",
    instagram: "",
  },
  // Krishna's three reels, hosted with the site so they play directly in the gallery.
  reels: [
    {
      id: "reel-rocket",
      source: "mp4",
      url: "/reels/reel1.mp4",
      poster: "/reels/poster1.jpg",
      width: 1080,
      height: 608,
      featured: true,
      introStart: 7.5,
      stills: ["/reels/still1.jpg", "/reels/still2.jpg", "/reels/still3.jpg", "/reels/still4.jpg"],
      link: "https://www.instagram.com/reel/DVLy1R7iCgw/",
      published: true,
      createdAt: "2026-11-08T00:00:03.000Z",
    },
    {
      id: "reel-legends",
      source: "mp4",
      url: "/reels/reel2.mp4",
      poster: "/reels/poster2.jpg",
      width: 1280,
      height: 720,
      stills: ["/reels/still5.jpg", "/reels/still6.jpg", "/reels/still7.jpg"],
      link: "https://www.instagram.com/reel/DZh-X8ONF7q/",
      published: true,
      createdAt: "2026-11-08T00:00:02.000Z",
    },
    {
      id: "reel-jatt",
      source: "mp4",
      url: "/reels/reel3.mp4",
      poster: "/reels/poster3.jpg",
      width: 1276,
      height: 718,
      stills: ["/reels/still8.jpg", "/reels/still9.jpg", "/reels/still10.jpg", "/reels/still11.jpg", "/reels/still12.jpg"],
      link: "https://www.instagram.com/reel/DWMIvgPCJkT/",
      published: true,
      createdAt: "2026-11-08T00:00:01.000Z",
    },
  ],
  packages: [
    {
      id: "pkg-starter",
      name: "Starter Cut",
      currency: "₹",
      price: "2,999",
      priceNote: "per reel",
      description: "A single scroll-stopping reel, cut tight for social.",
      videoQuantity: "1 reel (up to 60 sec)",
      revisions: "2 revisions",
      delivery: "3 days",
      features: [
        "Clean cuts & pacing",
        "Captions / subtitles",
        "Music & basic sound design",
        "Colour correction",
      ],
      ctaLabel: "Book Starter",
      visible: true,
      featured: false,
    },
    {
      id: "pkg-creator",
      name: "Creator Pack",
      currency: "₹",
      price: "9,999",
      priceNote: "per month",
      description:
        "A steady stream of premium reels with motion graphics and a consistent look for your brand.",
      videoQuantity: "4 reels (up to 90 sec each)",
      revisions: "3 revisions per reel",
      delivery: "4–5 days per reel",
      features: [
        "Storytelling & hook-first editing",
        "Motion graphics & animated text",
        "Sound design & SFX",
        "Cinematic colour grade",
        "Thumbnail / cover frame",
      ],
      ctaLabel: "Book Creator Pack",
      visible: true,
      featured: true,
    },
    {
      id: "pkg-studio",
      name: "Studio",
      currency: "₹",
      price: "24,999",
      priceNote: "per project",
      description:
        "Brand films, promos and campaign edits with full creative direction.",
      videoQuantity: "Up to 10 videos or 1 brand film",
      revisions: "Unlimited within scope",
      delivery: "Agreed per project",
      features: [
        "Creative direction & scripting support",
        "Advanced motion graphics & VFX",
        "Full sound design & mix",
        "Multi-platform exports",
      ],
      ctaLabel: "Book Studio",
      visible: true,
      featured: false,
    },
  ],
};
