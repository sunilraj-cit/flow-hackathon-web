import React from 'react';
import { cn } from '@/lib/utils';

interface BannerImageProps {
  /**
   * Source URL for the banner image
   */
  src: string;
  /**
   * Alternative text for accessibility
   */
  alt: string;
  /**
   * Optional title text to display on the banner
   */
  title?: string;
  /**
   * Optional subtitle text to display on the banner
   */
  subtitle?: string;
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
  /**
   * Image object fit style
   * @default 'cover'
   */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /**
   * Image object position
   * @default 'center'
   */
  objectPosition?: string;
  /**
   * Priority loading for Next.js Image optimization
   * @default false
   */
  priority?: boolean;
  /**
   * Optional click handler for the banner
   */
  onClick?: () => void;
  /**
   * Optional overlay opacity (0-100)
   * @default 0
   */
  overlayOpacity?: number;
}

/**
 * BannerImage component for displaying a responsive banner image
 * on the member benefits page bottom section.
 * 
 * Features:
 * - Responsive design with mobile-first approach
 * - Optional text overlay with title and subtitle
 * - Customizable styling and positioning
 * - Accessibility compliant
 * - Performance optimized with lazy loading
 * 
 * @component
 * @example
 * ```tsx
 * <BannerImage
 *   src="/images/member-benefits-banner.jpg"
 *   alt="Member Benefits Banner"
 *   title="Exclusive Member Benefits"
 *   subtitle="Join today and unlock amazing rewards"
 * />
 * ```
 */
export const BannerImage: React.FC<BannerImageProps> = ({
  src,
  alt,
  title,
  subtitle,
  className,
  objectFit = 'cover',
  objectPosition = 'center',
  priority = false,
  onClick,
  overlayOpacity = 0,
}) => {
  const hasOverlay = overlayOpacity > 0;
  const hasTextContent = title || subtitle;

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg',
        'h-48 sm:h-64 md:h-80 lg:h-96',
        onClick && 'cursor-pointer transition-transform hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Banner Image */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className={cn(
          'h-full w-full',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down'
        )}
        style={{ objectPosition }}
      />

      {/* Optional Overlay */}
      {hasOverlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity / 100 }}
          aria-hidden="true"
        />
      )}

      {/* Optional Text Content */}
      {hasTextContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          {title && (
            <h2
              className={cn(
                'text-2xl font-bold text-white drop-shadow-lg',
                'sm:text-3xl md:text-4xl lg:text-5xl',
                'mb-2'
              )}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p
              className={cn(
                'text-sm text-white drop-shadow-md',
                'sm:text-base md:text-lg lg:text-xl',
                'max-w-2xl'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

BannerImage.displayName = 'BannerImage';

export default BannerImage;