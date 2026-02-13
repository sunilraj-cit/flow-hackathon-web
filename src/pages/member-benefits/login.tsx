'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Login page component for member benefits section
 * Provides email/password authentication with responsive design
 */
export default function MemberBenefitsLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handles form submission for login
   * @param e - Form event
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: Implement actual authentication logic
      // Placeholder for authentication API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Validate inputs
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      // On successful login, redirect to member benefits dashboard
      // router.push('/member-benefits/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validates email format
   * @param email - Email string to validate
   * @returns boolean indicating if email is valid
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">Member Benefits</h1>
          <h2 className="login-subtitle">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
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

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 0.5rem 0;
          text-align: center;
        }

        .login-subtitle {
          font-size: 1rem;
          font-weight: 400;
          color: #666;
          margin: 0 0 2rem 0;
          text-align: center;
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
          border-radius: 4px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .form-input:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-input::placeholder {
          color: #9ca3af;
        }

        .error-message {
          padding: 0.75rem;
          background-color: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .submit-button {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background-color: #dc2626;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          margin-top: 0.5rem;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #b91c1c;
        }

        .submit-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        .submit-button:disabled {
          background-color: #fca5a5;
          cursor: not-allowed;
        }

        .submit-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3);
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
            font-size: 1.125rem;
          }
        }

        /* Desktop styles */
        @media (min-width: 1024px) {
          .login-card {
            padding: 3rem;
          }

          .login-title {
            font-size: 2.25rem;
          }
        }

        /* Mobile-first accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .form-input,
          .submit-button {
            transition: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .form-input {
            border-width: 2px;
          }

          .submit-button {
            border: 2px solid white;
          }
        }
      `}</style>
    </div>
  );
}