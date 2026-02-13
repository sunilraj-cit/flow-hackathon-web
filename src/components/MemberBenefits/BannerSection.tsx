import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BannerSectionProps {
  /**
   * URL or path to the banner image
   */
  imageUrl?: string;
  /**
   * Alt text for the banner image for accessibility
   */
  imageAlt?: string;
  /**
   * Optional title to display on the banner
   */
  title?: string;
  /**
   * Optional description text to display on the banner
   */
  description?: string;
  /**
   * Additional CSS classes to apply to the banner container
   */
  className?: string;
  /**
   * Height of the banner in pixels (default: 400)
   */
  height?: number;
  /**
   * Whether to display the banner in full width mode
   */
  fullWidth?: boolean;
  /**
   * Priority loading for the image (useful for above-the-fold content)
   */
  priority?: boolean;
}

/**
 * BannerSection Component
 * 
 * Displays a responsive banner image at the bottom section of the member benefits page.
 * Supports both image-only and image with text overlay configurations.
 * 
 * @component
 * @example
 * ```tsx
 * <BannerSection
 *   imageUrl="/images/member-benefits-banner.jpg"
 *   imageAlt="Member Benefits Banner"
 *   title="Join Our Community"
 *   description="Unlock exclusive benefits today"
 * />
 * ```
 */
export const BannerSection: React.FC<BannerSectionProps> = ({
  imageUrl = '/images/member-benefits-banner.jpg',
  imageAlt = 'Member Benefits Banner',
  title,
  description,
  className,
  height = 400,
  fullWidth = false,
  priority = false,
}) => {
  const hasOverlay = title || description;

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden',
        !fullWidth && 'container mx-auto px-4 sm:px-6 lg:px-8',
        className
      )}
      aria-label="Member benefits banner"
    >
      <div
        className={cn(
          'relative rounded-lg overflow-hidden',
          fullWidth && 'rounded-none'
        )}
        style={{ height: `${height}px` }}
      >
        {/* Banner Image */}
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority={priority}
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
            quality={90}
          />
        </div>

        {/* Overlay Content */}
        {hasOverlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12">
              <div className="max-w-4xl mx-auto text-white">
                {title && (
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-base sm:text-lg lg:text-xl text-gray-200 max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * BannerSectionSkeleton Component
 * 
 * Loading skeleton for the BannerSection component
 * 
 * @component
 */
export const BannerSectionSkeleton: React.FC<{
  height?: number;
  fullWidth?: boolean;
  className?: string;
}> = ({ height = 400, fullWidth = false, className }) => {
  return (
    <section
      className={cn(
        'relative w-full overflow-hidden',
        !fullWidth && 'container mx-auto px-4 sm:px-6 lg:px-8',
        className
      )}
      aria-label="Loading banner"
    >
      <div
        className={cn(
          'relative rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse',
          fullWidth && 'rounded-none'
        )}
        style={{ height: `${height}px` }}
      />
    </section>
  );
};

export default BannerSection;