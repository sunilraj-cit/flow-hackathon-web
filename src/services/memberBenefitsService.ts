import { z } from 'zod';

/**
 * Schema for a single member benefit
 */
export const MemberBenefitSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['health', 'wellness', 'financial', 'lifestyle', 'education', 'other']),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
  eligibilityRequirements: z.array(z.string()).optional(),
  externalLink: z.string().url().optional(),
  contactInfo: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  priority: z.number().default(0),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type MemberBenefit = z.infer<typeof MemberBenefitSchema>;

/**
 * Schema for member benefits response
 */
export const MemberBenefitsResponseSchema = z.object({
  benefits: z.array(MemberBenefitSchema),
  totalCount: z.number(),
  lastUpdated: z.string(),
});

export type MemberBenefitsResponse = z.infer<typeof MemberBenefitsResponseSchema>;

/**
 * Filter options for querying member benefits
 */
export interface MemberBenefitsFilter {
  category?: MemberBenefit['category'];
  isActive?: boolean;
  searchTerm?: string;
}

/**
 * Sort options for member benefits
 */
export interface MemberBenefitsSortOptions {
  field: 'title' | 'category' | 'priority' | 'effectiveDate';
  direction: 'asc' | 'desc';
}

/**
 * Error class for member benefits service errors
 */
export class MemberBenefitsServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'MemberBenefitsServiceError';
  }
}

/**
 * Mock data source for member benefits
 * In production, this would be replaced with actual API calls or database queries
 */
const mockBenefitsData: MemberBenefit[] = [
  {
    id: '1',
    title: 'Health Insurance Coverage',
    description: 'Comprehensive health insurance coverage including medical, dental, and vision care.',
    category: 'health',
    icon: 'heart-pulse',
    isActive: true,
    eligibilityRequirements: ['Active membership', 'Completed enrollment'],
    externalLink: 'https://example.com/health-insurance',
    contactInfo: 'health@example.com',
    priority: 10,
  },
  {
    id: '2',
    title: 'Wellness Program',
    description: 'Access to fitness centers, wellness coaching, and health screenings.',
    category: 'wellness',
    icon: 'activity',
    isActive: true,
    eligibilityRequirements: ['Active membership'],
    priority: 8,
  },
  {
    id: '3',
    title: 'Financial Planning Services',
    description: 'Free consultation with certified financial planners and retirement planning tools.',
    category: 'financial',
    icon: 'dollar-sign',
    isActive: true,
    eligibilityRequirements: ['Active membership', 'Minimum 6 months tenure'],
    externalLink: 'https://example.com/financial-planning',
    priority: 7,
  },
  {
    id: '4',
    title: 'Educational Assistance',
    description: 'Tuition reimbursement and access to online learning platforms.',
    category: 'education',
    icon: 'graduation-cap',
    isActive: true,
    eligibilityRequirements: ['Active membership', 'Minimum 1 year tenure'],
    priority: 6,
  },
  {
    id: '5',
    title: 'Lifestyle Discounts',
    description: 'Exclusive discounts on travel, entertainment, shopping, and dining.',
    category: 'lifestyle',
    icon: 'shopping-bag',
    isActive: true,
    priority: 5,
  },
];

/**
 * Fetches all member benefits from the data source
 * 
 * @returns Promise resolving to array of member benefits
 * @throws {MemberBenefitsServiceError} If data retrieval fails
 */
