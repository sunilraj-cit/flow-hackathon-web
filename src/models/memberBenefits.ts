import { z } from 'zod';

/**
 * Enum for benefit types
 */
export enum BenefitType {
  DISCOUNT = 'DISCOUNT',
  ACCESS = 'ACCESS',
  REWARD = 'REWARD',
  SERVICE = 'SERVICE',
  PERK = 'PERK',
}

/**
 * Enum for benefit status
 */
export enum BenefitStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  COMING_SOON = 'COMING_SOON',
}

/**
 * Enum for member tier levels
 */
export enum MemberTier {
  BASIC = 'BASIC',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

/**
 * Interface for benefit category
 */
export interface BenefitCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order: number;
}

/**
 * Interface for benefit provider
 */
export interface BenefitProvider {
  id: string;
  name: string;
  logo?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * Interface for benefit terms and conditions
 */
export interface BenefitTerms {
  description: string;
  restrictions?: string[];
  expirationDate?: string;
  redemptionInstructions?: string;
  termsUrl?: string;
}

/**
 * Main interface for member benefit
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  type: BenefitType;
  status: BenefitStatus;
  category: BenefitCategory;
  provider?: BenefitProvider;
  eligibleTiers: MemberTier[];
  value?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  terms?: BenefitTerms;
  startDate?: string;
  endDate?: string;
  featured: boolean;
  order: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for member benefit summary (list view)
 */
export interface MemberBenefitSummary {
  id: string;
  title: string;
  description: string;
  type: BenefitType;
  status: BenefitStatus;
  categoryName: string;
  providerName?: string;
  thumbnailUrl?: string;
  featured: boolean;
  eligibleTiers: MemberTier[];
}

/**
 * Interface for benefit usage tracking
 */
export interface BenefitUsage {
  benefitId: string;
  memberId: string;
  usedAt: string;
  usageCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Request interface for fetching member benefits
 */
export interface GetMemberBenefitsRequest {
  memberId?: string;
  memberTier?: MemberTier;
  type?: BenefitType;
  status?: BenefitStatus;
  categoryId?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'createdAt' | 'order' | 'featured';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response interface for fetching member benefits
 */
export interface GetMemberBenefitsResponse {
  benefits: MemberBenefit[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Request interface for creating a member benefit
 */
export interface CreateMemberBenefitRequest {
  title: string;
  description: string;
  type: BenefitType;
  status: BenefitStatus;
  categoryId: string;
  providerId?: string;
  eligibleTiers: MemberTier[];
  value?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  terms?: BenefitTerms;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  order?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Request interface for updating a member benefit
 */
export interface UpdateMemberBenefitRequest {
  id: string;
  title?: string;
  description?: string;
  type?: BenefitType;
  status?: BenefitStatus;
  categoryId?: string;
  providerId?: string;
  eligibleTiers?: MemberTier[];
  value?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  terms?: BenefitTerms;
  startDate?: string;
  endDate?: string;
  featured?: boolean;
  order?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Response interface for single benefit operations
 */
export interface MemberBenefitResponse {
  benefit: MemberBenefit;
}

/**
 * Request interface for tracking benefit usage
 */
export interface TrackBenefitUsageRequest {
  benefitId: string;
  memberId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response interface for benefit usage
 */
export interface BenefitUsageResponse {
  usage: BenefitUsage;
  success: boolean;
}

/**
 * Zod schema for benefit category validation
 */
export const benefitCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0),
});

/**
 * Zod schema for benefit provider validation
 */
export const benefitProviderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

/**
 * Zod schema for benefit terms validation
 */
export const benefitTermsSchema = z.object({
  description: z.string().min(1),
  restrictions: z.array(z.string()).optional(),
  expirationDate: z.string().datetime().optional(),
  redemptionInstructions: z.string().optional(),
  termsUrl: z.string().url().optional(),
});

/**
 * Zod schema for member benefit validation
 */
export const memberBenefitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  type: z.nativeEnum(BenefitType),
  status: z.nativeEnum(BenefitStatus),
  category: benefitCategorySchema,
  provider: benefitProviderSchema.optional(),
  eligibleTiers: z.array(z.nativeEnum(MemberTier)).min(1),
  value: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  terms: benefitTermsSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  featured: z.boolean(),
  order: z.number().int().min(0),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Zod schema for get member benefits request validation
 */
export const getMemberBenefitsRequestSchema = z.object({
  memberId: z.string().uuid().optional(),
  memberTier: z.nativeEnum(MemberTier).optional(),
  type: z.nativeEnum(BenefitType).optional(),
  status: z.nativeEnum(BenefitStatus).optional(),
  categoryId: z.string().uuid().optional(),
  featured: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['title', 'createdAt', 'order', 'featured']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Zod schema for create member benefit request validation
 */
export const createMemberBenefitRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  type: z.nativeEnum(BenefitType),
  status: z.nativeEnum(BenefitStatus),
  categoryId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  eligibleTiers: z.array(z.nativeEnum(MemberTier)).min(1),
  value: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  terms: benefitTermsSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for update member benefit request validation
 */
export const updateMemberBenefitRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  type: z.nativeEnum(BenefitType).optional(),
  status: z.nativeEnum(BenefitStatus).optional(),
  categoryId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  eligibleTiers: z.array(z.nativeEnum(MemberTier)).min(1).optional(),
  value: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  terms: benefitTermsSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for track benefit usage request validation
 */
export const trackBenefitUsageRequestSchema = z.object({
  benefitId: z.string().uuid(),
  memberId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Type guards for runtime type checking
 */
export const isMemberBenefit = (obj: unknown): obj is MemberBenefit => {
  return memberBenefitSchema.safeParse(obj).success;
};

export const isGetMemberBenefitsRequest = (obj: unknown): obj is GetMemberBenefitsRequest => {
  return getMemberBenefitsRequestSchema.safeParse(obj).success;
};

export const isCreateMemberBenefitRequest = (obj: unknown): obj is CreateMemberBenefitRequest => {
  return createMemberBenefitRequestSchema.safeParse(obj).success;
};

export const isUpdateMemberBenefitRequest = (obj: unknown): obj is UpdateMemberBenefitRequest => {
  return updateMemberBenefitRequestSchema.safeParse(obj).success;
};

export const isTrackBenefitUsageRequest = (obj: unknown): obj is TrackBenefitUsageRequest => {
  return trackBenefitUsageRequestSchema.safeParse(obj).success;
};

/**
 * Utility type for partial member benefit updates
 */
export type PartialMemberBenefit = Partial<Omit<MemberBenefit, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Utility type for member benefit filters
 */
export type MemberBenefitFilters = Pick<
  GetMemberBenefitsRequest,
  'type' | 'status' | 'categoryId' | 'featured' | 'memberTier'
>;
```