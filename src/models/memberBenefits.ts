/**
 * Member Benefits Data Models
 * 
 * This module defines TypeScript interfaces and types for member benefits
 * data structure including benefit categories, descriptions, and eligibility.
 * 
 * @module models/memberBenefits
 */

import { z } from 'zod';

/**
 * Enum for benefit categories
 */
export enum BenefitCategory {
  HEALTH = 'health',
  FITNESS = 'fitness',
  WELLNESS = 'wellness',
  FINANCIAL = 'financial',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  TRAVEL = 'travel',
  SHOPPING = 'shopping',
  OTHER = 'other',
}

/**
 * Enum for membership tiers
 */
export enum MembershipTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * Enum for benefit status
 */
export enum BenefitStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
  EXPIRED = 'expired',
}

/**
 * Eligibility criteria for a benefit
 */
export interface BenefitEligibility {
  /** Minimum membership tier required */
  minTier: MembershipTier;
  /** Required membership duration in months */
  minMembershipMonths?: number;
  /** Specific member IDs eligible (if restricted) */
  restrictedToMembers?: string[];
  /** Geographic restrictions (country codes) */
  geographicRestrictions?: string[];
  /** Age restrictions */
  minAge?: number;
  maxAge?: number;
  /** Custom eligibility rules */
  customRules?: Record<string, unknown>;
}

/**
 * Usage limits for a benefit
 */
export interface BenefitUsageLimit {
  /** Maximum uses per member */
  maxUsesPerMember?: number;
  /** Maximum uses per time period */
  maxUsesPerPeriod?: number;
  /** Time period in days */
  periodDays?: number;
  /** Cooldown period between uses in days */
  cooldownDays?: number;
}

/**
 * Provider information for a benefit
 */
export interface BenefitProvider {
  /** Provider unique identifier */
  id: string;
  /** Provider name */
  name: string;
  /** Provider logo URL */
  logoUrl?: string;
  /** Provider website */
  website?: string;
  /** Provider contact information */
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

/**
 * Terms and conditions for a benefit
 */
export interface BenefitTerms {
  /** Terms and conditions text */
  text: string;
  /** URL to full terms document */
  url?: string;
  /** Last updated timestamp */
  lastUpdated: Date;
  /** Version number */
  version: string;
}

/**
 * Main member benefit interface
 */
export interface MemberBenefit {
  /** Unique benefit identifier */
  id: string;
  /** Benefit title */
  title: string;
  /** Short description */
  description: string;
  /** Detailed description (supports markdown) */
  detailedDescription?: string;
  /** Benefit category */
  category: BenefitCategory;
  /** Benefit status */
  status: BenefitStatus;
  /** Eligibility criteria */
  eligibility: BenefitEligibility;
  /** Usage limits */
  usageLimit?: BenefitUsageLimit;
  /** Benefit provider */
  provider?: BenefitProvider;
  /** Terms and conditions */
  terms?: BenefitTerms;
  /** Benefit value or discount percentage */
  value?: string;
  /** Icon or image URL */
  imageUrl?: string;
  /** Icon name (for icon libraries) */
  iconName?: string;
  /** Call-to-action text */
  ctaText?: string;
  /** Call-to-action URL */
  ctaUrl?: string;
  /** Featured benefit flag */
  isFeatured?: boolean;
  /** Display order/priority */
  displayOrder?: number;
  /** Valid from date */
  validFrom?: Date;
  /** Valid until date */
  validUntil?: Date;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Member benefit usage tracking
 */
export interface MemberBenefitUsage {
  /** Unique usage record identifier */
  id: string;
  /** Member identifier */
  memberId: string;
  /** Benefit identifier */
  benefitId: string;
  /** Usage timestamp */
  usedAt: Date;
  /** Usage location/context */
  location?: string;
  /** Additional usage details */
  details?: Record<string, unknown>;
}

/**
 * Member benefit enrollment
 */
export interface MemberBenefitEnrollment {
  /** Unique enrollment identifier */
  id: string;
  /** Member identifier */
  memberId: string;
  /** Benefit identifier */
  benefitId: string;
  /** Enrollment date */
  enrolledAt: Date;
  /** Enrollment status */
  status: 'active' | 'cancelled' | 'expired';
  /** Cancellation date */
  cancelledAt?: Date;
  /** Expiration date */
  expiresAt?: Date;
}

/**
 * Zod schema for benefit eligibility validation
 */
export const benefitEligibilitySchema = z.object({
  minTier: z.nativeEnum(MembershipTier),
  minMembershipMonths: z.number().min(0).optional(),
  restrictedToMembers: z.array(z.string()).optional(),
  geographicRestrictions: z.array(z.string()).optional(),
  minAge: z.number().min(0).max(150).optional(),
  maxAge: z.number().min(0).max(150).optional(),
  customRules: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for benefit usage limit validation
 */
export const benefitUsageLimitSchema = z.object({
  maxUsesPerMember: z.number().min(1).optional(),
  maxUsesPerPeriod: z.number().min(1).optional(),
  periodDays: z.number().min(1).optional(),
  cooldownDays: z.number().min(0).optional(),
});

/**
 * Zod schema for benefit provider validation
 */
export const benefitProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
});

/**
 * Zod schema for benefit terms validation
 */
export const benefitTermsSchema = z.object({
  text: z.string().min(1),
  url: z.string().url().optional(),
  lastUpdated: z.date(),
  version: z.string().min(1),
});

/**
 * Zod schema for member benefit validation
 */
export const memberBenefitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  detailedDescription: z.string().optional(),
  category: z.nativeEnum(BenefitCategory),
  status: z.nativeEnum(BenefitStatus),
  eligibility: benefitEligibilitySchema,
  usageLimit: benefitUsageLimitSchema.optional(),
  provider: benefitProviderSchema.optional(),
  terms: benefitTermsSchema.optional(),
  value: z.string().optional(),
  imageUrl: z.string().url().optional(),
  iconName: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url().optional(),
  isFeatured: z.boolean().optional(),
  displayOrder: z.number().min(0).optional(),
  validFrom: z.date().optional(),
  validUntil: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for member benefit usage validation
 */
export const memberBenefitUsageSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  benefitId: z.string().min(1),
  usedAt: z.date(),
  location: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for member benefit enrollment validation
 */
export const memberBenefitEnrollmentSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  benefitId: z.string().min(1),
  enrolledAt: z.date(),
  status: z.enum(['active', 'cancelled', 'expired']),
  cancelledAt: z.date().optional(),
  expiresAt: z.date().optional(),
});

