import { DateTime } from 'luxon';

/**
 * Represents a member benefit item
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: BenefitCategory;
  value?: string;
  icon?: string;
  isActive: boolean;
  eligibilityRequirements?: string[];
  expirationDate?: string;
  termsAndConditions?: string;
  redemptionUrl?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category types for member benefits
 */
export enum BenefitCategory {
  HEALTH = 'health',
  WELLNESS = 'wellness',
  FINANCIAL = 'financial',
  LIFESTYLE = 'lifestyle',
  TRAVEL = 'travel',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  OTHER = 'other',
}

/**
 * Formatted member benefit for display
 */
export interface FormattedMemberBenefit extends MemberBenefit {
  formattedExpirationDate?: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
  daysUntilExpiration?: number;
}

/**
 * Filter options for member benefits
 */
export interface BenefitFilterOptions {
  category?: BenefitCategory;
  isActive?: boolean;
  includeExpired?: boolean;
}

/**
 * Service class for managing member benefits data
 */
class MemberBenefitsService {
  private readonly EXPIRING_SOON_THRESHOLD_DAYS = 30;

  /**
   * Fetches all member benefits
   * @returns Promise resolving to array of member benefits
   */
  async getAllBenefits(): Promise<MemberBenefit[]> {
    try {
      // TODO: Replace with actual DynamoDB or API call
      // Example: const response = await dynamoDBClient.scan({ TableName: 'MemberBenefits' });
      
      // Mock data for development
      const mockBenefits: MemberBenefit[] = [
        {
          id: '1',
          title: 'Health Insurance Discount',
          description: 'Get up to 20% discount on health insurance premiums',
          category: BenefitCategory.HEALTH,
          value: '20% off',
          icon: 'heart',
          isActive: true,
          eligibilityRequirements: ['Active membership', 'Minimum 6 months tenure'],
          expirationDate: DateTime.now().plus({ months: 3 }).toISO() || undefined,
          displayOrder: 1,
          createdAt: DateTime.now().minus({ months: 6 }).toISO() || '',
          updatedAt: DateTime.now().toISO() || '',
        },
        {
          id: '2',
          title: 'Gym Membership',
          description: 'Free access to partner gyms nationwide',
          category: BenefitCategory.WELLNESS,
          value: 'Free',
          icon: 'dumbbell',
          isActive: true,
          eligibilityRequirements: ['Active membership'],
          displayOrder: 2,
          createdAt: DateTime.now().minus({ months: 6 }).toISO() || '',
          updatedAt: DateTime.now().toISO() || '',
        },
        {
          id: '3',
          title: 'Financial Planning Consultation',
          description: 'One free consultation with certified financial planners',
          category: BenefitCategory.FINANCIAL,
          value: '$200 value',
          icon: 'dollar-sign',
          isActive: true,
          eligibilityRequirements: ['Active membership', 'First-time users only'],
          displayOrder: 3,
          createdAt: DateTime.now().minus({ months: 6 }).toISO() || '',
          updatedAt: DateTime.now().toISO() || '',
        },
      ];

      return mockBenefits;
    } catch (error) {
      console.error('Error fetching member benefits:', error);
      throw new Error('Failed to fetch member benefits');
    }
  }

  /**
   * Fetches a single member benefit by ID
   * @param benefitId - The ID of the benefit to fetch
   * @returns Promise resolving to a member benefit or null
   */
  async getBenefitById(benefitId: string): Promise<MemberBenefit | null> {
    try {
      // TODO: Replace with actual DynamoDB or API call
      // Example: const response = await dynamoDBClient.get({ TableName: 'MemberBenefits', Key: { id: benefitId } });
      
      const allBenefits = await this.getAllBenefits();
      return allBenefits.find(benefit => benefit.id === benefitId) || null;
    } catch (error) {
      console.error(`Error fetching benefit ${benefitId}:`, error);
      throw new Error(`Failed to fetch benefit with ID: ${benefitId}`);
    }
  }

  /**
   * Fetches member benefits with optional filtering
   * @param filters - Optional filter criteria
   * @returns Promise resolving to filtered array of member benefits
   */
  async getBenefitsWithFilters(filters?: BenefitFilterOptions): Promise<MemberBenefit[]> {
    try {
      let benefits = await this.getAllBenefits();

      if (filters?.category) {
        benefits = benefits.filter(benefit => benefit.category === filters.category);
      }

      if (filters?.isActive !== undefined) {
        benefits = benefits.filter(benefit => benefit.isActive === filters.isActive);
      }

      if (!filters?.includeExpired) {
        benefits = benefits.filter(benefit => {
          if (!benefit.expirationDate) return true;
          return DateTime.fromISO(benefit.expirationDate) > DateTime.now();
        });
      }

      return benefits;
    } catch (error) {
      console.error('Error fetching filtered benefits:', error);
      throw new Error('Failed to fetch filtered member benefits');
    }
  }

