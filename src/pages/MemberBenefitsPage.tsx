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
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Exclusive Access</h3>
            <p className="text-muted-foreground">
              Get early access to new features and premium content before anyone else.
            </p>
          </div>

          {/* Benefit Card 2 */}
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Priority Support</h3>
            <p className="text-muted-foreground">
              Receive dedicated support from our team with faster response times.
            </p>
          </div>

          {/* Benefit Card 3 */}
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Special Discounts</h3>
            <p className="text-muted-foreground">
              Enjoy member-only discounts on products and services.
            </p>
          </div>

          {/* Benefit Card 4 */}
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Community Access</h3>
            <p className="text-muted-foreground">
              Join our exclusive community and network with other members.
            </p>
          </div>

          {/* Benefit Card 5 */}
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Educational Resources</h3>
            <p className="text-muted-foreground">
              Access premium educational content and training materials.
            </p>
          </div>

          {/* Benefit Card 6 */}
          <div className="p-6 border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Events & Webinars</h3>
            <p className="text-muted-foreground">
              Participate in exclusive member events and webinars.
            </p>
          </div>
        </div>
      </section>

      {/* Additional Information Section */}
      <section className="mb-12">
        <div className="bg-muted p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Why Become a Member?</h2>
          <p className="text-muted-foreground mb-4">
            Our membership program is designed to provide you with the best possible
            experience and value. Whether you're looking for exclusive content,
            networking opportunities, or professional development resources, we have
            something for everyone.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Unlimited access to all premium features</li>
            <li>Monthly member-only events and workshops</li>
            <li>Personalized recommendations and insights</li>
            <li>Flexible membership options to suit your needs</li>
          </ul>
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