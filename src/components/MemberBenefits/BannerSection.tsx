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
   * Optional description or subtitle text
   */
  description?: string;
  /**
   * Additional CSS classes to apply to the banner container
   */
  className?: string;
  /**
   * Height of the banner in pixels
   * @default 400
   */
  height?: number;
  /**
   * Whether to display the banner with full width
   * @default true
   */
  fullWidth?: boolean;
  /**
   * Priority loading for the image (useful for above-the-fold content)
   * @default false
   */
  priority?: boolean;
}

/**
 * BannerSection Component
 * 
 * Displays a banner image at the bottom of the member benefits section.
 * Supports customizable image, text overlay, and responsive design.
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
  fullWidth = true,
  priority = false,
}) => {
  const hasOverlay = title || description;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg',
        fullWidth ? 'w-full' : 'max-w-7xl mx-auto',
        className
      )}
      aria-label="Member benefits banner"
    >
      <div
        className="relative"
        style={{ height: `${height}px` }}
      >
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          priority={priority}
          className="object-cover"
          sizes="100vw"
          quality={90}
        />
        
        {hasOverlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
              <div className="max-w-4xl">
                {title && (
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-base md:text-lg lg:text-xl text-white/90 max-w-2xl">
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

BannerSection.displayName = 'BannerSection';

export default BannerSection;