/**
 * Type for creating a new member benefit (omits generated fields)
 */
export type CreateMemberBenefitInput = Omit<MemberBenefit, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Type for updating a member benefit (all fields optional except id)
 */
export type UpdateMemberBenefitInput = Partial<Omit<MemberBenefit, 'id' | 'createdAt'>> & {
  id: string;
};

/**
 * Type for benefit filter options
 */
export interface BenefitFilterOptions {
  categories?: BenefitCategory[];
  statuses?: BenefitStatus[];
  tiers?: MembershipTier[];
  isFeatured?: boolean;
  searchQuery?: string;
}

/**
 * Type for benefit sort options
 */
export interface BenefitSortOptions {
  field: 'title' | 'category' | 'displayOrder' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

/**
 * Type for paginated benefit results
 */
export interface PaginatedBenefits {
  benefits: MemberBenefit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Helper type for benefit category labels
 */
export const BenefitCategoryLabels: Record<BenefitCategory, string> = {
  [BenefitCategory.HEALTH]: 'Health',
  [BenefitCategory.FITNESS]: 'Fitness',
  [BenefitCategory.WELLNESS]: 'Wellness',
  [BenefitCategory.FINANCIAL]: 'Financial',
  [BenefitCategory.EDUCATION]: 'Education',
  [BenefitCategory.ENTERTAINMENT]: 'Entertainment',
  [BenefitCategory.TRAVEL]: 'Travel',
  [BenefitCategory.SHOPPING]: 'Shopping',
  [BenefitCategory.OTHER]: 'Other',
};

/**
 * Helper type for membership tier labels
 */
export const MembershipTierLabels: Record<MembershipTier, string> = {
  [MembershipTier.BASIC]: 'Basic',
  [MembershipTier.SILVER]: 'Silver',
  [MembershipTier.GOLD]: 'Gold',
  [MembershipTier.PLATINUM]: 'Platinum',
};

/**
 * Helper type for benefit status labels
 */
export const BenefitStatusLabels: Record<BenefitStatus, string> = {
  [BenefitStatus.ACTIVE]: 'Active',
  [BenefitStatus.INACTIVE]: 'Inactive',
  [BenefitStatus.COMING_SOON]: 'Coming Soon',
  [BenefitStatus.EXPIRED]: 'Expired',
};
```