import React from 'react';
import BannerSection from '@/components/BannerSection';

/**
 * MemberBenefitsPage Component
 * 
 * Displays member benefits information with a banner section at the bottom.
 * Implements PM-104: Create banner image on the bottom section of member benefits
 */
const MemberBenefitsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Member Benefits
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover the exclusive benefits available to our members
          </p>
        </header>

        {/* Benefits Content Section */}
        <section className="mb-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Benefit Card 1 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Exclusive Access</h3>
              <p className="text-muted-foreground">
                Get early access to new features and premium content before anyone else.
              </p>
            </div>

            {/* Benefit Card 2 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Priority Support</h3>
              <p className="text-muted-foreground">
                Receive dedicated support from our team with faster response times.
              </p>
            </div>

            {/* Benefit Card 3 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Special Discounts</h3>
              <p className="text-muted-foreground">
                Enjoy member-only discounts on products and services.
              </p>
            </div>

            {/* Benefit Card 4 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Community Access</h3>
              <p className="text-muted-foreground">
                Join our exclusive community and connect with like-minded members.
              </p>
            </div>

            {/* Benefit Card 5 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Educational Resources</h3>
              <p className="text-muted-foreground">
                Access premium educational content, webinars, and training materials.
              </p>
            </div>

            {/* Benefit Card 6 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Rewards Program</h3>
              <p className="text-muted-foreground">
                Earn points and rewards for your engagement and loyalty.
              </p>
            </div>
          </div>
        </section>

        {/* Additional Benefits Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Why Become a Member?</h2>
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <p className="text-muted-foreground mb-4">
              Our membership program is designed to provide you with the best possible
              experience and value. Whether you're looking for exclusive content,
              priority support, or special discounts, we have something for everyone.
            </p>
            <p className="text-muted-foreground mb-4">
              Join thousands of satisfied members who have already discovered the
              benefits of being part of our community. Start your journey today and
              unlock a world of possibilities.
            </p>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="mb-12 text-center">
          <div className="rounded-lg border bg-card p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Join our community today and start enjoying all the benefits of membership.
            </p>
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
              Become a Member
            </button>
          </div>
        </section>
      </div>

      {/* Banner Section - PM-104: Bottom section banner */}
      <BannerSection />
    </div>
  );
};

export default MemberBenefitsPage;