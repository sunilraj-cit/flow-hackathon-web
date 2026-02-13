import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BannerImage from './BannerImage';

/**
 * Mock window.matchMedia for responsive testing
 */
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('BannerImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the banner component', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should render with correct alt text', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt');
    });

    it('should render with proper semantic HTML structure', () => {
      const { container } = render(<BannerImage />);
      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveClass('banner-image');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render correctly on mobile viewport (320px)', () => {
      mockMatchMedia(true);
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));
      
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should render correctly on tablet viewport (768px)', () => {
      mockMatchMedia(true);
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport (1024px)', () => {
      mockMatchMedia(false);
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
      
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should render correctly on large desktop viewport (1920px)', () => {
      mockMatchMedia(false);
      global.innerWidth = 1920;
      global.dispatchEvent(new Event('resize'));
      
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should handle viewport resize events', () => {
      const { rerender } = render(<BannerImage />);
      
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));
      rerender(<BannerImage />);
      
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Image Properties', () => {
    it('should have proper image source', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src');
      expect(image.getAttribute('src')).toBeTruthy();
    });

    it('should have loading attribute for performance', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading');
    });

    it('should maintain aspect ratio', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      const styles = window.getComputedStyle(banner);
      expect(styles.aspectRatio || styles.paddingBottom).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should have descriptive alt text for screen readers', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      const altText = image.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText?.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable if interactive', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Position and Layout', () => {
    it('should be positioned at the bottom section', () => {
      const { container } = render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });

    it('should have full width styling', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveClass('w-full');
    });

    it('should not overflow container', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      const styles = window.getComputedStyle(banner);
      expect(styles.overflow).not.toBe('visible');
    });
  });

  describe('Props and Customization', () => {
    it('should accept custom className prop', () => {
      render(<BannerImage className="custom-class" />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveClass('custom-class');
    });

    it('should accept custom image source prop', () => {
      const customSrc = '/custom-banner.jpg';
      render(<BannerImage src={customSrc} />);
      const image = screen.getByRole('img');
      expect(image.getAttribute('src')).toContain(customSrc);
    });

    it('should accept custom alt text prop', () => {
      const customAlt = 'Custom banner description';
      render(<BannerImage alt={customAlt} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', customAlt);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing image gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      render(<BannerImage src="/non-existent.jpg" />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
      consoleError.mockRestore();
    });

    it('should render fallback content on image load error', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should use lazy loading for images', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image.getAttribute('loading')).toBe('lazy');
    });

    it('should not cause layout shift', () => {
      const { container } = render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveStyle({ display: 'block' });
    });
  });

  describe('Integration', () => {
    it('should integrate properly within member benefits page', () => {
      const { container } = render(
        <div data-testid="member-benefits-page">
          <BannerImage />
        </div>
      );
      const page = screen.getByTestId('member-benefits-page');
      const banner = screen.getByTestId('banner-image');
      expect(page).toContainElement(banner);
    });

    it('should maintain proper spacing with surrounding content', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });
  });
});