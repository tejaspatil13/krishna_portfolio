export type ReelSource =
  | "upload"
  | "mp4"
  | "cloudinary"
  | "instagram"
  | "youtube"
  | "vimeo";

export interface Reel {
  id: string;
  source: ReelSource;
  /** Playable URL (file sources) or the original link (embed sources). */
  url: string;
  /** Provider id for embeds (Instagram shortcode, YouTube id, Vimeo id). */
  embedId?: string;
  poster?: string;
  /** Storage object paths for managed uploads — only these are ever deleted. */
  storagePath?: string;
  posterPath?: string;
  published: boolean;
  createdAt: string;
  /** Natural video size, used to keep the original aspect ratio (landscape or vertical). */
  width?: number;
  height?: number;
  /** The "best reel": featured first in the gallery and used as the finale of the intro. */
  featured?: boolean;
  /** Extra frames used by the intro's orbit ring. */
  stills?: string[];
  /** Where the intro's phone starts playing this reel (seconds). */
  introStart?: number;
  /** Original post (e.g. Instagram) this reel was taken from. */
  link?: string;
}

export interface Package {
  id: string;
  name: string;
  currency: string;
  price: string;
  priceNote: string;
  description: string;
  videoQuantity: string;
  revisions: string;
  delivery: string;
  features: string[];
  ctaLabel: string;
  visible: boolean;
  featured: boolean;
}

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
}

export interface SiteContent {
  version: 1;
  updatedAt: string;
  settings: {
    siteTitle: string;
    metaDescription: string;
    pricesReviewed: boolean;
  };
  hero: {
    eyebrow: string;
    headline: string;
    description: string;
    designation: string;
    tagline: string;
    primaryCta: string;
    secondaryCta: string;
  };
  work: {
    eyebrow: string;
    headline: string;
  };
  packagesSection: {
    eyebrow: string;
    headline: string;
    intro: string;
  };
  process: {
    eyebrow: string;
    headline: string;
    intro: string;
    steps: ProcessStep[];
  };
  contact: {
    headline: string;
    description: string;
    name: string;
    email: string;
    phone: string;
    whatsapp: string;
    whatsappMessage: string;
    /** Optional — left empty until Krishna adds a real profile link. */
    instagram: string;
  };
  reels: Reel[];
  packages: Package[];
}
