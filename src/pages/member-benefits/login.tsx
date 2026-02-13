'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

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
 * A minimalist, responsive login page for the member benefits section.
 * Features email/password authentication with a red-styled submit button.
 * 
 * @returns {JSX.Element} The login page component
 */
export default function MemberBenefitsLogin(): JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Handles form submission for login
   * 
   * @param {LoginFormData} data - The validated form data
   */
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);

    try {
      // TODO: Implement actual authentication logic
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Login Successful',
        description: 'Welcome to Member Benefits',
      });

      // TODO: Redirect to member benefits dashboard
      console.log('Login data:', data);
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'Please check your credentials and try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Member Benefits
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your benefits
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isLoading}
                className={`w-full ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  New to Member Benefits?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a
                href="#"
                className="font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Create an account
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}