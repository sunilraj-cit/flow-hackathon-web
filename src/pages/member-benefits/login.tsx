'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Login page component for member benefits section
 * Provides a simple, responsive login form with email and password fields
 * @returns {JSX.Element} Login page component
 */
export default function MemberBenefitsLogin(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  /**
   * Handles form submission for login
   * @param {FormEvent<HTMLFormElement>} e - Form event
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        setError('Please enter both email and password');
        setIsLoading(false);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // TODO: Implement actual authentication logic
      // This is a placeholder for the authentication API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // On successful login, redirect to member benefits dashboard
      // router.push('/member-benefits/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
          <h1 className="login-title">Member Benefits</h1>
          <h2 className="login-subtitle">Sign In</h2>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                disabled={isLoading}
                autoComplete="email"
                required
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
                disabled={isLoading}
                autoComplete="current-password"
                required
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
              {isLoading ? 'Signing In...' : 'Sign In'}
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
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
          margin: 0 0 0.5rem 0;
          text-align: center;
        }

        .login-subtitle {
          font-size: 1.25rem;
          font-weight: 500;
          color: #666;
          margin: 0 0 2rem 0;
          text-align: center;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
          border: 1px solid #ddd;
          border-radius: 4px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #dc2626;
        }

        .form-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .error-message {
          padding: 0.75rem;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c33;
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
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #b91c1c;
        }

        .submit-button:active:not(:disabled) {
          background-color: #991b1b;
        }

        .submit-button:disabled {
          background-color: #fca5a5;
          cursor: not-allowed;
        }

        @media (min-width: 640px) {
          .login-card {
            padding: 2.5rem;
          }

          .login-title {
            font-size: 1.75rem;
          }

          .login-subtitle {
            font-size: 1.5rem;
          }
        }

        @media (min-width: 768px) {
          .login-card {
            padding: 3rem;
          }

          .login-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 374px) {
          .login-card {
            padding: 1.5rem;
          }

          .login-title {
            font-size: 1.25rem;
          }

          .login-subtitle {
            font-size: 1.125rem;
          }

          .form-input,
          .submit-button {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
```