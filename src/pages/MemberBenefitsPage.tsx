import React from 'react';
import BannerImage from '@/components/BannerImage';

/**
 * MemberBenefitsPage Component
 * 
 * Displays member benefits information with a banner image at the bottom section.
 * 
 * @returns {JSX.Element} The member benefits page component
 */
const MemberBenefitsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Member Benefits</h1>
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
            <h3 className="text-xl font-semibold mb-3">Training Resources</h3>
            <p className="text-muted-foreground">
              Access comprehensive training materials and educational content.
            </p>
          </div>

          {/* Benefit Card 6 */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Rewards Program</h3>
            <p className="text-muted-foreground">
              Earn points and rewards for your engagement and participation.
            </p>
          </div>
        </div>
      </section>

      {/* Additional Information Section */}
      <section className="mb-12">
        <div className="rounded-lg border bg-card p-8">
          <h2 className="text-2xl font-bold mb-4">Why Become a Member?</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              Our membership program is designed to provide you with the best possible
              experience and value. Whether you're looking for exclusive content,
              priority support, or special discounts, we have something for everyone.
            </p>
            <p>
              Join thousands of satisfied members who are already enjoying these
              benefits and more. Start your journey today and unlock a world of
              possibilities.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Banner Section */}
      <section className="mt-12">
        <BannerImage />
      </section>
    </div>
  );
};

export default MemberBenefitsPage;