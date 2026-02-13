'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Member Benefits Login Page Component
 * 
 * A responsive login page for member benefits with email/password fields
 * and a red submit button. Implements mobile-first design approach.
 * 
 * @returns {JSX.Element} The login page component
 */
export default function MemberBenefitsLogin(): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Handles form submission
   * 
   * @param {LoginFormData} data - The form data containing email and password
   */
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Implement actual authentication logic
      console.log('Login attempt:', { email: data.email });
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Handle successful login (redirect, store token, etc.)
      // window.location.href = '/member-benefits/dashboard';
    } catch (error) {
      setSubmitError('Login failed. Please check your credentials and try again.');
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Member Benefits</h1>
            <p className="login-subtitle">Sign in to access your benefits</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                placeholder="Enter your email"
                {...register('email')}
              />
              {errors.email && (
                <p className="form-error" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                placeholder="Enter your password"
                {...register('password')}
              />
              {errors.password && (
                <p className="form-error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {submitError && (
              <div className="submit-error" role="alert">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <a href="/member-benefits/forgot-password" className="footer-link">
              Forgot your password?
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          padding: 1rem;
        }

        .login-wrapper {
          width: 100%;
          max-width: 400px;
        }

        .login-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 0.5rem 0;
        }

        .login-subtitle {
          font-size: 0.875rem;
          color: #666;
          margin: 0;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #333;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          transition: all 0.2s;
          outline: none;
        }

        .form-input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .form-input-error {
          border-color: #dc2626;
        }

        .form-error {
          font-size: 0.75rem;
          color: #dc2626;
          margin: 0;
        }

        .submit-error {
          padding: 0.75rem;
          background-color: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #991b1b;
          font-size: 0.875rem;
          text-align: center;
        }

        .submit-button {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background-color: #dc2626;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 0.5rem;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #b91c1c;
        }

        .submit-button:active:not(:disabled) {
          background-color: #991b1b;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 1.5rem;
          text-align: center;
        }

        .footer-link {
          font-size: 0.875rem;
          color: #dc2626;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: #b91c1c;
          text-decoration: underline;
        }

        /* Tablet styles */
        @media (min-width: 640px) {
          .login-card {
            padding: 2.5rem;
          }

          .login-title {
            font-size: 2rem;
          }

          .login-subtitle {
            font-size: 1rem;
          }
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          .login-container {
            padding: 2rem;
          }

          .login-card {
            padding: 3rem;
          }

          .login-title {
            font-size: 2.25rem;
          }
        }
      `}</style>
    </div>
  );
}
```