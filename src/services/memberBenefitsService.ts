import { DateTime } from 'luxon';

/**
 * Represents a member benefit with all its details
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: BenefitCategory;
  tier: MembershipTier;
  value?: string;
  icon?: string;
  isActive: boolean;
  expiresAt?: string;
  termsAndConditions?: string;
  redemptionUrl?: string;
  redemptionCode?: string;
  usageLimit?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category types for member benefits
 */
export enum BenefitCategory {
  HEALTH = 'health',
  FITNESS = 'fitness',
  WELLNESS = 'wellness',
  NUTRITION = 'nutrition',
  ENTERTAINMENT = 'entertainment',
  TRAVEL = 'travel',
  SHOPPING = 'shopping',
  EDUCATION = 'education',
  OTHER = 'other',
}

/**
 * Membership tier levels
 */
export enum MembershipTier {
  BASIC = 'basic',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * Formatted benefit for display purposes
 */
export interface FormattedBenefit extends MemberBenefit {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiration?: number;
  usagePercentage?: number;
  canRedeem: boolean;
}

/**
 * Filter options for retrieving benefits
 */
export interface BenefitFilterOptions {
  category?: BenefitCategory;
  tier?: MembershipTier;
  isActive?: boolean;
  includeExpired?: boolean;
}

/**
 * Service class for managing member benefits
 */
class MemberBenefitsService {
  private readonly EXPIRING_SOON_DAYS = 30;

  /**
   * Retrieves all member benefits with optional filtering
   * @param filters - Optional filter criteria
   * @returns Promise resolving to array of formatted benefits
   */
  async getBenefits(filters?: BenefitFilterOptions): Promise<FormattedBenefit[]> {
    try {
      // TODO: Replace with actual DynamoDB query when infrastructure is ready
      const rawBenefits = await this.fetchBenefitsFromDataSource(filters);
      
      return rawBenefits
        .filter(benefit => this.applyFilters(benefit, filters))
        .map(benefit => this.formatBenefit(benefit))
        .sort((a, b) => this.sortBenefits(a, b));
    } catch (error) {
      console.error('Error fetching member benefits:', error);
      throw new Error('Failed to retrieve member benefits');
    }
  }

  /**
   * Retrieves a single benefit by ID
   * @param benefitId - The unique identifier of the benefit
   * @returns Promise resolving to formatted benefit or null if not found
   */
  async getBenefitById(benefitId: string): Promise<FormattedBenefit | null> {
    try {
      // TODO: Replace with actual DynamoDB query
      const benefit = await this.fetchBenefitByIdFromDataSource(benefitId);
      
      if (!benefit) {
        return null;
      }

      return this.formatBenefit(benefit);
    } catch (error) {
      console.error(`Error fetching benefit ${benefitId}:`, error);
      throw new Error('Failed to retrieve benefit');
    }
  }

  /**
   * Retrieves benefits by membership tier
   * @param tier - The membership tier
   * @returns Promise resolving to array of formatted benefits
   */
  async getBenefitsByTier(tier: MembershipTier): Promise<FormattedBenefit[]> {
    return this.getBenefits({ tier, isActive: true });
  }

  /**
   * Retrieves benefits by category
   * @param category - The benefit category
   * @returns Promise resolving to array of formatted benefits
   */
  async getBenefitsByCategory(category: BenefitCategory): Promise<FormattedBenefit[]> {
    return this.getBenefits({ category, isActive: true });
  }

  /**
   * Retrieves active benefits that are expiring soon
   * @returns Promise resolving to array of formatted benefits
   */
  async getExpiringSoonBenefits(): Promise<FormattedBenefit[]> {
    const allBenefits = await this.getBenefits({ isActive: true });
    return allBenefits.filter(benefit => benefit.isExpiringSoon && !benefit.isExpired);
  }

  /**
   * Formats a raw benefit with additional computed properties
   * @param benefit - Raw benefit data
   * @returns Formatted benefit with computed fields
   */
  private formatBenefit(benefit: MemberBenefit): FormattedBenefit {
    const now = DateTime.now();
    const expiresAt = benefit.expiresAt ? DateTime.fromISO(benefit.expiresAt) : null;

    const isExpired = expiresAt ? expiresAt < now : false;
    const daysUntilExpiration = expiresAt ? Math.floor(expiresAt.diff(now, 'days').days) : undefined;
    const isExpiringSoon = daysUntilExpiration !== undefined && 
                           daysUntilExpiration > 0 && 
                           daysUntilExpiration <= this.EXPIRING_SOON_DAYS;

    const usagePercentage = benefit.usageLimit && benefit.usageCount !== undefined
      ? (benefit.usageCount / benefit.usageLimit) * 100
      : undefined;

    const hasUsageRemaining = benefit.usageLimit === undefined || 
                              (benefit.usageCount !== undefined && benefit.usageCount < benefit.usageLimit);

    const canRedeem = benefit.isActive && !isExpired && hasUsageRemaining;

    return {
      ...benefit,
      isExpired,
      isExpiringSoon,
      daysUntilExpiration,
      usagePercentage,
      canRedeem,
    };
  }

