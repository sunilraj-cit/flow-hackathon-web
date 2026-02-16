import { DateTime } from 'luxon';

/**
 * Represents a member benefit with its details
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: BenefitCategory;
  value?: string;
  eligibilityRequirements?: string[];
  expirationDate?: string;
  isActive: boolean;
  imageUrl?: string;
  termsAndConditions?: string;
  redemptionInstructions?: string;
  usageLimit?: number;
  usageCount?: number;
}

/**
 * Categories for member benefits
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
 * Filter options for retrieving member benefits
 */
export interface BenefitFilterOptions {
  category?: BenefitCategory;
  isActive?: boolean;
  includeExpired?: boolean;
  searchTerm?: string;
}

/**
 * Response structure for member benefits retrieval
 */
export interface MemberBenefitsResponse {
  benefits: MemberBenefit[];
  totalCount: number;
  categories: BenefitCategory[];
}

/**
 * Service class for managing member benefits business logic
 */
export class MemberBenefitsService {
  /**
   * Retrieves all member benefits with optional filtering
   * @param options - Filter options for benefits retrieval
   * @returns Promise resolving to filtered member benefits
   */
  async getMemberBenefits(
    options: BenefitFilterOptions = {}
  ): Promise<MemberBenefitsResponse> {
    try {
      // In production, this would fetch from a database or external API
      const allBenefits = await this.fetchBenefitsFromDataSource();

      let filteredBenefits = allBenefits;

      // Apply category filter
      if (options.category) {
        filteredBenefits = filteredBenefits.filter(
          (benefit) => benefit.category === options.category
        );
      }

      // Apply active status filter
      if (options.isActive !== undefined) {
        filteredBenefits = filteredBenefits.filter(
          (benefit) => benefit.isActive === options.isActive
        );
      }

      // Filter expired benefits unless explicitly included
      if (!options.includeExpired) {
        filteredBenefits = filteredBenefits.filter(
          (benefit) => !this.isBenefitExpired(benefit)
        );
      }

      // Apply search term filter
      if (options.searchTerm && options.searchTerm.trim() !== '') {
        const searchLower = options.searchTerm.toLowerCase();
        filteredBenefits = filteredBenefits.filter(
          (benefit) =>
            benefit.title.toLowerCase().includes(searchLower) ||
            benefit.description.toLowerCase().includes(searchLower)
        );
      }

      const categories = this.extractUniqueCategories(filteredBenefits);

      return {
        benefits: filteredBenefits,
        totalCount: filteredBenefits.length,
        categories,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve member benefits: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Retrieves a specific member benefit by ID
   * @param benefitId - The unique identifier of the benefit
   * @returns Promise resolving to the member benefit or null if not found
   */
  async getBenefitById(benefitId: string): Promise<MemberBenefit | null> {
    try {
      if (!benefitId || benefitId.trim() === '') {
        throw new Error('Benefit ID is required');
      }

      const allBenefits = await this.fetchBenefitsFromDataSource();
      const benefit = allBenefits.find((b) => b.id === benefitId);

      return benefit || null;
    } catch (error) {
      throw new Error(
        `Failed to retrieve benefit by ID: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Checks if a member is eligible for a specific benefit
   * @param benefitId - The unique identifier of the benefit
   * @param memberId - The unique identifier of the member
   * @returns Promise resolving to eligibility status
   */
  async checkBenefitEligibility(
    benefitId: string,
    memberId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const benefit = await this.getBenefitById(benefitId);

      if (!benefit) {
        return { eligible: false, reason: 'Benefit not found' };
      }

      if (!benefit.isActive) {
        return { eligible: false, reason: 'Benefit is not currently active' };
      }

      if (this.isBenefitExpired(benefit)) {
        return { eligible: false, reason: 'Benefit has expired' };
      }

      if (benefit.usageLimit && benefit.usageCount) {
        if (benefit.usageCount >= benefit.usageLimit) {
          return { eligible: false, reason: 'Usage limit reached' };
        }
      }

      // Additional eligibility checks would be performed here
      // e.g., member tier, subscription status, etc.

      return { eligible: true };
    } catch (error) {
      throw new Error(
        `Failed to check benefit eligibility: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Groups benefits by category
   * @param benefits - Array of member benefits
   * @returns Object with benefits grouped by category
   */
  groupBenefitsByCategory(
    benefits: MemberBenefit[]
  ): Record<BenefitCategory, MemberBenefit[]> {
    const grouped = {} as Record<BenefitCategory, MemberBenefit[]>;

    Object.values(BenefitCategory).forEach((category) => {
      grouped[category] = [];
    });

    benefits.forEach((benefit) => {
      if (grouped[benefit.category]) {
        grouped[benefit.category].push(benefit);
      }
    });

    return grouped;
  }

  /**
   * Calculates the total value of all active benefits
   * @param benefits - Array of member benefits
   * @returns Total value as a string or null if not calculable
   */
  calculateTotalBenefitValue(benefits: MemberBenefit[]): string | null {
    try {
      let total = 0;
      let hasValues = false;

      benefits.forEach((benefit) => {
        if (benefit.isActive && benefit.value && !this.isBenefitExpired(benefit)) {
          const numericValue = this.extractNumericValue(benefit.value);
          if (numericValue !== null) {
            total += numericValue;
            hasValues = true;
          }
        }
      });

      return hasValues ? `$${total.toFixed(2)}` : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Checks if a benefit has expired
   * @param benefit - The member benefit to check
   * @returns True if expired, false otherwise
   */
  private isBenefitExpired(benefit: MemberBenefit): boolean {
    if (!benefit.expirationDate) {
      return false;
    }

    try {
      const expirationDate = DateTime.fromISO(benefit.expirationDate);
      const now = DateTime.now();
      return expirationDate < now;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extracts unique categories from a list of benefits
   * @param benefits - Array of member benefits
   * @returns Array of unique benefit categories
   */
  private extractUniqueCategories(benefits: MemberBenefit[]): BenefitCategory[] {
    const categorySet = new Set<BenefitCategory>();
    benefits.forEach((benefit) => categorySet.add(benefit.category));
    return Array.from(categorySet);
  }

  /**
   * Extracts numeric value from a string (e.g., "$100" -> 100)
   * @param value - String containing a numeric value
   * @returns Numeric value or null if not extractable
   */
  private extractNumericValue(value: string): number | null {
    try {
      const numericString = value.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(numericString);
      return isNaN(parsed) ? null : parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fetches benefits from the data source
   * In production, this would connect to a database or API
   * @returns Promise resolving to array of member benefits
   */
  private async fetchBenefitsFromDataSource(): Promise<MemberBenefit[]> {
    // Mock data for development - replace with actual data source in production
    return [
      {
        id: '1',
        title: 'Gym Membership Discount',
        description: '20% off monthly gym membership fees at participating locations',
        category: BenefitCategory.FITNESS,
        value: '$50',
        eligibilityRequirements: ['Active membership', 'Minimum 3-month commitment'],
        isActive: true,
        redemptionInstructions: 'Present your member ID at the gym reception',
      },
      {
        id: '2',
        title: 'Health Insurance Premium Reduction',
        description: 'Reduced premium rates for comprehensive health coverage',
        category: BenefitCategory.HEALTH,
        value: '$200',
        isActive: true,
      },
      {
        id: '3',
        title: 'Wellness Program Access',
        description: 'Free access to mental health and wellness resources',
        category: BenefitCategory.WELLNESS,
        isActive: true,
      },
      {
        id: '4',
        title: 'Travel Rewards',
        description: 'Earn points on travel bookings and hotel stays',
        category: BenefitCategory.TRAVEL,
        value: '$100',
        isActive: true,
      },
      {
        id: '5',
        title: 'Educational Course Discounts',
        description: '15% off online courses and certifications',
        category: BenefitCategory.EDUCATION,
        value: '$75',
        isActive: true,
      },
    ];
  }
}

/**
 * Singleton instance of the MemberBenefitsService
 */
export const memberBenefitsService = new MemberBenefitsService();