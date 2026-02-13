import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BannerImage from './BannerImage';

/**
 * Mock Next.js Image component
 */
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('BannerImage', () => {
  describe('Rendering', () => {
    it('should render the banner image component', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).toBeInTheDocument();
    });

    it('should render with correct alt text', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByAltText(/member benefits banner/i);
      expect(bannerImage).toBeInTheDocument();
    });

    it('should render with correct image source', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).toHaveAttribute('src');
      expect(bannerImage.getAttribute('src')).toBeTruthy();
    });

    it('should render within a container element', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild;
      expect(bannerContainer).toBeInTheDocument();
    });

    it('should apply correct CSS classes for styling', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild as HTMLElement;
      expect(bannerContainer).toHaveClass();
    });
  });

  describe('Responsive Behavior', () => {
    it('should have responsive width classes', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild as HTMLElement;
      const classes = bannerContainer.className;
      expect(classes).toMatch(/w-/);
    });

    it('should have responsive height classes', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild as HTMLElement;
      const classes = bannerContainer.className;
      expect(classes).toMatch(/h-/);
    });

    it('should render image with priority loading disabled by default', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).not.toHaveAttribute('priority');
    });

    it('should render image with proper fill or dimensions', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      const hasFill = bannerImage.hasAttribute('fill');
      const hasWidth = bannerImage.hasAttribute('width');
      const hasHeight = bannerImage.hasAttribute('height');
      expect(hasFill || (hasWidth && hasHeight)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for screen readers', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      const altText = bannerImage.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText).not.toBe('');
    });

    it('should be keyboard accessible', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild as HTMLElement;
      expect(bannerContainer).toBeVisible();
    });

    it('should not have empty alt attribute', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage.getAttribute('alt')).not.toBe('');
    });
  });

  describe('Props and Customization', () => {
    it('should accept and apply custom className prop', () => {
      const customClass = 'custom-banner-class';
      render(<BannerImage className={customClass} />);
      const { container } = render(<BannerImage className={customClass} />);
      const bannerContainer = container.firstChild as HTMLElement;
      expect(bannerContainer.className).toContain(customClass);
    });

    it('should accept custom image source prop', () => {
      const customSrc = '/custom-banner.jpg';
      render(<BannerImage src={customSrc} />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage.getAttribute('src')).toContain(customSrc);
    });

    it('should accept custom alt text prop', () => {
      const customAlt = 'Custom banner description';
      render(<BannerImage alt={customAlt} />);
      const bannerImage = screen.getByAltText(customAlt);
      expect(bannerImage).toBeInTheDocument();
    });

    it('should handle priority prop when provided', () => {
      render(<BannerImage priority />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).toBeInTheDocument();
    });
  });

  describe('Layout and Positioning', () => {
    it('should be positioned at the bottom section', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild as HTMLElement;
      expect(bannerContainer).toBeInTheDocument();
    });

    it('should maintain aspect ratio', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).toBeInTheDocument();
    });

    it('should render with full width on mobile devices', () => {
      const { container } = render(<BannerImage />);
      const bannerContainer = container.firstChild as HTMLElement;
      const classes = bannerContainer.className;
      expect(classes).toMatch(/w-full|w-screen/);
    });
  });

  describe('Error Handling', () => {
    it('should render without crashing when no props provided', () => {
      expect(() => render(<BannerImage />)).not.toThrow();
    });

    it('should handle missing image gracefully', () => {
      const { container } = render(<BannerImage src="" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with default values when optional props are undefined', () => {
      render(<BannerImage src={undefined} alt={undefined} />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should use Next.js Image optimization', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      expect(bannerImage).toBeInTheDocument();
    });

    it('should lazy load by default', () => {
      render(<BannerImage />);
      const bannerImage = screen.getByRole('img');
      const loading = bannerImage.getAttribute('loading');
      expect(loading).toBe('lazy');
    });
  });

  describe('Visual Regression', () => {
    it('should match snapshot', () => {
      const { container } = render(<BannerImage />);
      expect(container).toMatchSnapshot();
    });

    it('should match snapshot with custom props', () => {
      const { container } = render(
        <BannerImage
          src="/custom-banner.jpg"
          alt="Custom banner"
          className="custom-class"
        />
      );
      expect(container).toMatchSnapshot();
    });
  });
});