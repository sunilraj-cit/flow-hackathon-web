import React from 'react';
import BannerSection from '@/components/BannerSection';

/**
 * MemberBenefitsPage Component
 * 
 * Displays member benefits information with a banner section at the bottom.
 * Implements PM-104: Banner image on the bottom section of member benefits page.
 */
const MemberBenefitsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
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
                Join our exclusive community and network with other members.
              </p>
            </div>

            {/* Benefit Card 5 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Learning Resources</h3>
              <p className="text-muted-foreground">
                Access premium educational content and training materials.
              </p>
            </div>

            {/* Benefit Card 6 */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Event Invitations</h3>
              <p className="text-muted-foreground">
                Get invited to exclusive member events and webinars.
              </p>
            </div>
          </div>
        </section>

        {/* Additional Benefits Information */}
        <section className="mb-12">
          <div className="rounded-lg border bg-card p-8">
            <h2 className="text-2xl font-bold mb-4">Why Become a Member?</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Our membership program is designed to provide you with the best possible
                experience and value. Whether you're looking to advance your skills,
                connect with like-minded individuals, or access exclusive resources,
                we have something for everyone.
              </p>
              <p>
                Members enjoy a wide range of benefits that are continuously updated
                and expanded based on feedback and needs. Join our growing community
                today and unlock your full potential.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Banner Section - PM-104: Bottom section banner */}
      <BannerSection />
    </div>
  );
};

export default MemberBenefitsPage;
```