  /**
   * Applies filter criteria to a benefit
   * @param benefit - The benefit to filter
   * @param filters - Filter options
   * @returns True if benefit matches filters
   */
  private applyFilters(benefit: MemberBenefit, filters?: BenefitFilterOptions): boolean {
    if (!filters) {
      return true;
    }

    if (filters.category && benefit.category !== filters.category) {
      return false;
    }

    if (filters.tier && benefit.tier !== filters.tier) {
      return false;
    }

    if (filters.isActive !== undefined && benefit.isActive !== filters.isActive) {
      return false;
    }

    if (!filters.includeExpired && benefit.expiresAt) {
      const expiresAt = DateTime.fromISO(benefit.expiresAt);
      if (expiresAt < DateTime.now()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sorts benefits by priority (active, expiring soon, then by creation date)
   * @param a - First benefit
   * @param b - Second benefit
   * @returns Sort comparison result
   */
  private sortBenefits(a: FormattedBenefit, b: FormattedBenefit): number {
    // Active benefits first
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    // Expiring soon benefits next
    if (a.isExpiringSoon !== b.isExpiringSoon) {
      return a.isExpiringSoon ? -1 : 1;
    }

    // Sort by days until expiration (ascending)
    if (a.daysUntilExpiration !== undefined && b.daysUntilExpiration !== undefined) {
      return a.daysUntilExpiration - b.daysUntilExpiration;
    }

    // Finally, sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }

  /**
   * Fetches benefits from data source (placeholder for DynamoDB integration)
   * @param filters - Optional filter criteria
   * @returns Promise resolving to array of benefits
   */
  private async fetchBenefitsFromDataSource(filters?: BenefitFilterOptions): Promise<MemberBenefit[]> {
    // TODO: Implement actual DynamoDB query
    // This is mock data for development purposes
    return this.getMockBenefits();
  }

  /**
   * Fetches a single benefit by ID from data source (placeholder for DynamoDB integration)
   * @param benefitId - The benefit ID
   * @returns Promise resolving to benefit or null
   */
  private async fetchBenefitByIdFromDataSource(benefitId: string): Promise<MemberBenefit | null> {
    // TODO: Implement actual DynamoDB query
    const benefits = await this.getMockBenefits();
    return benefits.find(b => b.id === benefitId) || null;
  }

  /**
   * Returns mock benefits data for development
   * @returns Array of mock benefits
   */
  private getMockBenefits(): MemberBenefit[] {
    const now = DateTime.now();
    
    return [
      {
        id: '1',
        title: 'Free Gym Access',
        description: 'Access to over 500 partner gyms nationwide',
        category: BenefitCategory.FITNESS,
        tier: MembershipTier.GOLD,
        value: '$50/month value',
        icon: 'dumbbell',
        isActive: true,
        expiresAt: now.plus({ months: 6 }).toISO(),
        termsAndConditions: 'Valid at participating locations only',
        redemptionUrl: 'https://example.com/gym-access',
        createdAt: now.minus({ months: 2 }).toISO(),
        updatedAt: now.minus({ days: 5 }).toISO(),
      },
      {
        id: '2',
        title: 'Nutrition Consultation',
        description: 'One-on-one consultation with certified nutritionist',
        category: BenefitCategory.NUTRITION,
        tier: MembershipTier.PLATINUM,
        value: '$150 value',
        icon: 'apple',
        isActive: true,
        expiresAt: now.plus({ days: 15 }).toISO(),
        usageLimit: 3,
        usageCount: 1,
        redemptionCode: 'NUTRI2024',
        createdAt: now.minus({ months: 1 }).toISO(),
        updatedAt: now.minus({ days: 2 }).toISO(),
      },
      {
        id: '3',
        title: 'Wellness App Premium',
        description: 'Premium subscription to top wellness tracking app',
        category: BenefitCategory.WELLNESS,
        tier: MembershipTier.SILVER,
        value: '$9.99/month value',
        icon: 'heart',
        isActive: true,
        expiresAt: now.plus({ months: 12 }).toISO(),
        redemptionUrl: 'https://example.com/wellness-app',
        createdAt: now.minus({ months: 3 }).toISO(),
        updatedAt: now.minus({ days: 10 }).toISO(),
      },
      {
        id: '4',
        title: 'Health Screening',
        description: 'Annual comprehensive health screening',
        category: BenefitCategory.HEALTH,
        tier: MembershipTier.GOLD,
        value: '$200 value',
        icon: 'stethoscope',
        isActive: true,
        usageLimit: 1,
        usageCount: 0,
        createdAt: now.minus({ months: 1 }).toISO(),
        updatedAt: now.minus({ days: 1 }).toISO(),
      },
      {
        id: '5',
        title: 'Travel Insurance',
        description: 'Complimentary travel insurance for trips',
        category: BenefitCategory.TRAVEL,
        tier: MembershipTier.PLATINUM,
        value: '$100 per trip',
        icon: 'plane',
        isActive: true,
        expiresAt: now.plus({ months: 8 }).toISO(),
        termsAndConditions: 'Coverage up to $10,000 per trip',
        createdAt: now.minus({ months: 4 }).toISO(),
        updatedAt: now.minus({ days: 7 }).toISO(),
      },
    ];
  }
}

// Export singleton instance
export const memberBenefitsService = new MemberBenefitsService();

// Export class for testing purposes
export { MemberBenefitsService };