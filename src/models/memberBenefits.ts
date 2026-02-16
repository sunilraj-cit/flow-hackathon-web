/**
 * Member Benefits Models
 * 
 * TypeScript interfaces and types for member benefits data structure and API responses.
 * Used for displaying and managing member benefits information throughout the application.
 * 
 * @module models/memberBenefits
 */

import { z } from 'zod';

/**
 * Enum for benefit categories
 */
export enum BenefitCategory {
  HEALTH = 'health',
  WELLNESS = 'wellness',
  FINANCIAL = 'financial',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  TRAVEL = 'travel',
  SHOPPING = 'shopping',
  OTHER = 'other',
}

/**
 * Enum for benefit status
 */
export enum BenefitStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  EXPIRED = 'expired',
}

/**
 * Enum for benefit eligibility status
 */
export enum EligibilityStatus {
  ELIGIBLE = 'eligible',
  NOT_ELIGIBLE = 'not_eligible',
  PENDING_VERIFICATION = 'pending_verification',
}

/**
 * Interface for benefit provider information
 */
export interface BenefitProvider {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * Interface for benefit eligibility criteria
 */
export interface EligibilityCriteria {
  membershipLevel?: string[];
  membershipDuration?: number; // in months
  ageRange?: {
    min?: number;
    max?: number;
  };
  location?: string[];
  customCriteria?: Record<string, unknown>;
}

/**
 * Interface for benefit usage tracking
 */
export interface BenefitUsage {
  benefitId: string;
  memberId: string;
  usedAt: string;
  usageCount: number;
  lastUsedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for benefit redemption details
 */
export interface RedemptionDetails {
  code?: string;
  instructions?: string;
  expiresAt?: string;
  redemptionUrl?: string;
  termsAndConditions?: string;
  limitations?: string;
}

/**
 * Main interface for a member benefit
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: BenefitCategory;
  status: BenefitStatus;
  provider: BenefitProvider;
  eligibilityCriteria: EligibilityCriteria;
  redemptionDetails?: RedemptionDetails;
  imageUrl?: string;
  thumbnailUrl?: string;
  value?: string;
  discount?: string;
  maxUsagePerMember?: number;
  totalUsageLimit?: number;
  currentUsageCount?: number;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  priority?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for member benefit enrollment
 */
export interface MemberBenefitEnrollment {
  id: string;
  memberId: string;
  benefitId: string;
  eligibilityStatus: EligibilityStatus;
  enrolledAt: string;
  expiresAt?: string;
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for paginated benefits list
 */
export interface PaginatedBenefits {
  benefits: MemberBenefit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Interface for benefit filters
 */
export interface BenefitFilters {
  category?: BenefitCategory[];
  status?: BenefitStatus[];
  featured?: boolean;
  search?: string;
  tags?: string[];
  providerId?: string;
}

/**
 * Interface for benefit sort options
 */
export interface BenefitSortOptions {
  field: 'title' | 'createdAt' | 'priority' | 'startDate' | 'endDate';
  order: 'asc' | 'desc';
}

/**
 * API Response types
 */

export interface GetBenefitsResponse {
  success: boolean;
  data: PaginatedBenefits;
  message?: string;
}

export interface GetBenefitByIdResponse {
  success: boolean;
  data: MemberBenefit;
  message?: string;
}

export interface GetMemberEnrollmentsResponse {
  success: boolean;
  data: MemberBenefitEnrollment[];
  message?: string;
}

export interface EnrollBenefitResponse {
  success: boolean;
  data: MemberBenefitEnrollment;
  message?: string;
}

export interface RedeemBenefitResponse {
  success: boolean;
  data: {
    enrollment: MemberBenefitEnrollment;
    usage: BenefitUsage;
  };
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Zod schemas for validation
 */

export const benefitProviderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const eligibilityCriteriaSchema = z.object({
  membershipLevel: z.array(z.string()).optional(),
  membershipDuration: z.number().int().positive().optional(),
  ageRange: z.object({
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
  }).optional(),
  location: z.array(z.string()).optional(),
  customCriteria: z.record(z.unknown()).optional(),
});

export const redemptionDetailsSchema = z.object({
  code: z.string().optional(),
  instructions: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  redemptionUrl: z.string().url().optional(),
  termsAndConditions: z.string().optional(),
  limitations: z.string().optional(),
});

export const memberBenefitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.nativeEnum(BenefitCategory),
  status: z.nativeEnum(BenefitStatus),
  provider: benefitProviderSchema,
  eligibilityCriteria: eligibilityCriteriaSchema,
  redemptionDetails: redemptionDetailsSchema.optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  value: z.string().optional(),
  discount: z.string().optional(),
  maxUsagePerMember: z.number().int().positive().optional(),
  totalUsageLimit: z.number().int().positive().optional(),
  currentUsageCount: z.number().int().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  featured: z.boolean().optional(),
  priority: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export const memberBenefitEnrollmentSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  benefitId: z.string().uuid(),
  eligibilityStatus: z.nativeEnum(EligibilityStatus),
  enrolledAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  usageCount: z.number().int().nonnegative(),
  lastUsedAt: z.string().datetime().optional(),
  isActive: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});

export const benefitFiltersSchema = z.object({
  category: z.array(z.nativeEnum(BenefitCategory)).optional(),
  status: z.array(z.nativeEnum(BenefitStatus)).optional(),
  featured: z.boolean().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  providerId: z.string().uuid().optional(),
});

export const benefitSortOptionsSchema = z.object({
  field: z.enum(['title', 'createdAt', 'priority', 'startDate', 'endDate']),
  order: z.enum(['asc', 'desc']),
});

/**
 * Type guards
 */

export function isMemberBenefit(value: unknown): value is MemberBenefit {
  return memberBenefitSchema.safeParse(value).success;
}

export function isMemberBenefitEnrollment(value: unknown): value is MemberBenefitEnrollment {
  return memberBenefitEnrollmentSchema.safeParse(value).success;
}

/**
 * Utility types
 */

export type CreateMemberBenefitInput = Omit<MemberBenefit, 'id' | 'createdAt' | 'updatedAt' | 'currentUsageCount'>;
export type UpdateMemberBenefitInput = Partial<CreateMemberBenefitInput>;
export type EnrollBenefitInput = Pick<MemberBenefitEnrollment, 'memberId' | 'benefitId'>;
export type RedeemBenefitInput = Pick<BenefitUsage, 'benefitId' | 'memberId'> & { metadata?: Record<string, unknown> };

/**
 * Constants
 */

export const BENEFIT_CATEGORY_LABELS: Record<BenefitCategory, string> = {
  [BenefitCategory.HEALTH]: 'Health',
  [BenefitCategory.WELLNESS]: 'Wellness',
  [BenefitCategory.FINANCIAL]: 'Financial',
  [BenefitCategory.EDUCATION]: 'Education',
  [BenefitCategory.ENTERTAINMENT]: 'Entertainment',
  [BenefitCategory.TRAVEL]: 'Travel',
  [BenefitCategory.SHOPPING]: 'Shopping',
  [BenefitCategory.OTHER]: 'Other',
};

export const BENEFIT_STATUS_LABELS: Record<BenefitStatus, string> = {
  [BenefitStatus.ACTIVE]: 'Active',
  [BenefitStatus.INACTIVE]: 'Inactive',
  [BenefitStatus.PENDING]: 'Pending',
  [BenefitStatus.EXPIRED]: 'Expired',
};

export const ELIGIBILITY_STATUS_LABELS: Record<EligibilityStatus, string> = {
  [EligibilityStatus.ELIGIBLE]: 'Eligible',
  [EligibilityStatus.NOT_ELIGIBLE]: 'Not Eligible',
  [EligibilityStatus.PENDING_VERIFICATION]: 'Pending Verification',
};
```