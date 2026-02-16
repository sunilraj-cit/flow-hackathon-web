import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Interface representing a member benefit
 */
export interface MemberBenefit {
  id: string;
  title: string;
  description: string;
  category: string;
  tier?: string;
  value?: string;
  imageUrl?: string;
  expiryDate?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for benefit category grouping
 */
export interface BenefitCategory {
  category: string;
  benefits: MemberBenefit[];
  count: number;
}

/**
 * Interface for formatted benefits response
 */
export interface FormattedBenefitsResponse {
  benefits: MemberBenefit[];
  categories: BenefitCategory[];
  totalCount: number;
}

/**
 * Configuration for the member benefits service
 */
interface ServiceConfig {
  tableName: string;
  region?: string;
}

/**
 * Service class for managing member benefits data
 */
export class MemberBenefitsService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: ServiceConfig) {
    const client = new DynamoDBClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });

    this.tableName = config.tableName || process.env.BENEFITS_TABLE_NAME || 'MemberBenefits';
  }

  /**
   * Retrieves all active member benefits
   * @returns Promise resolving to array of member benefits
   * @throws Error if retrieval fails
   */
  async getAllBenefits(): Promise<MemberBenefit[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'isActive = :isActive',
        ExpressionAttributeValues: {
          ':isActive': true,
        },
      });

      const response = await this.docClient.send(command);
      const benefits = (response.Items || []) as MemberBenefit[];

      return this.sortBenefits(benefits);
    } catch (error) {
      console.error('Error fetching all benefits:', error);
      throw new Error('Failed to retrieve member benefits');
    }
  }

  /**
   * Retrieves a specific benefit by ID
   * @param benefitId - The unique identifier of the benefit
   * @returns Promise resolving to the member benefit or null if not found
   * @throws Error if retrieval fails
   */
  async getBenefitById(benefitId: string): Promise<MemberBenefit | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          id: benefitId,
        },
      });

      const response = await this.docClient.send(command);

      if (!response.Item) {
        return null;
      }

      return response.Item as MemberBenefit;
    } catch (error) {
      console.error(`Error fetching benefit ${benefitId}:`, error);
      throw new Error(`Failed to retrieve benefit with ID: ${benefitId}`);
    }
  }

  /**
   * Retrieves benefits filtered by category
   * @param category - The category to filter by
   * @returns Promise resolving to array of member benefits in the category
   * @throws Error if retrieval fails
   */
  async getBenefitsByCategory(category: string): Promise<MemberBenefit[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'category = :category AND isActive = :isActive',
        ExpressionAttributeValues: {
          ':category': category,
          ':isActive': true,
        },
      });

      const response = await this.docClient.send(command);
      const benefits = (response.Items || []) as MemberBenefit[];

      return this.sortBenefits(benefits);
    } catch (error) {
      console.error(`Error fetching benefits for category ${category}:`, error);
      throw new Error(`Failed to retrieve benefits for category: ${category}`);
    }
  }

  /**
   * Retrieves benefits filtered by membership tier
   * @param tier - The membership tier to filter by
   * @returns Promise resolving to array of member benefits for the tier
   * @throws Error if retrieval fails
   */
  async getBenefitsByTier(tier: string): Promise<MemberBenefit[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '(tier = :tier OR attribute_not_exists(tier)) AND isActive = :isActive',
        ExpressionAttributeValues: {
          ':tier': tier,
          ':isActive': true,
        },
      });

      const response = await this.docClient.send(command);
      const benefits = (response.Items || []) as MemberBenefit[];

      return this.sortBenefits(benefits);
    } catch (error) {
      console.error(`Error fetching benefits for tier ${tier}:`, error);
      throw new Error(`Failed to retrieve benefits for tier: ${tier}`);
    }
  }

  /**
   * Retrieves and formats all benefits with category grouping
   * @returns Promise resolving to formatted benefits response
   * @throws Error if retrieval or formatting fails
   */
  async getFormattedBenefits(): Promise<FormattedBenefitsResponse> {
    try {
      const benefits = await this.getAllBenefits();
      const categories = this.groupBenefitsByCategory(benefits);

      return {
        benefits,
        categories,
        totalCount: benefits.length,
      };
    } catch (error) {
      console.error('Error formatting benefits:', error);
      throw new Error('Failed to format member benefits');
    }
  }

  /**
   * Groups benefits by category
   * @param benefits - Array of member benefits to group
   * @returns Array of benefit categories with their benefits
   */
  private groupBenefitsByCategory(benefits: MemberBenefit[]): BenefitCategory[] {
    const categoryMap = new Map<string, MemberBenefit[]>();

    benefits.forEach((benefit) => {
      const category = benefit.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(benefit);
    });

    return Array.from(categoryMap.entries()).map(([category, categoryBenefits]) => ({
      category,
      benefits: categoryBenefits,
      count: categoryBenefits.length,
    }));
  }

  /**
   * Sorts benefits by display order and creation date
   * @param benefits - Array of benefits to sort
   * @returns Sorted array of benefits
   */
  private sortBenefits(benefits: MemberBenefit[]): MemberBenefit[] {
    return benefits.sort((a, b) => {
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== undefined) return -1;
      if (b.displayOrder !== undefined) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Filters out expired benefits
   * @param benefits - Array of benefits to filter
   * @returns Array of non-expired benefits
   */
  filterExpiredBenefits(benefits: MemberBenefit[]): MemberBenefit[] {
    const now = new Date();
    return benefits.filter((benefit) => {
      if (!benefit.expiryDate) return true;
      return new Date(benefit.expiryDate) > now;
    });
  }

  /**
   * Searches benefits by title or description
   * @param searchTerm - The term to search for
   * @returns Promise resolving to array of matching benefits
   * @throws Error if search fails
   */
  async searchBenefits(searchTerm: string): Promise<MemberBenefit[]> {
    try {
      const allBenefits = await this.getAllBenefits();
      const lowerSearchTerm = searchTerm.toLowerCase();

      return allBenefits.filter(
        (benefit) =>
          benefit.title.toLowerCase().includes(lowerSearchTerm) ||
          benefit.description.toLowerCase().includes(lowerSearchTerm)
      );
    } catch (error) {
      console.error('Error searching benefits:', error);
      throw new Error('Failed to search member benefits');
    }
  }
}

/**
 * Factory function to create a MemberBenefitsService instance
 * @param config - Optional configuration for the service
 * @returns MemberBenefitsService instance
 */
export function createMemberBenefitsService(config?: Partial<ServiceConfig>): MemberBenefitsService {
  return new MemberBenefitsService({
    tableName: config?.tableName || process.env.BENEFITS_TABLE_NAME || 'MemberBenefits',
    region: config?.region || process.env.AWS_REGION || 'us-east-1',
  });
}

export default MemberBenefitsService;
```