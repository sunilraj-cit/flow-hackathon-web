import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
   * Optional CSS classes to apply to the container
   */
  className?: string;
  /**
   * Optional width for the image (in pixels)
   * @default 1920
   */
  width?: number;
  /**
   * Optional height for the image (in pixels)
   * @default 400
   */
  height?: number;
  /**
   * Optional object fit property
   * @default 'cover'
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /**
   * Optional quality setting for image optimization (1-100)
   * @default 85
   */
  quality?: number;
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
 * A responsive banner image component optimized for the member benefits page.
 * Utilizes Next.js Image component for automatic optimization and lazy loading.
 * 
 * @component
 * @example
 * ```tsx
 * <BannerImage
 *   src="/images/member-benefits-banner.jpg"
 *   alt="Member Benefits"
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
  quality = 85,
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  /**
   * Handle successful image load
   */
  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  /**
   * Handle image load error
   */
  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError) {
    return (
      <div
        className={cn(
          'relative w-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900',
          'flex items-center justify-center',
          className
        )}
        style={{ height: `${height}px` }}
        role="img"
        aria-label={alt}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        'rounded-lg shadow-md',
        'transition-all duration-300 ease-in-out',
        'hover:shadow-lg',
        className
      )}
      style={{ height: `${height}px` }}
    >
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"
          aria-label="Loading image"
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          objectFit,
          width: '100%',
          height: '100%',
        }}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1920px"
      />
    </div>
  );
};

BannerImage.displayName = 'BannerImage';

export default BannerImage;