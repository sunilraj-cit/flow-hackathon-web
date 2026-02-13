'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

/**
 * Login page component for member benefits section
 * Provides email/password authentication with responsive design
 */
export default function MemberBenefitsLogin() {
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
      // Validate inputs
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
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles email input change
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  /**
   * Handles password input change
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    if (error) setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Member Benefits</h1>
          <p className={styles.subtitle}>Sign in to access your benefits</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={styles.input}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
              required
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className={styles.input}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
              required
              aria-required="true"
              aria-invalid={error ? 'true' : 'false'}
            />
          </div>

          {error && (
            <div className={styles.error} role="alert" aria-live="polite">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.footer}>
          <a href="/member-benefits/forgot-password" className={styles.link}>
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
```

```css
/* src/pages/member-benefits/login.module.css */

.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.loginCard {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #2d3748;
}

.input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.input:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
  opacity: 0.6;
}

.input::placeholder {
  color: #a0aec0;
}

.error {
  padding: 0.75rem 1rem;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c53030;
  font-size: 0.875rem;
  margin-top: -0.5rem;
}

.submitButton {
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background-color: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
}

.submitButton:hover:not(:disabled) {
  background-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
}

.submitButton:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);
}

.submitButton:disabled {
  background-color: #fc8181;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.footer {
  margin-top: 1.5rem;
  text-align: center;
}

.link {
  font-size: 0.875rem;
  color: #dc2626;
  text-decoration: none;
  transition: color 0.2s ease;
}

.link:hover {
  color: #b91c1c;
  text-decoration: underline;
}

/* Tablet styles */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }

  .loginCard {
    padding: 2.5rem;
  }

  .title {
    font-size: 2.25rem;
  }

  .subtitle {
    font-size: 1rem;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .loginCard {
    max-width: 450px;
    padding: 3rem;
  }

  .title {
    font-size: 2.5rem;
  }
}

/* Mobile-first accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .input,
  .submitButton,
  .link {
    transition: none;
  }

  .submitButton:hover:not(:disabled) {
    transform: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .input {
    border-width: 2px;
  }

  .submitButton {
    border: 2px solid #991b1b;
  }
}