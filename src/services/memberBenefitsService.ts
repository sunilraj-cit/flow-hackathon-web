import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const MEMBER_BENEFITS_TABLE = process.env.MEMBER_BENEFITS_TABLE || 'member-benefits';

/**
 * Represents a member benefit item
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: string;
  tier?: string;
  value?: string;
  icon?: string;
  isActive: boolean;
  displayOrder?: number;
  effectiveDate?: string;
  expirationDate?: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Formatted member benefit for display
 */
export interface FormattedMemberBenefit {
  id: string;
  title: string;
  description: string;
  category: string;
  tier?: string;
  value?: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  isExpired: boolean;
  daysUntilExpiration?: number;
}

/**
 * Query options for fetching member benefits
 */
export interface MemberBenefitsQueryOptions {
  category?: string;
  tier?: string;
  activeOnly?: boolean;
  limit?: number;
}

/**
 * Service class for managing member benefits data
 */
export class MemberBenefitsService {
  /**
   * Fetches all member benefits from DynamoDB
   * @param options - Query options to filter results
   * @returns Promise resolving to array of member benefits
   */
  async getAllBenefits(options?: MemberBenefitsQueryOptions): Promise<MemberBenefit[]> {
    try {
      const command = new ScanCommand({
        TableName: MEMBER_BENEFITS_TABLE,
        Limit: options?.limit,
      });

      const response = await docClient.send(command);
      let benefits = (response.Items || []) as MemberBenefit[];

      // Apply filters
      if (options?.activeOnly) {
        benefits = benefits.filter(benefit => benefit.isActive);
      }

      if (options?.category) {
        benefits = benefits.filter(benefit => benefit.category === options.category);
      }

      if (options?.tier) {
        benefits = benefits.filter(benefit => benefit.tier === options.tier);
      }

      // Filter out expired benefits
      const now = new Date();
      benefits = benefits.filter(benefit => {
        if (!benefit.expirationDate) return true;
        return new Date(benefit.expirationDate) > now;
      });

      // Sort by display order
      benefits.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      return benefits;
    } catch (error) {
      console.error('Error fetching member benefits:', error);
      throw new Error('Failed to fetch member benefits');
    }
  }

  /**
   * Fetches a single member benefit by ID
   * @param id - The benefit ID
   * @returns Promise resolving to a member benefit or null
   */
  async getBenefitById(id: string): Promise<MemberBenefit | null> {
    try {
      const command = new GetCommand({
        TableName: MEMBER_BENEFITS_TABLE,
        Key: { id },
      });

      const response = await docClient.send(command);
      return (response.Item as MemberBenefit) || null;
    } catch (error) {
      console.error(`Error fetching benefit with ID ${id}:`, error);
      throw new Error(`Failed to fetch benefit with ID ${id}`);
    }
  }

  /**
   * Fetches member benefits by category
   * @param category - The benefit category
   * @returns Promise resolving to array of member benefits
   */
  async getBenefitsByCategory(category: string): Promise<MemberBenefit[]> {
    try {
      const command = new QueryCommand({
        TableName: MEMBER_BENEFITS_TABLE,
        IndexName: 'CategoryIndex',
        KeyConditionExpression: 'category = :category',
        ExpressionAttributeValues: {
          ':category': category,
        },
      });

      const response = await docClient.send(command);
      const benefits = (response.Items || []) as MemberBenefit[];

      // Sort by display order
      benefits.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      return benefits;
    } catch (error) {
      console.error(`Error fetching benefits for category ${category}:`, error);
      // Fallback to scan if index doesn't exist
      return this.getAllBenefits({ category });
    }
  }

  /**
   * Fetches member benefits by tier
   * @param tier - The membership tier
   * @returns Promise resolving to array of member benefits
   */
  async getBenefitsByTier(tier: string): Promise<MemberBenefit[]> {
    try {
      return this.getAllBenefits({ tier, activeOnly: true });
    } catch (error) {
      console.error(`Error fetching benefits for tier ${tier}:`, error);
      throw new Error(`Failed to fetch benefits for tier ${tier}`);
    }
  }

  /**
   * Formats member benefits for display
   * @param benefits - Array of raw member benefits
   * @returns Array of formatted member benefits
   */
  formatBenefits(benefits: MemberBenefit[]): FormattedMemberBenefit[] {
    const now = new Date();

    return benefits.map(benefit => {
      const isExpired = benefit.expirationDate
        ? new Date(benefit.expirationDate) < now
        : false;

      let daysUntilExpiration: number | undefined;
      if (benefit.expirationDate && !isExpired) {
        const expirationDate = new Date(benefit.expirationDate);
        const diffTime = expirationDate.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        id: benefit.id,
        title: benefit.title,
        description: benefit.description,
        category: benefit.category,
        tier: benefit.tier,
        value: benefit.value,
        icon: benefit.icon,
        isActive: benefit.isActive,
        displayOrder: benefit.displayOrder || 0,
        isExpired,
        daysUntilExpiration,
      };
    });
  }

  /**
   * Groups benefits by category
   * @param benefits - Array of member benefits
   * @returns Object with benefits grouped by category
   */
  groupBenefitsByCategory(benefits: MemberBenefit[]): Record<string, MemberBenefit[]> {
    return benefits.reduce((acc, benefit) => {
      const category = benefit.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(benefit);
      return acc;
    }, {} as Record<string, MemberBenefit[]>);
  }

  /**
   * Gets unique categories from benefits
   * @param benefits - Array of member benefits
   * @returns Array of unique category names
   */
  getUniqueCategories(benefits: MemberBenefit[]): string[] {
    const categories = benefits.map(benefit => benefit.category);
    return Array.from(new Set(categories)).filter(Boolean).sort();
  }

  /**
   * Checks if a benefit is currently valid
   * @param benefit - The member benefit to check
   * @returns Boolean indicating if benefit is valid
   */
  isBenefitValid(benefit: MemberBenefit): boolean {
    const now = new Date();

    if (!benefit.isActive) {
      return false;
    }

    if (benefit.effectiveDate && new Date(benefit.effectiveDate) > now) {
      return false;
    }

    if (benefit.expirationDate && new Date(benefit.expirationDate) < now) {
      return false;
    }

    return true;
  }
}

/**
 * Singleton instance of MemberBenefitsService
 */
export const memberBenefitsService = new MemberBenefitsService();

/**
 * Fetches and formats all active member benefits
 * @param options - Query options
 * @returns Promise resolving to formatted member benefits
 */
export async function getFormattedMemberBenefits(
  options?: MemberBenefitsQueryOptions
): Promise<FormattedMemberBenefit[]> {
  const benefits = await memberBenefitsService.getAllBenefits({
    ...options,
    activeOnly: true,
  });
  return memberBenefitsService.formatBenefits(benefits);
}

/**
 * Fetches member benefits grouped by category
 * @returns Promise resolving to benefits grouped by category
 */
export async function getMemberBenefitsByCategory(): Promise<Record<string, FormattedMemberBenefit[]>> {
  const benefits = await memberBenefitsService.getAllBenefits({ activeOnly: true });
  const grouped = memberBenefitsService.groupBenefitsByCategory(benefits);

  const formattedGrouped: Record<string, FormattedMemberBenefit[]> = {};
  for (const [category, categoryBenefits] of Object.entries(grouped)) {
    formattedGrouped[category] = memberBenefitsService.formatBenefits(categoryBenefits);
  }

  return formattedGrouped;
}

export default memberBenefitsService;
```