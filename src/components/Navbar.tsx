import React, { useState, useEffect, useRef } from 'react';
import { PageType, AuthSession, NotificationItem } from '../types';
import { CivicLogoIcon } from './CivicLogo';

interface NavbarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  session: AuthSession | null;
  onOpenModal: (modalName: 'login' | 'register') => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onTrackReport?: (reportId: string) => void;
  onOpenInstantCamera?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  session,
  onOpenModal,
  onLogout,
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onTrackReport,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNavClick = (page: PageType) => {
    onNavigate(page);
    setMenuOpen(false);
  };

  const isAdmin = session?.role === 'admin';

  return (
    <header className="navbar" id="navbar">
      <div className="nav-container">
        {/* Left: CivicFix Brand Logo */}
        <div
          className="nav-logo"
          id="nav-logo-brand"
          onClick={() => handleNavClick('home')}
        >
          <div className="logo-icon">
            <CivicLogoIcon size={38} />
          </div>
          <div className="logo-text">
            <span className="logo-main">CivicFix</span>
            <span className="logo-sub">Smart Infrastructure</span>
          </div>
        </div>

        {/* Center: Main Navigation Links */}
        <nav className={`nav-menu ${menuOpen ? 'active' : ''}`} id="navMenu">
          <button
            type="button"
            id="nav-btn-home"
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            Home
          </button>
          <button
            type="button"
            id="nav-btn-report"
            className={`nav-link ${currentPage === 'report' ? 'active' : ''}`}
            onClick={() => handleNavClick('report')}
          >
            Report Issue
          </button>
          <button
            type="button"
            id="nav-btn-livemap"
            className={`nav-link ${currentPage === 'livemap' ? 'active' : ''}`}
            onClick={() => handleNavClick('livemap')}
          >
            Live Map
          </button>
          <button
            type="button"
            id="nav-btn-track"
            className={`nav-link ${currentPage === 'track' ? 'active' : ''}`}
            onClick={() => handleNavClick('track')}
          >
            Track Report
          </button>

          {/* Authenticated Dashboard Link */}
          {session && (
            <button
              type="button"
              id="nav-btn-dashboard"
              className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              Dashboard
            </button>
          )}

          {/* Admin-only Navigation Link */}
          {isAdmin && (
            <button
              type="button"
              id="nav-btn-admin"
              className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
              onClick={() => handleNavClick('admin')}
            >
              Admin
            </button>
          )}

          <button
            type="button"
            id="nav-btn-about"
            className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => handleNavClick('about')}
          >
            About
          </button>

          {/* Mobile-only Authentication & Profile Quick-access Controls */}
          <div className="mobile-nav-auth-section">
            {!session ? (
              <div className="mobile-auth-buttons">
                <button
                  type="button"
                  id="mobile-btn-login"
                  className="btn btn-outline btn-sm mobile-auth-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenModal('login');
                  }}
                >
                  <i className="fas fa-sign-in-alt"></i> Login
                </button>
                <button
                  type="button"
                  id="mobile-btn-register"
                  className="btn btn-primary btn-sm mobile-auth-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenModal('register');
                  }}
                >
                  <i className="fas fa-user-plus"></i> Register
                </button>
              </div>
            ) : (
              <div className="mobile-user-panel">
                <div className="mobile-user-row">
                  <div className="mobile-user-avatar">
                    {session.fullName ? session.fullName.trim()[0].toUpperCase() : 'U'}
                  </div>
                  <div className="mobile-user-meta">
                    <span className="mobile-user-name">{session.fullName || 'Citizen'}</span>
                    <span className="mobile-user-role">
                      {session.role === 'admin' ? 'Authority Administrator' : 'Verified Citizen'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  id="mobile-btn-logout"
                  className="btn btn-outline btn-sm mobile-logout-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                >
                  <i className="fas fa-sign-out-alt"></i> Log Out
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right: User Controls */}
        <div className="nav-actions">
          {/* Notifications button & dropdown */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              id="notifBtn"
              aria-label="Notifications"
              title="Notifications"
              onClick={(e) => {
                e.stopPropagation();
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
            >
              <i className="far fa-bell"></i>
              {unreadCount > 0 && (
                <span className="notif-badge" id="notifBadge">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className={`notif-dropdown ${notifOpen ? 'active' : ''}`} id="notifDropdown">
              <div className="notif-header">
                <h4>Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notif-mark"
                    id="markAllRead"
                    onClick={onMarkAllNotificationsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list" id="notifList">
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8' }}>
                    <i className="far fa-bell-slash" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div
                      key={notif.id || idx}
                      className={`notif-item ${notif.unread ? 'unread' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (notif.id && onMarkNotificationRead && notif.unread) {
                          onMarkNotificationRead(notif.id);
                        }
                        if (notif.reportId && onTrackReport) {
                          onTrackReport(notif.reportId);
                          setNotifOpen(false);
                        }
                      }}
                      title={notif.unread ? 'Click to mark as read' : ''}
                    >
                      <div
                        className={`notif-item-icon icon-${
                          notif.color === 'success'
                            ? 'green'
                            : notif.color === 'warning'
                            ? 'orange'
                            : 'blue'
                        }`}
                      >
                        <i className={`fas ${notif.icon}`}></i>
                      </div>
                      <div className="notif-item-content">
                        {notif.title && (
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gray-800)', marginBottom: '2px' }}>
                            {notif.title}
                          </div>
                        )}
                        <div className="notif-item-text">{notif.text}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                          <div className="notif-item-time">{notif.time}</div>
                          {notif.emailSent && (
                            <span
                              style={{
                                fontSize: '10px',
                                color: 'var(--primary-600, #0A6EBD)',
                                background: 'rgba(10, 110, 189, 0.08)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Email notification dispatched"
                            >
                              <i className="far fa-envelope"></i> Email Sent
                            </span>
                          )}
                        </div>
                      </div>
                      {notif.unread && (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-500, #0A6EBD)',
                            flexShrink: 0,
                            marginTop: '6px'
                          }}
                          title="Unread"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User Profile Button & Dropdown */}
          {session ? (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                id="nav-profile-btn"
                className={`profile-icon-btn ${profileOpen ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
                title="View Citizen Profile"
                aria-label="User Profile"
              >
                <div className="profile-avatar-circle">
                  {session.fullName ? session.fullName.trim()[0].toUpperCase() : 'U'}
                </div>
                <i className={`fas fa-chevron-down profile-arrow-icon ${profileOpen ? 'open' : ''}`}></i>
              </button>

              {/* Hamburger-style Profile Dropdown Card */}
              <div className={`profile-dropdown-card ${profileOpen ? 'active' : ''}`} id="profileDropdown">
                {/* Header Profile Identity */}
                <div className="profile-dropdown-header">
                  <div className="profile-card-avatar">
                    {session.fullName ? session.fullName.trim()[0].toUpperCase() : 'U'}
                  </div>
                  <div className="profile-card-user-info">
                    <h4 className="profile-card-name">{session.fullName || 'Registered Citizen'}</h4>
                    <div className="profile-card-role-row">
                      <span className={`profile-badge ${session.role === 'admin' ? 'admin' : 'citizen'}`}>
                        <i className={`fas ${session.role === 'admin' ? 'fa-shield-alt' : 'fa-user'}`}></i>{' '}
                        {session.role === 'admin' ? 'Authority Admin' : 'Citizen'}
                      </span>
                      <span className="profile-id-tag">ID: {session.id}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Citizen Registration Details */}
                <div className="profile-details-section">
                  <div className="profile-detail-row">
                    <div className="profile-detail-icon">
                      <i className="far fa-envelope"></i>
                    </div>
                    <div className="profile-detail-body">
                      <div className="profile-detail-label">Email Address</div>
                      <div className="profile-detail-val" title={session.email}>
                        {session.email}
                      </div>
                    </div>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-icon">
                      <i className="fas fa-phone-alt"></i>
                    </div>
                    <div className="profile-detail-body">
                      <div className="profile-detail-label">Phone Number</div>
                      <div className="profile-detail-val">
                        {session.phone || '+91 98401 23456'}
                      </div>
                    </div>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-icon">
                      <i className="fas fa-map-marker-alt"></i>
                    </div>
                    <div className="profile-detail-body">
                      <div className="profile-detail-label">Location / Ward</div>
                      <div className="profile-detail-val">
                        {session.location || (session.ward && session.city ? `${session.ward}, ${session.city}` : `${session.city || 'Tamil Nadu'}${session.ward ? `, ${session.ward}` : ''}`)}
                      </div>
                    </div>
                  </div>

                  <div className="profile-detail-row">
                    <div className="profile-detail-icon">
                      <i className="far fa-calendar-check"></i>
                    </div>
                    <div className="profile-detail-body">
                      <div className="profile-detail-label">Account Status</div>
                      <div className="profile-detail-val text-success">
                        <span className="status-live-indicator"></span> Active Member ({session.joinedDate || 'Verified'})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropdown Action Menu */}
                <div className="profile-dropdown-footer">
                  <button
                    type="button"
                    id="profile-btn-logout"
                    className="profile-logout-btn"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div id="authButtons" className="nav-auth-group">
              <button
                type="button"
                id="btn-login-open"
                className="btn btn-outline btn-sm"
                onClick={() => onOpenModal('login')}
              >
                Login
              </button>
              <button
                type="button"
                id="btn-register-open"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenModal('register')}
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            id="hamburger"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
};