export async function getAllMemberBenefits(): Promise<MemberBenefit[]> {
  try {
    // Simulate async data fetching
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In production, this would be an actual API call or database query
    // Example: const response = await fetch('/api/member-benefits');
    // const data = await response.json();

    const validatedBenefits = z.array(MemberBenefitSchema).parse(mockBenefitsData);
    return validatedBenefits;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new MemberBenefitsServiceError(
        'Invalid benefits data format',
        'VALIDATION_ERROR',
        422
      );
    }
    throw new MemberBenefitsServiceError(
      'Failed to fetch member benefits',
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * Fetches a single member benefit by ID
 * 
 * @param id - The unique identifier of the benefit
 * @returns Promise resolving to the member benefit or null if not found
 * @throws {MemberBenefitsServiceError} If data retrieval fails
 */
export async function getMemberBenefitById(id: string): Promise<MemberBenefit | null> {
  try {
    const benefits = await getAllMemberBenefits();
    const benefit = benefits.find((b) => b.id === id);
    return benefit || null;
  } catch (error) {
    if (error instanceof MemberBenefitsServiceError) {
      throw error;
    }
    throw new MemberBenefitsServiceError(
      `Failed to fetch benefit with ID: ${id}`,
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * Filters member benefits based on provided criteria
 * 
 * @param benefits - Array of member benefits to filter
 * @param filter - Filter criteria
 * @returns Filtered array of member benefits
 */
function filterBenefits(
  benefits: MemberBenefit[],
  filter: MemberBenefitsFilter
): MemberBenefit[] {
  let filtered = [...benefits];

  if (filter.category) {
    filtered = filtered.filter((b) => b.category === filter.category);
  }

  if (filter.isActive !== undefined) {
    filtered = filtered.filter((b) => b.isActive === filter.isActive);
  }

  if (filter.searchTerm) {
    const searchLower = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(searchLower) ||
        b.description.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

/**
 * Sorts member benefits based on provided options
 * 
 * @param benefits - Array of member benefits to sort
 * @param sortOptions - Sort criteria
 * @returns Sorted array of member benefits
 */
function sortBenefits(
  benefits: MemberBenefit[],
  sortOptions: MemberBenefitsSortOptions
): MemberBenefit[] {
  const sorted = [...benefits];
  const { field, direction } = sortOptions;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let aValue: string | number = a[field] || '';
    let bValue: string | number = b[field] || '';

    if (field === 'priority') {
      aValue = a.priority;
      bValue = b.priority;
      return (bValue - aValue) * multiplier;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * multiplier;
    }

    return 0;
  });

  return sorted;
}

/**
 * Fetches filtered and sorted member benefits
 * 
 * @param filter - Optional filter criteria
 * @param sortOptions - Optional sort criteria
 * @returns Promise resolving to filtered and sorted member benefits
 * @throws {MemberBenefitsServiceError} If data retrieval fails
 */
export async function getFilteredMemberBenefits(
  filter?: MemberBenefitsFilter,
  sortOptions?: MemberBenefitsSortOptions
): Promise<MemberBenefit[]> {
  try {
    let benefits = await getAllMemberBenefits();

    if (filter) {
      benefits = filterBenefits(benefits, filter);
    }

    if (sortOptions) {
      benefits = sortBenefits(benefits, sortOptions);
    } else {
      // Default sort by priority (descending)
      benefits = sortBenefits(benefits, { field: 'priority', direction: 'desc' });
    }

    return benefits;
  } catch (error) {
    if (error instanceof MemberBenefitsServiceError) {
      throw error;
    }
    throw new MemberBenefitsServiceError(
      'Failed to fetch filtered member benefits',
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * Groups member benefits by category
 * 
 * @param benefits - Array of member benefits to group
 * @returns Object with benefits grouped by category
 */
export function groupBenefitsByCategory(
  benefits: MemberBenefit[]
): Record<MemberBenefit['category'], MemberBenefit[]> {
  const grouped: Record<string, MemberBenefit[]> = {
    health: [],
    wellness: [],
    financial: [],
    lifestyle: [],
    education: [],
    other: [],
  };

  benefits.forEach((benefit) => {
    grouped[benefit.category].push(benefit);
  });

  return grouped as Record<MemberBenefit['category'], MemberBenefit[]>;
}

/**
 * Fetches member benefits grouped by category
 * 
 * @param filter - Optional filter criteria
 * @returns Promise resolving to benefits grouped by category
 * @throws {MemberBenefitsServiceError} If data retrieval fails
 */
export async function getMemberBenefitsByCategory(
  filter?: Omit<MemberBenefitsFilter, 'category'>
): Promise<Record<MemberBenefit['category'], MemberBenefit[]>> {
  try {
    const benefits = await getFilteredMemberBenefits(filter);
    return groupBenefitsByCategory(benefits);
  } catch (error) {
    if (error instanceof MemberBenefitsServiceError) {
      throw error;
    }
    throw new MemberBenefitsServiceError(
      'Failed to fetch benefits by category',
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * Formats a member benefit for display
 * 
 * @param benefit - The benefit to format
 * @returns Formatted benefit object with additional display properties
 */
export function formatMemberBenefit(benefit: MemberBenefit): MemberBenefit & {
  formattedCategory: string;
  hasExternalLink: boolean;
  hasContactInfo: boolean;
} {
  const categoryLabels: Record<MemberBenefit['category'], string> = {
    health: 'Health',
    wellness: 'Wellness',
    financial: 'Financial',
    lifestyle: 'Lifestyle',
    education: 'Education',
    other: 'Other',
  };

  return {
    ...benefit,
    formattedCategory: categoryLabels[benefit.category],
    hasExternalLink: !!benefit.externalLink,
    hasContactInfo: !!benefit.contactInfo,
  };
}

/**
 * Fetches and formats all member benefits for display
 * 
 * @param filter - Optional filter criteria
 * @param sortOptions - Optional sort criteria
 * @returns Promise resolving to formatted member benefits
 * @throws {MemberBenefitsServiceError} If data retrieval fails
 */
export async function getFormattedMemberBenefits(
  filter?: MemberBenefitsFilter,
  sortOptions?: MemberBenefitsSortOptions
): Promise<ReturnType<typeof formatMemberBenefit>[]> {
  try {
    const benefits = await getFilteredMemberBenefits(filter, sortOptions);
    return benefits.map(formatMemberBenefit);
  } catch (error) {
    if (error instanceof MemberBenefitsServiceError) {
      throw error;
    }
    throw new MemberBenefitsServiceError(
      'Failed to fetch formatted member benefits',
      'FETCH_ERROR',
      500
    );
  }
}

/**
 * Gets statistics about member benefits
 * 
 * @returns Promise resolving to benefits statistics
 * @throws {MemberBenefitsServiceError} If data retrieval fails
 */
export async function getMemberBenefitsStats(): Promise<{
  totalBenefits: number;
  activeBenefits: number;
  benefitsByCategory: Record<MemberBenefit['category'], number>;
}> {
  try {
    const benefits = await getAllMemberBenefits();
    const grouped = groupBenefitsByCategory(benefits);

    const benefitsByCategory = Object.entries(grouped).reduce(
      (acc, [category, items]) => {
        acc[category as MemberBenefit['category']] = items.length;
        return acc;
      },
      {} as Record<MemberBenefit['category'], number>
    );

    return {
      totalBenefits: benefits.length,
      activeBenefits: benefits.filter((b) => b.isActive).length,
      benefitsByCategory,
    };
  } catch (error) {
    if (error instanceof MemberBenefitsServiceError) {
      throw error;
    }
    throw new MemberBenefitsServiceError(
      'Failed to fetch benefits statistics',
      'FETCH_ERROR',
      500
    );
  }
}