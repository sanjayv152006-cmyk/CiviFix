import React from 'react';
import { PageType, AuthSession } from '../types';
import { CivicLogoIcon } from './CivicLogo';

interface FooterProps {
  onNavigate: (page: PageType) => void;
  session?: AuthSession | null;
  onOpenRegister?: () => void;
  onOpenModal?: (modalName: 'register') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, session, onOpenRegister, onOpenModal }) => {
  return (
    <footer className="footer" id="main-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div
              className="nav-logo"
              style={{ cursor: 'pointer' }}
              onClick={() => onNavigate('home')}
            >
              <div className="logo-icon">
                <CivicLogoIcon size={38} />
              </div>
              <div className="logo-text">
                <span className="logo-main">CivicFix</span>
                <span className="logo-sub">Smart Infrastructure</span>
              </div>
            </div>
            <p>
              Report Problems. Improve Your Community. A modern civic-tech platform connecting citizens and authorities.
            </p>
            <div className="footer-social">
              <a href="#twitter" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#facebook" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#instagram" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#linkedin" aria-label="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <button type="button" onClick={() => onNavigate('report')}>
              Report Issue
            </button>
            <button type="button" onClick={() => onNavigate('livemap')}>
              Live Map
            </button>
            <button type="button" onClick={() => onNavigate('track')}>
              Track Report
            </button>
            {session && (
              <button type="button" onClick={() => onNavigate('dashboard')}>
                Dashboard
              </button>
            )}
            {session?.role === 'admin' && (
              <button type="button" onClick={() => onNavigate('admin')}>
                Admin Panel
              </button>
            )}
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <button type="button" onClick={() => onNavigate('about')}>
              About Us
            </button>
            <a href="#mission" onClick={(e) => { e.preventDefault(); onNavigate('about'); }}>
              Our Mission
            </a>
            <a href="#careers" onClick={(e) => e.preventDefault()}>
              Careers
            </a>
            <a href="#contact" onClick={(e) => e.preventDefault()}>
              Contact
            </a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#help" onClick={(e) => e.preventDefault()}>
              Help Center
            </a>
            <a href="#api" onClick={(e) => e.preventDefault()}>
              API Docs
            </a>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Privacy Policy
            </a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>
              Terms of Service
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 CivicFix. Built for Tamil Nadu. Demo project for hackathon.</p>
        </div>
      </div>
    </footer>
  );
};