  /**
   * Formats member benefits with additional computed properties
   * @param benefits - Array of member benefits to format
   * @returns Array of formatted member benefits
   */
  formatBenefits(benefits: MemberBenefit[]): FormattedMemberBenefit[] {
    return benefits.map(benefit => this.formatBenefit(benefit));
  }

  /**
   * Formats a single member benefit with additional computed properties
   * @param benefit - Member benefit to format
   * @returns Formatted member benefit
   */
  formatBenefit(benefit: MemberBenefit): FormattedMemberBenefit {
    const now = DateTime.now();
    let formattedExpirationDate: string | undefined;
    let isExpiringSoon = false;
    let isExpired = false;
    let daysUntilExpiration: number | undefined;

    if (benefit.expirationDate) {
      const expirationDateTime = DateTime.fromISO(benefit.expirationDate);
      formattedExpirationDate = expirationDateTime.toLocaleString(DateTime.DATE_MED);
      
      const diff = expirationDateTime.diff(now, 'days').days;
      daysUntilExpiration = Math.floor(diff);
      
      isExpired = diff < 0;
      isExpiringSoon = !isExpired && diff <= this.EXPIRING_SOON_THRESHOLD_DAYS;
    }

    return {
      ...benefit,
      formattedExpirationDate,
      isExpiringSoon,
      isExpired,
      daysUntilExpiration,
    };
  }

  /**
   * Groups benefits by category
   * @param benefits - Array of member benefits to group
   * @returns Record of benefits grouped by category
   */
  groupBenefitsByCategory(benefits: MemberBenefit[]): Record<BenefitCategory, MemberBenefit[]> {
    const grouped = {} as Record<BenefitCategory, MemberBenefit[]>;

    Object.values(BenefitCategory).forEach(category => {
      grouped[category] = [];
    });

    benefits.forEach(benefit => {
      if (grouped[benefit.category]) {
        grouped[benefit.category].push(benefit);
      }
    });

    return grouped;
  }

  /**
   * Sorts benefits by display order
   * @param benefits - Array of member benefits to sort
   * @returns Sorted array of member benefits
   */
  sortBenefitsByDisplayOrder(benefits: MemberBenefit[]): MemberBenefit[] {
    return [...benefits].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Gets active benefits sorted by display order
   * @returns Promise resolving to sorted array of active benefits
   */
  async getActiveBenefitsSorted(): Promise<FormattedMemberBenefit[]> {
    try {
      const benefits = await this.getBenefitsWithFilters({ 
        isActive: true, 
        includeExpired: false 
      });
      const sorted = this.sortBenefitsByDisplayOrder(benefits);
      return this.formatBenefits(sorted);
    } catch (error) {
      console.error('Error fetching active benefits:', error);
      throw new Error('Failed to fetch active member benefits');
    }
  }

  /**
   * Gets benefits expiring soon
   * @returns Promise resolving to array of benefits expiring soon
   */
  async getExpiringSoonBenefits(): Promise<FormattedMemberBenefit[]> {
    try {
      const benefits = await this.getBenefitsWithFilters({ 
        isActive: true, 
        includeExpired: false 
      });
      const formatted = this.formatBenefits(benefits);
      return formatted.filter(benefit => benefit.isExpiringSoon);
    } catch (error) {
      console.error('Error fetching expiring benefits:', error);
      throw new Error('Failed to fetch expiring member benefits');
    }
  }

  /**
   * Gets benefits by category
   * @param category - The category to filter by
   * @returns Promise resolving to array of benefits in the specified category
   */
  async getBenefitsByCategory(category: BenefitCategory): Promise<FormattedMemberBenefit[]> {
    try {
      const benefits = await this.getBenefitsWithFilters({ 
        category, 
        isActive: true, 
        includeExpired: false 
      });
      const sorted = this.sortBenefitsByDisplayOrder(benefits);
      return this.formatBenefits(sorted);
    } catch (error) {
      console.error(`Error fetching benefits for category ${category}:`, error);
      throw new Error(`Failed to fetch benefits for category: ${category}`);
    }
  }
}

// Export singleton instance
export const memberBenefitsService = new MemberBenefitsService();

// Export class for testing purposes
export { MemberBenefitsService };
```