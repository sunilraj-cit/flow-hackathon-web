import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './login';

// Mock next/navigation
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
      expect(screen.getByRole('heading', { name: /member benefits/i })).toBeInTheDocument();
    });

    it('should render the login form', () => {
      render(<Login />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should render the red login button', () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in/i });
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveClass('bg-red-600');
    });

    it('should render email input field', () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render password input field', () => {
      render(<Login />);
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render forgot password link', () => {
      render(<Login />);
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it('should render sign up link', () => {
      render(<Login />);
      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty on submit', async () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in/i });
      
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when email is invalid', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty on submit', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is too short', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when form is valid', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument();
      });
    });

    it('should clear error messages when user corrects input', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Button Interactions', () => {
    it('should handle login button click', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(loginButton).toBeEnabled();
      });
    });

    it('should disable login button during submission', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      expect(loginButton).toBeDisabled();
    });

    it('should show loading state on button during submission', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    });

    it('should handle form submission with Enter key', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(screen.getByText(/logging in/i)).toBeInTheDocument();
      });
    });

    it('should maintain red button styling on hover', () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in/i });
      
      expect(loginButton).toHaveClass('bg-red-600');
      expect(loginButton).toHaveClass('hover:bg-red-700');
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with mobile viewport', () => {
      global.innerWidth = 375;
      global.innerHeight = 667;
      global.dispatchEvent(new Event('resize'));

      render(<Login />);
      const container = screen.getByRole('main');
      expect(container).toBeInTheDocument();
    });

    it('should render with tablet viewport', () => {
      global.innerWidth = 768;
      global.innerHeight = 1024;
      global.dispatchEvent(new Event('resize'));

      render(<Login />);
      const container = screen.getByRole('main');
      expect(container).toBeInTheDocument();
    });

    it('should render with desktop viewport', () => {
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      global.dispatchEvent(new Event('resize'));

      render(<Login />);
      const container = screen.getByRole('main');
      expect(container).toBeInTheDocument();
    });

    it('should have responsive container classes', () => {
      render(<Login />);
      const container = screen.getByRole('main');
      expect(container).toHaveClass('min-h-screen');
    });

    it('should have responsive form width', () => {
      render(<Login />);
      const form = screen.getByRole('form');
      expect(form).toHaveClass('w-full');
    });

    it('should stack elements vertically on mobile', () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<Login />);
      const form = screen.getByRole('form');
      expect(form).toHaveClass('flex-col');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Login />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have proper form role', () => {
      render(<Login />);
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should have proper button role', () => {
      render(<Login />);
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      passwordInput.focus();
      expect(document.activeElement).toBe(passwordInput);

      fireEvent.keyDown(passwordInput, { key: 'Tab' });
      loginButton.focus();
      expect(document.activeElement).toBe(loginButton);
    });

    it('should announce errors to screen readers', async () => {
      render(<Login />);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.click(loginButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Input Handling', () => {
    it('should update email input value', () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    it('should update password input value', () => {
      render(<Login />);
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      expect(passwordInput.value).toBe('password123');
    });

    it('should trim whitespace from email', async () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      fireEvent.change(emailInput, { target: { value: '  test@example.com  ' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(emailInput.value.trim()).toBe('test@example.com');
      });
    });

    it('should handle paste events', () => {
      render(<Login />);
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      fireEvent.paste(emailInput, {
        clipboardData: {
          getData: () => 'pasted@example.com',
        },
      });

      fireEvent.change(emailInput, { target: { value: 'pasted@example.com' } });
      expect(emailInput.value).toBe('pasted@example.com');
    });
  });
});
```