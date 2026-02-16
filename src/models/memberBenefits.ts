/**
 * Member Benefits Data Models
 * 
 * This module defines TypeScript interfaces and types for member benefits data structure
 * including benefit categories, descriptions, and eligibility criteria.
 * 
 * @module models/memberBenefits
 */

import { z } from 'zod';

/**
 * Enum representing different benefit categories
 */
export enum BenefitCategory {
  HEALTH = 'health',
  WELLNESS = 'wellness',
  FINANCIAL = 'financial',
  EDUCATION = 'education',
  TRAVEL = 'travel',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

/**
 * Enum representing membership tiers
 */
export enum MembershipTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * Enum representing benefit status
 */
export enum BenefitStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
  EXPIRED = 'expired',
}

/**
 * Interface for benefit eligibility criteria
 */
export interface BenefitEligibility {
  /** Minimum membership tier required */
  minimumTier: MembershipTier;
  /** Minimum membership duration in months */
  minimumMembershipMonths?: number;
  /** Specific age requirements */
  ageRequirement?: {
    minimum?: number;
    maximum?: number;
  };
  /** Geographic restrictions */
  geographicRestrictions?: string[];
  /** Additional custom requirements */
  customRequirements?: string[];
}

/**
 * Interface for benefit usage limits
 */
export interface BenefitUsageLimit {
  /** Maximum number of uses per period */
  maxUses?: number;
  /** Period type (daily, weekly, monthly, yearly) */
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** Maximum monetary value */
  maxValue?: number;
  /** Currency code */
  currency?: string;
}

/**
 * Interface for benefit provider information
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
 * Main interface for member benefit
 */
