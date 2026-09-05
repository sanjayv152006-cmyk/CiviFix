import React, { useEffect, useState } from 'react';
import { PageType, Report } from '../../types';

interface HomePageProps {
  reports: Report[];
  onNavigate: (page: PageType) => void;
  onOpenRegister: () => void;
  onOpenInstantCamera?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  reports,
  onNavigate,
  onOpenRegister,
  onOpenInstantCamera
}) => {
  // Animated counters
  const [counts, setCounts] = useState({
    total: 0,
    verified: 0,
    progress: 0,
    resolved: 0
  });

  const totalReportsCount = 1248 + reports.length - 8;
  const verifiedCount = 842;
  const progressCount = 316;
  const resolvedCount = 1027;

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 30;
    const steps = duration / stepTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min(currentStep / steps, 1);
      setCounts({
        total: Math.floor(progress * totalReportsCount),
        verified: Math.floor(progress * verifiedCount),
        progress: Math.floor(progress * progressCount),
        resolved: Math.floor(progress * resolvedCount)
      });
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [totalReportsCount]);

  return (
    <section className="page active" id="home">
      {/* Hero */}
      <div className="hero">
        <div className="hero-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-left">
            <h1 className="hero-title">
              Report Problems.<br />
              <span className="gradient-text">Improve Your Community.</span>
            </h1>
            <p className="hero-desc">
              CivicFix connects citizens and authorities to identify, prioritize and resolve public infrastructure problems faster. From potholes to broken streetlights — every report matters.
            </p>
            <div className="hero-buttons">
              <button
                type="button"
                id="hero-btn-report"
                className="btn btn-primary btn-lg"
                onClick={() => onNavigate('report')}
              >
                <i className="fas fa-plus-circle"></i>
                Report an Issue
              </button>
              <button
                type="button"
                id="hero-btn-livemap"
                className="btn btn-outline btn-lg"
                onClick={() => onNavigate('livemap')}
              >
                <i className="fas fa-map-marked-alt"></i>
                Explore Live Map
              </button>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-num">1,248</div>
                <div className="hero-stat-label">Reports Filed</div>
              </div>
              <div className="hero-divider"></div>
              <div className="hero-stat">
                <div className="hero-stat-num">1,027</div>
                <div className="hero-stat-label">Issues Resolved</div>
              </div>
              <div className="hero-divider"></div>
              <div className="hero-stat">
                <div className="hero-stat-num">24h</div>
                <div className="hero-stat-label">Avg Response</div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-map-card">
              <img
                id="heroMap"
                className="hero-map"
                src={`${(import.meta.env.BASE_URL || './').endsWith('/') ? (import.meta.env.BASE_URL || './') : `${import.meta.env.BASE_URL || './'}/`}image.png`}
                alt="CivicFix - Report, Track, Resolve"
                loading="eager"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Everything you need to fix your community</h2>
            <p className="section-subtitle">
              A complete platform built for citizens and authorities to collaborate on infrastructure improvements.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon icon-blue">
                <i className="fas fa-paper-plane"></i>
              </div>
              <h3>Easy Reporting</h3>
              <p>Report public problems quickly in under 60 seconds with our streamlined intake form.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon icon-teal">
                <i className="fas fa-map-pin"></i>
              </div>
              <h3>Exact Location</h3>
              <p>Pin the exact issue location on an interactive OpenStreetMap-powered map.</p>
            </div>
            <div
              className="feature-card"
              onClick={onOpenInstantCamera || (() => onNavigate('report'))}
              style={{ cursor: 'pointer' }}
              title="Click to launch Instant Camera"
            >
              <div className="feature-icon icon-purple">
                <i className="fas fa-camera"></i>
              </div>
              <h3>
                Photo Evidence <span className="instant-pill" style={{ marginLeft: '4px' }}>Camera</span>
              </h3>
              <p>Capture on-site instant photos or upload pictures to give authorities clear visual context.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon icon-orange">
                <i className="fas fa-brain"></i>
              </div>
              <h3>Smart Classification</h3>
              <p>AI-ready system designed to auto-categorize complaints from uploaded images.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon icon-green">
                <i className="fas fa-route"></i>
              </div>
              <h3>Transparent Tracking</h3>
              <p>Track the complaint from reporting to resolution with a clear status timeline.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon icon-red">
                <i className="fas fa-users-cog"></i>
              </div>
              <h3>Authority Dashboard</h3>
              <p>Authorities can monitor, assign, prioritize and resolve complaints efficiently.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="section section-stats">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Impact</span>
            <h2 className="section-title">Real-time community impact</h2>
            <p className="section-subtitle">See how CivicFix is making a difference across Tamil Nadu.</p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon icon-blue">
                <i className="fas fa-file-alt"></i>
              </div>
              <div className="stat-number">{counts.total.toLocaleString()}</div>
              <div className="stat-label">Total Reports</div>
              <div className="stat-trend up">
                <i className="fas fa-arrow-up"></i> +12% this month
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-teal">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-number">{counts.verified.toLocaleString()}</div>
              <div className="stat-label">Verified</div>
              <div className="stat-trend up">
                <i className="fas fa-arrow-up"></i> +8% this month
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-orange">
                <i className="fas fa-spinner"></i>
              </div>
              <div className="stat-number">{counts.progress.toLocaleString()}</div>
              <div className="stat-label">In Progress</div>
              <div className="stat-trend up">
                <i className="fas fa-arrow-up"></i> +5% this month
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon icon-green">
                <i className="fas fa-flag-checkered"></i>
              </div>
              <div className="stat-number">{counts.resolved.toLocaleString()}</div>
              <div className="stat-label">Resolved</div>
              <div className="stat-trend up">
                <i className="fas fa-arrow-up"></i> +15% this month
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Process</span>
            <h2 className="section-title">How CivicFix works</h2>
            <p className="section-subtitle">From reporting to resolution in four simple steps.</p>
          </div>
          <div className="process-grid">
            <div className="process-card">
              <div className="process-num">1</div>
              <div className="process-icon">
                <i className="fas fa-camera-retro"></i>
              </div>
              <h3>Spot &amp; Report</h3>
              <p>Citizens spot infrastructure issues and submit a report with photo, location and details.</p>
            </div>
            <div className="process-card">
              <div className="process-num">2</div>
              <div className="process-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <h3>Verify &amp; Prioritize</h3>
              <p>Authorities verify reports and assign smart priority based on severity and location.</p>
            </div>
            <div className="process-card">
              <div className="process-num">3</div>
              <div className="process-icon">
                <i className="fas fa-hard-hat"></i>
              </div>
              <h3>Assign &amp; Resolve</h3>
              <p>Field teams are dispatched to address the issue with real-time progress updates.</p>
            </div>
            <div className="process-card">
              <div className="process-num">4</div>
              <div className="process-icon">
                <i className="fas fa-check-double"></i>
              </div>
              <h3>Track &amp; Close</h3>
              <p>Citizens track progress end-to-end and confirm resolution once completed.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="section">
        <div className="container">
          <div className="cta-banner">
            <div className="cta-content">
              <h2>Ready to fix your community?</h2>
              <p>Join thousands of citizens making their neighborhoods safer and better.</p>
            </div>
            <div className="cta-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => onNavigate('report')}
              >
                <i className="fas fa-plus-circle"></i>
                Report an Issue
              </button>
              <button
                type="button"
                className="btn btn-white btn-lg"
                onClick={onOpenRegister}
              >
                <i className="fas fa-user-plus"></i>
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
