import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BannerImageProps {
  /**
   * Source URL or path for the banner image
   */
  src: string;
  /**
   * Alternative text for accessibility
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
   * Optional object position property
   * @default 'center'
   */
  objectPosition?: string;
  /**
   * Optional quality for image optimization (1-100)
   * @default 85
   */
  quality?: number;
  /**
   * Optional placeholder type
   * @default 'blur'
   */
  placeholder?: 'blur' | 'empty';
  /**
   * Optional blur data URL for placeholder
   */
  blurDataURL?: string;
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
 * A responsive banner image component optimized for the member benefits section.
 * Utilizes Next.js Image component for automatic optimization and lazy loading.
 * 
 * @component
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
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  /**
   * Handles successful image load
   */
  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  /**
   * Handles image load error
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
          'flex items-center justify-center bg-muted',
          'w-full h-[200px] md:h-[300px] lg:h-[400px]',
          className
        )}
        role="img"
        aria-label={alt}
      >
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Unable to load banner image</p>
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
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
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
      {isLoading && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

BannerImage.displayName = 'BannerImage';

export default BannerImage;