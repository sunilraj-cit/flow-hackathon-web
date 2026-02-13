import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Props for the BannerImage component
 */
interface BannerImageProps {
  /**
   * Source URL or path for the banner image
   */
  src: string;
  /**
   * Alternative text for the image (accessibility)
   */
  alt: string;
  /**
   * Optional priority loading for above-the-fold images
   * @default false
   */
  priority?: boolean;
  /**
   * Optional custom CSS classes
   */
  className?: string;
  /**
   * Optional width for the image
   * @default 1920
   */
  width?: number;
  /**
   * Optional height for the image
   * @default 400
   */
  height?: number;
  /**
   * Optional object fit property
   * @default 'cover'
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /**
   * Optional object position property
   * @default 'center'
   */
  objectPosition?: string;
  /**
   * Optional quality of the image (1-100)
   * @default 85
   */
  quality?: number;
  /**
   * Optional loading strategy
   * @default 'lazy'
   */
  loading?: 'lazy' | 'eager';
  /**
   * Optional callback when image loads successfully
   */
  onLoad?: () => void;
  /**
   * Optional callback when image fails to load
   */
  onError?: () => void;
}

/**
 * BannerImage Component
 * 
 * A reusable banner image component with responsive design and proper image optimization.
 * Designed to be displayed at the bottom section of the member benefits page.
 * 
 * Features:
 * - Responsive design with Next.js Image optimization
 * - Lazy loading support
 * - Customizable dimensions and styling
 * - Error handling and loading states
 * - Accessibility compliant
 * 
 * @example
 * ```tsx
 * <BannerImage
 *   src="/images/member-benefits-banner.jpg"
 *   alt="Member Benefits Banner"
 *   priority={false}
 * />
 * ```
 */
export const BannerImage: React.FC<BannerImageProps> = ({
  src,
  alt,
  priority = false,
  className,
  width = 1920,
  height = 400,
  objectFit = 'cover',
  objectPosition = 'center',
  quality = 85,
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  /**
   * Handle image load success
   */
  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  /**
   * Handle image load error
   */
  const handleError = React.useCallback(() => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  if (imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          'w-full h-[200px] md:h-[300px] lg:h-[400px]',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <div className="text-center p-4">
          <p className="text-sm font-medium">Unable to load banner image</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        'h-[200px] md:h-[300px] lg:h-[400px]',
        className
      )}
    >
      {isLoading && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          objectFit,
          objectPosition,
          width: '100%',
          height: '100%',
        }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
      />
    </div>
  );
};

BannerImage.displayName = 'BannerImage';

export default BannerImage;