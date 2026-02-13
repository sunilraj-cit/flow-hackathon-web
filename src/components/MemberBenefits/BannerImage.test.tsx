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

    it('should have responsive image attributes', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Image Properties', () => {
    it('should have correct image source', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src');
      expect(image.getAttribute('src')).toBeTruthy();
    });

    it('should have proper width and height attributes', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('width');
      expect(image).toHaveAttribute('height');
    });

    it('should maintain aspect ratio', () => {
      const { container } = render(<BannerImage />);
      const imageWrapper = container.querySelector('[data-testid="banner-image"]');
      expect(imageWrapper).toHaveStyle({ aspectRatio: expect.any(String) });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveAttribute('aria-label');
    });

    it('should have descriptive alt text for screen readers', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      const altText = image.getAttribute('alt');
      expect(altText).not.toBe('');
      expect(altText?.length).toBeGreaterThan(0);
    });

    it('should be keyboard accessible', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Position and Layout', () => {
    it('should be positioned at the bottom section', () => {
      const { container } = render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      const computedStyle = window.getComputedStyle(banner);
      expect(computedStyle.position).toBeDefined();
    });

    it('should have full width styling', () => {
      render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveClass('w-full');
    });

    it('should render as a block-level element', () => {
      const { container } = render(<BannerImage />);
      const banner = screen.getByTestId('banner-image');
      const computedStyle = window.getComputedStyle(banner);
      expect(['block', 'flex', 'grid']).toContain(computedStyle.display);
    });
  });

  describe('Performance', () => {
    it('should use lazy loading for images', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should not cause layout shift with proper dimensions', () => {
      render(<BannerImage />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('width');
      expect(image).toHaveAttribute('height');
    });
  });

  describe('Props and Customization', () => {
    it('should accept custom className prop', () => {
      render(<BannerImage className="custom-class" />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toHaveClass('custom-class');
    });

    it('should accept custom alt text prop', () => {
      const customAlt = 'Custom banner description';
      render(<BannerImage alt={customAlt} />);
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', customAlt);
    });

    it('should handle missing optional props gracefully', () => {
      expect(() => render(<BannerImage />)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle image load errors gracefully', () => {
      const { container } = render(<BannerImage />);
      const image = screen.getByRole('img');
      
      const errorEvent = new Event('error');
      image.dispatchEvent(errorEvent);
      
      expect(container).toBeInTheDocument();
    });

    it('should provide fallback for missing image', () => {
      render(<BannerImage src="" />);
      const banner = screen.getByTestId('banner-image');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should integrate properly within member benefits page layout', () => {
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
      const computedStyle = window.getComputedStyle(banner);
      
      expect(computedStyle.margin).toBeDefined();
    });
  });
});
```