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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Member Benefits
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your benefits
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                className={`w-full ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={isLoading}
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
                placeholder="Enter your password"
                className={`w-full ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={isLoading}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 text-white font-medium py-2.5 transition-colors duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="#"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              Forgot your password?
            </a>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <a
              href="#"
              className="font-medium text-red-600 hover:text-red-700 transition-colors duration-200"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}