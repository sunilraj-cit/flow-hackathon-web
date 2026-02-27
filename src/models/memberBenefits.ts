/**
 * Member Benefits Models
 * 
 * TypeScript interfaces and types for member benefits data structures.
 * Used for request/response models in the member benefits feature.
 * 
 * @module models/memberBenefits
 */

import { z } from 'zod';

/**
 * Benefit category enumeration
 */
export enum BenefitCategory {
  HEALTH = 'health',
  FITNESS = 'fitness',
  WELLNESS = 'wellness',
  FINANCIAL = 'financial',
  ENTERTAINMENT = 'entertainment',
  TRAVEL = 'travel',
  EDUCATION = 'education',
  OTHER = 'other',
}

/**
 * Benefit status enumeration
 */
export enum BenefitStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
  EXPIRED = 'expired',
}

/**
 * Member tier levels
 */
export enum MemberTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * Core member benefit interface
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: BenefitCategory;
  status: BenefitStatus;
  tier: MemberTier[];
  imageUrl?: string;
  iconName?: string;
  value?: string;
  terms?: string;
  expiryDate?: string;
  redemptionUrl?: string;
  redemptionCode?: string;
  usageLimit?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Member benefit summary for list views
 */
export interface MemberBenefitSummary {
  id: string;
  title: string;
  description: string;
  category: BenefitCategory;
  status: BenefitStatus;
  tier: MemberTier[];
  imageUrl?: string;
  iconName?: string;
  value?: string;
}

/**
 * Member benefit details for detailed views
 */
export interface MemberBenefitDetails extends MemberBenefit {
  longDescription?: string;
  features?: string[];
  howToRedeem?: string[];
  eligibilityCriteria?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  relatedBenefits?: string[];
}

/**
 * Request model for fetching member benefits
 */
export interface GetMemberBenefitsRequest {
  memberId?: string;
  category?: BenefitCategory;
  status?: BenefitStatus;
  tier?: MemberTier;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'category' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response model for member benefits list
 */
export interface GetMemberBenefitsResponse {
  benefits: MemberBenefitSummary[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Request model for fetching a single benefit
 */
export interface GetMemberBenefitRequest {
  benefitId: string;
  memberId?: string;
}

/**
 * Response model for a single benefit
 */
export interface GetMemberBenefitResponse {
  benefit: MemberBenefitDetails;
}

/**
 * Request model for creating a new benefit
 */
export interface CreateMemberBenefitRequest {
  title: string;
  description: string;
  longDescription?: string;
  category: BenefitCategory;
  status: BenefitStatus;
  tier: MemberTier[];
  imageUrl?: string;
  iconName?: string;
  value?: string;
  terms?: string;
  expiryDate?: string;
  redemptionUrl?: string;
  redemptionCode?: string;
  usageLimit?: number;
  features?: string[];
  howToRedeem?: string[];
  eligibilityCriteria?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

/**
 * Response model for creating a benefit
 */
export interface CreateMemberBenefitResponse {
  benefit: MemberBenefitDetails;
  message: string;
}

/**
 * Request model for updating a benefit
 */
export interface UpdateMemberBenefitRequest {
  benefitId: string;
  title?: string;
  description?: string;
  longDescription?: string;
  category?: BenefitCategory;
  status?: BenefitStatus;
  tier?: MemberTier[];
  imageUrl?: string;
  iconName?: string;
  value?: string;
  terms?: string;
  expiryDate?: string;
  redemptionUrl?: string;
  redemptionCode?: string;
  usageLimit?: number;
  features?: string[];
  howToRedeem?: string[];
  eligibilityCriteria?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
}

/**
 * Response model for updating a benefit
 */
export interface UpdateMemberBenefitResponse {
  benefit: MemberBenefitDetails;
  message: string;
}

/**
 * Request model for deleting a benefit
 */
export interface DeleteMemberBenefitRequest {
  benefitId: string;
}

/**
 * Response model for deleting a benefit
 */
export interface DeleteMemberBenefitResponse {
  success: boolean;
  message: string;
}

/**
 * Request model for redeeming a benefit
 */
export interface RedeemBenefitRequest {
  benefitId: string;
  memberId: string;
  redemptionData?: Record<string, unknown>;
}

/**
 * Response model for redeeming a benefit
 */
export interface RedeemBenefitResponse {
  success: boolean;
  message: string;
  redemptionId?: string;
  redemptionCode?: string;
  redemptionUrl?: string;
}

/**
 * Member benefit usage tracking
 */
export interface BenefitUsage {
  id: string;
  benefitId: string;
  memberId: string;
  redeemedAt: string;
  redemptionCode?: string;
  status: 'pending' | 'completed' | 'cancelled';
  metadata?: Record<string, unknown>;
}

/**
 * Request model for fetching benefit usage history
 */
export interface GetBenefitUsageRequest {
  memberId: string;
  benefitId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Response model for benefit usage history
 */
export interface GetBenefitUsageResponse {
  usage: BenefitUsage[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Zod schema for benefit category validation
 */
export const benefitCategorySchema = z.nativeEnum(BenefitCategory);

/**
 * Zod schema for benefit status validation
 */
export const benefitStatusSchema = z.nativeEnum(BenefitStatus);

/**
 * Zod schema for member tier validation
 */
export const memberTierSchema = z.nativeEnum(MemberTier);

/**
 * Zod schema for member benefit validation
 */
export const memberBenefitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: benefitCategorySchema,
  status: benefitStatusSchema,
  tier: z.array(memberTierSchema).min(1),
  imageUrl: z.string().url().optional(),
  iconName: z.string().optional(),
  value: z.string().optional(),
  terms: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  redemptionUrl: z.string().url().optional(),
  redemptionCode: z.string().optional(),
  usageLimit: z.number().int().positive().optional(),
  usageCount: z.number().int().nonnegative().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Zod schema for creating a member benefit
 */
export const createMemberBenefitSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  longDescription: z.string().optional(),
  category: benefitCategorySchema,
  status: benefitStatusSchema,
  tier: z.array(memberTierSchema).min(1),
  imageUrl: z.string().url().optional(),
  iconName: z.string().optional(),
  value: z.string().optional(),
  terms: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  redemptionUrl: z.string().url().optional(),
  redemptionCode: z.string().optional(),
  usageLimit: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  howToRedeem: z.array(z.string()).optional(),
  eligibilityCriteria: z.array(z.string()).optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
  }).optional(),
});

/**
 * Zod schema for updating a member benefit
 */
export const updateMemberBenefitSchema = createMemberBenefitSchema.partial().extend({
  benefitId: z.string().uuid(),
});

/**
 * Zod schema for redeeming a benefit
 */
export const redeemBenefitSchema = z.object({
  benefitId: z.string().uuid(),
  memberId: z.string().uuid(),
  redemptionData: z.record(z.unknown()).optional(),
});

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
 * Type guard to check if a value is a valid MemberTier
 */
export function isMemberTier(value: unknown): value is MemberTier {
  return Object.values(MemberTier).includes(value as MemberTier);
}

/**
 * Helper type for partial updates
 */
export type PartialMemberBenefit = Partial<MemberBenefit>;

/**
 * Helper type for benefit filters
 */
export type BenefitFilters = Pick<GetMemberBenefitsRequest, 'category' | 'status' | 'tier'>;

/**
 * Helper type for benefit sorting
 */
export type BenefitSort = Pick<GetMemberBenefitsRequest, 'sortBy' | 'sortOrder'>;
```