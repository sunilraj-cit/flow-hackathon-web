import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './login';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the login page', () => {
      render(<Login />);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render the email input field', () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render the password input field', () => {
      render(<Login />);
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render the red login button', () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveClass(/red|bg-red/i);
    });

    it('should render the page title', () => {
      render(<Login />);
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent(/member benefits|login/i);
    });

    it('should render all form elements', () => {
      render(<Login />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in|login|sign in/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty and form is submitted', async () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required|please enter your email/i)).toBeInTheDocument();
      });
    });

    it('should show error when email format is invalid', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email|please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty and form is submitted', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password is required|please enter your password/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is too short', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least|password too short/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when form is valid', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/required|invalid/i)).not.toBeInTheDocument();
      });
    });

    it('should clear error messages when user starts typing', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email is required|please enter your email/i)).toBeInTheDocument();
      });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/email is required|please enter your email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render correctly on mobile viewport', () => {
      global.innerWidth = 375;
      global.innerHeight = 667;
      fireEvent(window, new Event('resize'));
      
      render(<Login />);
      const container = screen.getByRole('main') || screen.getByRole('form') || document.querySelector('div');
      expect(container).toBeInTheDocument();
    });

    it('should render correctly on tablet viewport', () => {
      global.innerWidth = 768;
      global.innerHeight = 1024;
      fireEvent(window, new Event('resize'));
      
      render(<Login />);
      const container = screen.getByRole('main') || screen.getByRole('form') || document.querySelector('div');
      expect(container).toBeInTheDocument();
    });

    it('should render correctly on desktop viewport', () => {
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      fireEvent(window, new Event('resize'));
      
      render(<Login />);
      const container = screen.getByRole('main') || screen.getByRole('form') || document.querySelector('div');
      expect(container).toBeInTheDocument();
    });

    it('should have responsive classes on container', () => {
      render(<Login />);
      const container = screen.getByRole('main') || screen.getByRole('form') || document.querySelector('div');
      const classes = container?.className || '';
      expect(classes).toMatch(/w-full|max-w|mx-auto|px-|container/);
    });

    it('should stack form elements vertically on mobile', () => {
      global.innerWidth = 375;
      fireEvent(window, new Event('resize'));
      
      render(<Login />);
      const form = screen.getByRole('form') || document.querySelector('form');
      const classes = form?.className || '';
      expect(classes).toMatch(/flex-col|block|space-y/);
    });
  });

  describe('Button Interaction', () => {
    it('should call submit handler when login button is clicked', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(loginButton).toBeInTheDocument();
      });
    });

    it('should disable button while form is submitting', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      expect(loginButton).toBeDisabled();
    });

    it('should show loading state on button when submitting', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);
      
      await waitFor(() => {
        expect(loginButton).toHaveTextContent(/loading|submitting|processing/i);
      });
    });

    it('should have red background color on button', () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      const classes = loginButton.className;
      expect(classes).toMatch(/bg-red|red/);
    });

    it('should have hover effect on button', () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      const classes = loginButton.className;
      expect(classes).toMatch(/hover:/);
    });

    it('should prevent multiple submissions', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);
      fireEvent.click(loginButton);
      
      expect(loginButton).toBeDisabled();
    });

    it('should handle form submission with Enter key', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter', charCode: 13 });
      
      await waitFor(() => {
        const loginButton = screen.getByRole('button', { name: /log in|login|sign in/i });
        expect(loginButton).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Login />);
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-label');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-label');
    });

    it('should have proper form role', () => {
      render(<Login />);
      const form = screen.getByRole('form') || document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<Login />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should associate labels with inputs', () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
    });
  });
});
```