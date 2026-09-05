import React from 'react';

export const AboutPage: React.FC = () => {
  return (
    <section className="page active" id="about">
      <div className="about-hero">
        <div className="container">
          <span className="section-tag">About</span>
          <h1 className="page-title">About CivicFix</h1>
          <p className="page-subtitle">
            CivicFix connects citizens and authorities to improve public infrastructure through location-based reporting, transparent tracking and smart prioritization.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon icon-blue">
              <i className="fas fa-bullseye"></i>
            </div>
            <h3>Our Mission</h3>
            <p>
              To empower every citizen to actively participate in improving their community infrastructure by making reporting effortless, tracking transparent and resolution measurable. We believe bridging the gap between citizens and municipal authorities creates safer, cleaner and more livable cities.
            </p>
          </div>
          <div className="about-card">
            <div className="about-icon icon-teal">
              <i className="fas fa-cogs"></i>
            </div>
            <h3>How It Works</h3>
            <p>
              Citizens report infrastructure issues with photos and precise locations. Our smart system categorizes and prioritizes reports based on severity and impact. Authorities receive verified, actionable tickets and dispatch field teams. Progress is tracked end-to-end with real-time status updates visible to everyone.
            </p>
          </div>
          <div className="about-card">
            <div className="about-icon icon-green">
              <i className="fas fa-seedling"></i>
            </div>
            <h3>Community Impact</h3>
            <p>
              Since launch, CivicFix has helped resolve over 1,000 infrastructure issues across Tamil Nadu. From dangerous potholes on busy arterial roads to broken streetlights near schools, every resolved report makes a community safer. Our transparent tracking builds trust between citizens and local government.
            </p>
          </div>
          <div className="about-card">
            <div className="about-icon icon-purple">
              <i className="fas fa-microchip"></i>
            </div>
            <h3>Technology</h3>
            <p>
              Built on modern web technologies with OpenStreetMap and Leaflet integration for precise geolocation. Our AI-ready architecture supports automated issue classification and smart priority assignment. The platform scales from neighborhood wards to entire metropolitan cities while maintaining sub-second response times.
            </p>
          </div>
        </div>

        <div className="about-values">
          <h2>Our Core Values</h2>
          <div className="values-grid">
            <div className="value-item">
              <i className="fas fa-eye"></i>
              <h4>Transparency</h4>
              <p>Every report, every status, every resolution — visible and trackable to all.</p>
            </div>
            <div className="value-item">
              <i className="fas fa-bolt"></i>
              <h4>Speed</h4>
              <p>From report submission to field resolution in record time through smart workflows.</p>
            </div>
            <div className="value-item">
              <i className="fas fa-handshake"></i>
              <h4>Collaboration</h4>
              <p>Citizens and authorities working constructively together as one dedicated team.</p>
            </div>
            <div className="value-item">
              <i className="fas fa-shield-alt"></i>
              <h4>Accountability</h4>
              <p>Clear municipal ownership, SLA monitoring, and verification for every reported issue.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
