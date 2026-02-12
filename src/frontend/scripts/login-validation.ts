/**
 * Login Form Validation and Submission Handler
 * Provides client-side validation and form submission handling for the member benefits login page
 * @module login-validation
 */

import { z } from 'zod';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long'),
});

/**
 * Type definition for login form data
 */
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Type definition for validation errors
 */
export interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Type definition for form submission result
 */
export interface SubmissionResult {
  success: boolean;
  errors?: ValidationErrors;
  message?: string;
}

/**
 * Validates login form data against the schema
 * @param data - The form data to validate
 * @returns Object containing validation success status and any errors
 */
export function validateLoginForm(data: {
  email: string;
  password: string;
}): { isValid: boolean; errors: ValidationErrors } {
  try {
    loginSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationErrors = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as keyof ValidationErrors;
        if (field === 'email' || field === 'password') {
          errors[field] = err.message;
        }
      });
      return { isValid: false, errors };
    }
    return {
      isValid: false,
      errors: { general: 'An unexpected validation error occurred' },
    };
  }
}

/**
 * Displays error messages in the UI
 * @param errors - Object containing field-specific error messages
 */
export function displayErrors(errors: ValidationErrors): void {
  // Clear previous errors
  clearErrors();

  // Display email error
  if (errors.email) {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const emailError = document.getElementById('email-error');
    if (emailInput) {
      emailInput.classList.add('error');
      emailInput.setAttribute('aria-invalid', 'true');
    }
    if (emailError) {
      emailError.textContent = errors.email;
      emailError.classList.remove('hidden');
    }
  }

  // Display password error
  if (errors.password) {
    const passwordInput = document.getElementById(
      'password'
    ) as HTMLInputElement;
    const passwordError = document.getElementById('password-error');
    if (passwordInput) {
      passwordInput.classList.add('error');
      passwordInput.setAttribute('aria-invalid', 'true');
    }
    if (passwordError) {
      passwordError.textContent = errors.password;
      passwordError.classList.remove('hidden');
    }
  }

  // Display general error
  if (errors.general) {
    const generalError = document.getElementById('general-error');
    if (generalError) {
      generalError.textContent = errors.general;
      generalError.classList.remove('hidden');
    }
  }
}

/**
 * Clears all error messages from the UI
 */
export function clearErrors(): void {
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const generalError = document.getElementById('general-error');

  if (emailInput) {
    emailInput.classList.remove('error');
    emailInput.removeAttribute('aria-invalid');
  }
  if (passwordInput) {
    passwordInput.classList.remove('error');
    passwordInput.removeAttribute('aria-invalid');
  }
  if (emailError) {
    emailError.textContent = '';
    emailError.classList.add('hidden');
  }
  if (passwordError) {
    passwordError.textContent = '';
    passwordError.classList.add('hidden');
  }
  if (generalError) {
    generalError.textContent = '';
    generalError.classList.add('hidden');
  }
}

/**
 * Handles form submission with validation
 * @param event - The form submission event
 * @returns Promise resolving to submission result
 */
export async function handleLoginSubmit(
  event: Event
): Promise<SubmissionResult> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const submitButton = form.querySelector(
    'button[type="submit"]'
  ) as HTMLButtonElement;

  // Get form data
  const formData = new FormData(form);
  const email = (formData.get('email') as string)?.trim() || '';
  const password = (formData.get('password') as string) || '';

  // Validate form data
  const { isValid, errors } = validateLoginForm({ email, password });

  if (!isValid) {
    displayErrors(errors);
    return { success: false, errors };
  }

  // Clear any previous errors
  clearErrors();

  // Disable submit button during submission
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
  }

  try {
    // Submit form data to API
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Successful login
    return {
      success: true,
      message: 'Login successful! Redirecting...',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    displayErrors({ general: errorMessage });

    return {
      success: false,
      errors: { general: errorMessage },
    };
  } finally {
    // Re-enable submit button
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Log In';
    }
  }
}

/**
 * Adds real-time validation to form inputs
 * @param inputId - The ID of the input element
 */
export function addInputValidation(inputId: string): void {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!input) return;

  input.addEventListener('blur', () => {
    const value = input.value.trim();
    const fieldName = input.name as 'email' | 'password';

    try {
      if (fieldName === 'email') {
        loginSchema.shape.email.parse(value);
      } else if (fieldName === 'password') {
        loginSchema.shape.password.parse(value);
      }

      // Clear error if validation passes
      const errorElement = document.getElementById(`${inputId}-error`);
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
      input.classList.remove('error');
      input.removeAttribute('aria-invalid');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message || 'Invalid input';
        const errorElement = document.getElementById(`${inputId}-error`);
        if (errorElement) {
          errorElement.textContent = errorMessage;
          errorElement.classList.remove('hidden');
        }
        input.classList.add('error');
        input.setAttribute('aria-invalid', 'true');
      }
    }
  });

  // Clear error on input
  input.addEventListener('input', () => {
    const errorElement = document.getElementById(`${inputId}-error`);
    if (errorElement && !errorElement.classList.contains('hidden')) {
      input.classList.remove('error');
      input.removeAttribute('aria-invalid');
    }
  });
}

/**
 * Initializes the login form with validation and submission handling
 */
export function initializeLoginForm(): void {
  const form = document.getElementById('login-form') as HTMLFormElement;
  if (!form) {
    console.error('Login form not found');
    return;
  }

  // Add form submission handler
  form.addEventListener('submit', async (event) => {
    const result = await handleLoginSubmit(event);

    if (result.success) {
      // Redirect to member benefits dashboard
      window.location.href = '/member-benefits/dashboard';
    }
  });

  // Add real-time validation to inputs
  addInputValidation('email');
  addInputValidation('password');

  // Add password visibility toggle if present
  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password') as HTMLInputElement;

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type =
        passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.setAttribute(
        'aria-label',
        type === 'password' ? 'Show password' : 'Hide password'
      );
    });
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLoginForm);
  } else {
    initializeLoginForm();
  }
}
```