export interface MemberBenefit {
  /** Unique identifier for the benefit */
  id: string;
  /** Benefit title */
  title: string;
  /** Detailed description of the benefit */
  description: string;
  /** Short summary for display in lists */
  shortDescription?: string;
  /** Benefit category */
  category: BenefitCategory;
  /** Current status of the benefit */
  status: BenefitStatus;
  /** Eligibility criteria */
  eligibility: BenefitEligibility;
  /** Usage limits */
  usageLimit?: BenefitUsageLimit;
  /** Benefit provider information */
  provider?: BenefitProvider;
  /** Icon or image URL */
  imageUrl?: string;
  /** Icon name for UI rendering */
  iconName?: string;
  /** Terms and conditions URL */
  termsUrl?: string;
  /** How to redeem instructions */
  redemptionInstructions?: string;
  /** Redemption URL or code */
  redemptionUrl?: string;
  /** Start date of benefit availability */
  startDate?: Date;
  /** End date of benefit availability */
  endDate?: Date;
  /** Featured flag for highlighting */
  featured?: boolean;
  /** Sort order for display */
  sortOrder?: number;
  /** Tags for filtering and search */
  tags?: string[];
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Interface for member benefit usage tracking
 */
export interface BenefitUsage {
  /** Unique identifier for the usage record */
  id: string;
  /** Member ID */
  memberId: string;
  /** Benefit ID */
  benefitId: string;
  /** Usage timestamp */
  usedAt: Date;
  /** Value of benefit used */
  valueUsed?: number;
  /** Currency code */
  currency?: string;
  /** Additional usage metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for member benefit enrollment
 */
export interface BenefitEnrollment {
  /** Unique identifier for the enrollment */
  id: string;
  /** Member ID */
  memberId: string;
  /** Benefit ID */
  benefitId: string;
  /** Enrollment date */
  enrolledAt: Date;
  /** Enrollment status */
  status: 'active' | 'cancelled' | 'suspended';
  /** Cancellation date if applicable */
  cancelledAt?: Date;
  /** Notes or comments */
  notes?: string;
}

/**
 * Zod schema for benefit eligibility validation
 */
export const benefitEligibilitySchema = z.object({
  minimumTier: z.nativeEnum(MembershipTier),
  minimumMembershipMonths: z.number().min(0).optional(),
  ageRequirement: z.object({
    minimum: z.number().min(0).optional(),
    maximum: z.number().min(0).optional(),
  }).optional(),
  geographicRestrictions: z.array(z.string()).optional(),
  customRequirements: z.array(z.string()).optional(),
});

/**
 * Zod schema for benefit usage limit validation
 */
export const benefitUsageLimitSchema = z.object({
  maxUses: z.number().min(1).optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  maxValue: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
});

/**
 * Zod schema for benefit provider validation
 */
export const benefitProviderSchema = z.object({
  id: z.string().uuid(),
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
 * Zod schema for member benefit validation
 */
export const memberBenefitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  shortDescription: z.string().max(500).optional(),
  category: z.nativeEnum(BenefitCategory),
  status: z.nativeEnum(BenefitStatus),
  eligibility: benefitEligibilitySchema,
  usageLimit: benefitUsageLimitSchema.optional(),
  provider: benefitProviderSchema.optional(),
  imageUrl: z.string().url().optional(),
  iconName: z.string().optional(),
  termsUrl: z.string().url().optional(),
  redemptionInstructions: z.string().optional(),
  redemptionUrl: z.string().url().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Zod schema for benefit usage validation
 */
export const benefitUsageSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  benefitId: z.string().uuid(),
  usedAt: z.date(),
  valueUsed: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for benefit enrollment validation
 */
export const benefitEnrollmentSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  benefitId: z.string().uuid(),
  enrolledAt: z.date(),
  status: z.enum(['active', 'cancelled', 'suspended']),
  cancelledAt: z.date().optional(),
  notes: z.string().optional(),
});

/**
 * Type for creating a new member benefit (without system-generated fields)
 */
export type CreateMemberBenefitInput = Omit<MemberBenefit, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Type for updating a member benefit (all fields optional except id)
 */
export type UpdateMemberBenefitInput = Partial<Omit<MemberBenefit, 'id' | 'createdAt'>> & {
  id: string;
};

/**
 * Type for benefit filter criteria
 */
export interface BenefitFilterCriteria {
  category?: BenefitCategory[];
  status?: BenefitStatus[];
  membershipTier?: MembershipTier;
  featured?: boolean;
  tags?: string[];
  searchQuery?: string;
}

/**
 * Type for benefit sort options
 */
export interface BenefitSortOptions {
  field: 'title' | 'category' | 'createdAt' | 'updatedAt' | 'sortOrder';
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
export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  [BenefitCategory.HEALTH]: 'Health',
  [BenefitCategory.WELLNESS]: 'Wellness',
  [BenefitCategory.FINANCIAL]: 'Financial',
  [BenefitCategory.EDUCATION]: 'Education',
  [BenefitCategory.TRAVEL]: 'Travel',
  [BenefitCategory.ENTERTAINMENT]: 'Entertainment',
  [BenefitCategory.SHOPPING]: 'Shopping',
  [BenefitCategory.INSURANCE]: 'Insurance',
  [BenefitCategory.OTHER]: 'Other',
};

/**
 * Helper type for membership tier labels
 */
export const MEMBERSHIP_TIER_LABELS: Record<MembershipTier, string> = {
  [MembershipTier.BASIC]: 'Basic',
  [MembershipTier.SILVER]: 'Silver',
  [MembershipTier.GOLD]: 'Gold',
  [MembershipTier.PLATINUM]: 'Platinum',
};

/**
 * Helper type for benefit status labels
 */
export const BENEFIT_STATUS_LABELS: Record<BenefitStatus, string> = {
  [BenefitStatus.ACTIVE]: 'Active',
  [BenefitStatus.INACTIVE]: 'Inactive',
  [BenefitStatus.COMING_SOON]: 'Coming Soon',
  [BenefitStatus.EXPIRED]: 'Expired',
};
```