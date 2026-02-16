/**
 * Member Benefits Data Models
 * 
 * This module defines TypeScript interfaces and types for member benefits data structures.
 * Used across the application to ensure type safety when working with member benefits data.
 * 
 * @module models/memberBenefits
 */

/**
 * Represents the category of a benefit
 */
export enum BenefitCategory {
  HEALTH = 'health',
  FITNESS = 'fitness',
  WELLNESS = 'wellness',
  FINANCIAL = 'financial',
  ENTERTAINMENT = 'entertainment',
  TRAVEL = 'travel',
  EDUCATION = 'education',
  SHOPPING = 'shopping',
  OTHER = 'other',
}

/**
 * Represents the status of a benefit
 */
export enum BenefitStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
  EXPIRED = 'expired',
}

/**
 * Represents the tier level of membership
 */
export enum MembershipTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * Represents a single benefit item
 */
export interface BenefitItem {
  /** Unique identifier for the benefit */
  id: string;
  
  /** Display name of the benefit */
  title: string;
  
  /** Detailed description of the benefit */
  description: string;
  
  /** Short summary for preview/card display */
  summary?: string;
  
  /** Category classification of the benefit */
  category: BenefitCategory;
  
  /** Current status of the benefit */
  status: BenefitStatus;
  
  /** Minimum membership tier required to access this benefit */
  requiredTier: MembershipTier;
  
  /** URL to benefit icon/image */
  iconUrl?: string;
  
  /** URL to detailed benefit image */
  imageUrl?: string;
  
  /** External link for more information or redemption */
  externalUrl?: string;
  
  /** Terms and conditions text */
  termsAndConditions?: string;
  
  /** Date when the benefit becomes available */
  startDate?: string;
  
  /** Date when the benefit expires */
  endDate?: string;
  
  /** Discount percentage if applicable */
  discountPercentage?: number;
  
  /** Discount amount in currency if applicable */
  discountAmount?: number;
  
  /** Currency code for discount amount (e.g., 'USD', 'EUR') */
  currency?: string;
  
  /** Maximum number of times this benefit can be used */
  usageLimit?: number;
  
  /** Number of times the member has used this benefit */
  usageCount?: number;
  
  /** Whether this benefit is featured/highlighted */
  isFeatured?: boolean;
  
  /** Display order/priority */
  sortOrder?: number;
  
  /** Tags for filtering and search */
  tags?: string[];
  
  /** Provider/partner name offering the benefit */
  provider?: string;
  
  /** Contact information for benefit inquiries */
  contactInfo?: string;
  
  /** Timestamp when the benefit was created */
  createdAt?: string;
  
  /** Timestamp when the benefit was last updated */
  updatedAt?: string;
}

/**
 * Represents metadata about the member's benefits
 */
export interface MemberBenefitsMetadata {
  /** Total number of benefits available to the member */
  totalBenefits: number;
  
  /** Number of active benefits */
  activeBenefits: number;
  
  /** Number of used benefits */
  usedBenefits: number;
  
  /** Member's current tier level */
  membershipTier: MembershipTier;
  
  /** Date when membership started */
  memberSince?: string;
  
  /** Date when membership expires */
  membershipExpiresAt?: string;
  
  /** Whether the membership is currently active */
  isActive: boolean;
  
  /** Total savings amount from benefits used */
  totalSavings?: number;
  
  /** Currency code for savings amount */
  savingsCurrency?: string;
}

/**
 * Represents the complete response for member benefits
 */
export interface MemberBenefitsResponse {
  /** Array of benefit items available to the member */
  benefits: BenefitItem[];
  
  /** Metadata about the member's benefits */
  metadata: MemberBenefitsMetadata;
  
  /** Timestamp of when the data was fetched */
  fetchedAt?: string;
  
  /** Optional error message if partial data */
  error?: string;
}

/**
 * Represents filters for querying benefits
 */
export interface BenefitFilters {
  /** Filter by category */
  category?: BenefitCategory | BenefitCategory[];
  
  /** Filter by status */
  status?: BenefitStatus | BenefitStatus[];
  
  /** Filter by required tier */
  requiredTier?: MembershipTier | MembershipTier[];
  
  /** Filter by featured status */
  isFeatured?: boolean;
  
  /** Search query for title/description */
  searchQuery?: string;
  
  /** Filter by tags */
  tags?: string[];
  
  /** Filter by provider */
  provider?: string;
}

/**
 * Represents sorting options for benefits
 */
export interface BenefitSortOptions {
  /** Field to sort by */
  field: 'title' | 'category' | 'startDate' | 'endDate' | 'sortOrder' | 'createdAt' | 'updatedAt';
  
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Represents pagination options for benefits list
 */
export interface BenefitPaginationOptions {
  /** Page number (1-indexed) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
}

/**
 * Represents a paginated response for benefits
 */
export interface PaginatedBenefitsResponse {
  /** Array of benefit items for the current page */
  benefits: BenefitItem[];
  
  /** Pagination metadata */
  pagination: {
    /** Current page number */
    currentPage: number;
    
    /** Number of items per page */
    pageSize: number;
    
    /** Total number of items */
    totalItems: number;
    
    /** Total number of pages */
    totalPages: number;
    
    /** Whether there is a next page */
    hasNextPage: boolean;
    
    /** Whether there is a previous page */
    hasPreviousPage: boolean;
  };
  
  /** Applied filters */
  filters?: BenefitFilters;
  
  /** Applied sorting */
  sort?: BenefitSortOptions;
}

/**
 * Represents a request to redeem a benefit
 */
export interface BenefitRedemptionRequest {
  /** ID of the benefit to redeem */
  benefitId: string;
  
  /** Member ID redeeming the benefit */
  memberId: string;
  
  /** Optional redemption code */
  redemptionCode?: string;
  
  /** Additional metadata for the redemption */
  metadata?: Record<string, unknown>;
}

/**
 * Represents the response after redeeming a benefit
 */
export interface BenefitRedemptionResponse {
  /** Whether the redemption was successful */
  success: boolean;
  
  /** Unique redemption ID */
  redemptionId?: string;
  
  /** Updated benefit item with new usage count */
  benefit?: BenefitItem;
  
  /** Redemption confirmation code */
  confirmationCode?: string;
  
  /** Error message if redemption failed */
  error?: string;
  
  /** Timestamp of redemption */
  redeemedAt?: string;
}

/**
 * Type guard to check if a value is a valid BenefitCategory
 */
export function isBenefitCategory(value: unknown): value is BenefitCategory {
  return Object.values(BenefitCategory).includes(value as BenefitCategory);
}

/**
 * Type guard to check if a value is a valid BenefitStatus
 */
export function isBenefitStatus(value: unknown): value is BenefitStatus {
  return Object.values(BenefitStatus).includes(value as BenefitStatus);
}

/**
 * Type guard to check if a value is a valid MembershipTier
 */
export function isMembershipTier(value: unknown): value is MembershipTier {
  return Object.values(MembershipTier).includes(value as MembershipTier);
}

/**
 * Type for creating a new benefit (omits auto-generated fields)
 */
export type CreateBenefitInput = Omit<BenefitItem, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>;

/**
 * Type for updating an existing benefit (all fields optional except id)
 */
export type UpdateBenefitInput = Partial<Omit<BenefitItem, 'id' | 'createdAt' | 'updatedAt'>> & {
  id: string;
};
```