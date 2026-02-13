import React from 'react';
import BannerImage from '@/components/BannerImage';

/**
 * MemberBenefits Page Component
 * 
 * Displays member benefits information with a banner image at the bottom section.
 * 
 * @returns {JSX.Element} The member benefits page component
 */
const MemberBenefits: React.FC = () => {
  return (
    <div className="member-benefits-container">
      <div className="member-benefits-content">
        <section className="benefits-header">
          <h1 className="text-4xl font-bold mb-6">Member Benefits</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Discover the exclusive benefits available to our members
          </p>
        </section>

        <section className="benefits-list mb-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Benefits content can be added here */}
          </div>
        </section>
      </div>

      <section className="banner-section mt-auto">
        <BannerImage />
      </section>
    </div>
  );
};

export default MemberBenefits;