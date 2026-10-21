export type PublicSpecialistAvailability =
  | "available"
  | "busy"
  | "away"
  | "unknown";

export interface PublicSpecialistRating {
  average: number;
  count: number;
}

export interface PublicSpecialistCard {
  id: number;
  slug: string;
  title: string;
  verified: boolean;
  rating: PublicSpecialistRating | null;
  avatarUrl: string | null;
  availability: PublicSpecialistAvailability;
  categories: string[];
  cities: string[];
}

export interface PublicPortfolioImage { id: number; url: string; type: 'image'; caption: string; }

export interface PublicSpecialistDetail extends PublicSpecialistCard {
  description: string | null;
  bio: string | null;
  skills: string | null;
  experienceYears: number | null;
  responseMinutes: number | null;
  priceHint: string | null;
  address: string | null;
  phoneDisplay: string | null;
  coordinates: { lat: number; lng: number } | null;
  verifiedAt: string | null;
  /** Only normalized public images; unsupported legacy media remains unavailable. */
  gallery: "empty" | "unavailable" | PublicPortfolioImage[];
  /** The plugin endpoint has no trustworthy public review records. */
  reviews: "unavailable";
}

export interface PublicSpecialistCatalog {
  items: PublicSpecialistCard[];
  page: number;
  total: number;
  pages: number;
}

export interface PublicSpecialistSearchParams {
  q: string;
  category: string;
  city: string;
  verified: boolean;
  page: number;
  perPage: number;
}

export type PublicSpecialistSearchInput = Record<
  string,
  string | string[] | undefined
>;

export type PublicTaxonomy = "job_category" | "city" | "neighborhood";

export interface PublicTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent?: number;
}
