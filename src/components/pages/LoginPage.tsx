import React, { useState } from 'react';
import { AuthSession } from '../../types';
import { CivicLogo } from '../CivicLogo';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, showToast }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('Chennai');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'citizen' | 'admin'>('citizen');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Quick autofill helper
  const handleQuickFill = (roleType: 'admin' | 'citizen') => {
    if (roleType === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
      showToast('Credentials Applied', 'Admin credentials loaded: admin / admin123', 'info');
    } else {
      setIdentifier('citizen');
      setPassword('citizen123');
      showToast('Credentials Applied', 'Citizen credentials loaded: citizen / citizen123', 'info');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showToast('Error', 'Please enter your CivicFix ID/Email and password.', 'error');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('civicfix_users') || '[]');
    const user = storedUsers.find(
      (u: any) =>
        u.id?.toLowerCase() === identifier.trim().toLowerCase() ||
        u.email?.toLowerCase() === identifier.trim().toLowerCase()
    );

    if (user && user.password === password) {
      const sessionUser: AuthSession = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '+91 98401 23456',
        city: user.city || 'Tamil Nadu',
        ward: user.ward || 'General Zone',
        role: user.role,
        joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Aug 2024'
      };
      onLoginSuccess(sessionUser);
      showToast('Welcome Back', `Logged in as ${user.fullName} (${user.role})`, 'success');
      return;
    }

    // Default admin shortcut
    if (identifier.trim().toLowerCase() === 'admin' && password === 'admin123') {
      const sessionUser: AuthSession = {
        id: 'CFA0001',
        fullName: 'Officer Kumar',
        email: 'officer.k@civicfix.gov',
        phone: '+91 94440 98765',
        city: 'Madurai Municipal Corp',
        ward: 'Central Command HQ',
        role: 'admin',
        joinedDate: 'Jan 2024'
      };
      onLoginSuccess(sessionUser);
      showToast('Welcome Admin', 'Signed in with Authority Administrative Privileges.', 'success');
      return;
    }

    // Default citizen shortcut
    if (identifier.trim().toLowerCase() === 'citizen' && password === 'citizen123') {
      const sessionUser: AuthSession = {
        id: 'CFU10001',
        fullName: 'Sanjay',
        email: 'sanju19@gmail.com',
        phone: '+91 98401 23456',
        city: 'Tirupur',
        ward: 'MS Nagar',
        location: 'MS Nagar, Tirupur',
        role: 'citizen',
        joinedDate: 'Aug 2024'
      };
      onLoginSuccess(sessionUser);
      showToast('Welcome Citizen', 'Signed in as Sanjay.', 'success');
      return;
    }

    showToast('Login Failed', 'Invalid CivicFix ID/email or password. Please try again.', 'error');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !regEmail.trim() || !regPassword.trim()) {
      showToast('Error', 'Please complete all required fields.', 'error');
      return;
    }

    if (!agreeTerms) {
      showToast('Terms Required', 'Please accept the Terms of Service to create an account.', 'warning');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('civicfix_users') || '[]');
    if (storedUsers.some((u: any) => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      showToast('Email Taken', 'An account with this email address already exists. Please login.', 'error');
      setActiveTab('login');
      setIdentifier(regEmail.trim());
      return;
    }

    const lastIdNum =
      storedUsers.length > 0
        ? parseInt(storedUsers[storedUsers.length - 1].id?.replace('CFU', '') || '10001')
        : 10001;
    const newUserId = `CFU${lastIdNum + 1}`;

    const newUser = {
      id: newUserId,
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      email: regEmail.trim(),
      phone: regPhone.trim() || '+91 98401 23456',
      city: regCity.trim() || 'Tamil Nadu',
      ward: `${regCity.trim()} Zone`,
      password: regPassword,
      role: regRole,
      createdAt: new Date().toISOString()
    };

    storedUsers.push(newUser);
    localStorage.setItem('civicfix_users', JSON.stringify(storedUsers));

    const session: AuthSession = {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      city: newUser.city,
      ward: newUser.ward,
      role: newUser.role,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    };

    onLoginSuccess(session);
    showToast(
      'Account Created',
      `Welcome ${newUser.fullName}! Your CivicFix ID is ${newUserId}.`,
      'success',
      6000
    );
  };

  return (
    <div
      id="loginGatewayScreen"
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #0A1929 0%, #0F2744 50%, #173A5E 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* Background ambient accents */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 150, 136, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '10%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30, 136, 229, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Main Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          zIndex: 10,
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* Top Branding Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #00897B 0%, #00695C 100%)',
            padding: '28px 24px 22px',
            textAlign: 'center',
            color: '#FFFFFF'
          }}
        >
          <div
            style={{
              width: '74px',
              height: '74px',
              margin: '0 auto 14px',
              background: '#FFFFFF',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
              border: '1.5px solid rgba(255, 255, 255, 0.85)',
              padding: '6px',
              boxSizing: 'border-box'
            }}
            title="CivicFix"
          >
            <CivicLogo size={60} variant="emblem" />
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              margin: '0 0 4px',
              fontFamily: 'var(--font-display, sans-serif)'
            }}
          >
            CivicFix
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.85)',
              margin: 0,
              fontWeight: 500
            }}
          >
            Tamil Nadu Civic Grievance & Infrastructure Redressal Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #E2E8F0',
            background: '#F8FAFC'
          }}
        >
          <button
            type="button"
            id="tab-login"
            onClick={() => setActiveTab('login')}
            style={{
              flex: 1,
              padding: '14px 16px',
              border: 'none',
              background: activeTab === 'login' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'login' ? '3px solid #00897B' : '3px solid transparent',
              color: activeTab === 'login' ? '#00897B' : '#64748B',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fas fa-sign-in-alt"></i>
            <span>Sign In</span>
          </button>
          <button
            type="button"
            id="tab-register"
            onClick={() => setActiveTab('register')}
            style={{
              flex: 1,
              padding: '14px 16px',
              border: 'none',
              background: activeTab === 'register' ? '#FFFFFF' : 'transparent',
              borderBottom: activeTab === 'register' ? '3px solid #00897B' : '3px solid transparent',
              color: activeTab === 'register' ? '#00897B' : '#64748B',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fas fa-user-plus"></i>
            <span>Create Account</span>
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '28px 28px 32px' }}>
          {activeTab === 'login' ? (
            <form id="loginGatewayForm" onSubmit={handleLoginSubmit}>
              {/* Demo Credentials Helper Pill */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '20px'
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#15803D',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-key"></i> Quick Demo Access (1-Click)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('citizen')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      background: '#FFFFFF',
                      border: '1px solid #86EFAC',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#166534',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-user"></i> Citizen (Sanjay)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      background: '#FFFFFF',
                      border: '1px solid #86EFAC',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#166534',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fas fa-shield-alt"></i> Authority Admin
                  </button>
                </div>
              </div>

              {/* Identifier Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label
                  className="form-label"
                  htmlFor="mainLoginIdentifier"
                  style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', marginBottom: '6px', display: 'block' }}
                >
                  CivicFix ID or Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="mainLoginIdentifier"
                    className="form-control"
                    placeholder="e.g. CFU10001, citizen, or admin"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 38px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                  <i
                    className="fas fa-user"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    className="form-label"
                    htmlFor="mainLoginPassword"
                    style={{ fontWeight: 600, fontSize: '13px', color: '#1E293B', margin: 0 }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => showToast('Password Recovery', 'For demo access, use "citizen123" or "admin123".', 'info')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00897B',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="mainLoginPassword"
                    className="form-control"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 38px 12px 38px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                  <i
                    className="fas fa-lock"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0
                    }}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <label className="checkbox-label" style={{ fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#00897B' }} />
                  Keep me signed in on this device
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-login-submit-gateway"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  background: 'linear-gradient(135deg, #00897B 0%, #00695C 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 137, 123, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-sign-in-alt"></i>
                <span>Sign In to CivicFix</span>
              </button>
            </form>
          ) : (
            <form id="registerGatewayForm" onSubmit={handleRegisterSubmit}>
              {/* First & Last Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="regFirstName"
                    style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="regFirstName"
                    className="form-control"
                    placeholder="e.g. Ramesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="regLastName"
                    style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="regLastName"
                    className="form-control"
                    placeholder="e.g. Kumar"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label
                  className="form-label"
                  htmlFor="regEmail"
                  style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="regEmail"
                  className="form-control"
                  placeholder="ramesh.kumar@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Phone & City Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="regPhone"
                    style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="regPhone"
                    className="form-control"
                    placeholder="+91 98401 23456"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="regCity"
                    style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                  >
                    City / Corporation
                  </label>
                  <input
                    type="text"
                    id="regCity"
                    className="form-control"
                    placeholder="e.g. Chennai, Madurai"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label
                  className="form-label"
                  htmlFor="regPassword"
                  style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                >
                  Create Password
                </label>
                <input
                  type="password"
                  id="regPassword"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Role Selection */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label
                  className="form-label"
                  htmlFor="regRoleSelect"
                  style={{ fontWeight: 600, fontSize: '12px', color: '#1E293B', marginBottom: '4px', display: 'block' }}
                >
                  Account Role
                </label>
                <select
                  id="regRoleSelect"
                  className="form-control"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as 'citizen' | 'admin')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="citizen">Citizen (Report & Track Issues)</option>
                  <option value="admin">Municipal / Authority Official</option>
                </select>
              </div>

              {/* Terms Checkbox */}
              <div style={{ marginBottom: '18px' }}>
                <label className="checkbox-label" style={{ fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    style={{ marginRight: '8px', accentColor: '#00897B' }}
                  />
                  I agree to the CivicFix Terms of Service and Public Redressal Guidelines
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-register-submit-gateway"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  background: 'linear-gradient(135deg, #00897B 0%, #00695C 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0, 137, 123, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <i className="fas fa-user-check"></i>
                <span>Create Account & Continue</span>
              </button>
            </form>
          )}
        </div>

        {/* Card Footer Security Badge */}
        <div
          style={{
            background: '#F8FAFC',
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            textAlign: 'center',
            fontSize: '12px',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <i className="fas fa-shield-alt" style={{ color: '#00897B' }}></i>
          <span>Secure Civic Authentication &bull; Government of Tamil Nadu Initiative</span>
        </div>
      </div>

      {/* Bottom Copyright Text */}
      <div
        style={{
          marginTop: '20px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
          zIndex: 10
        }}
      >
        CivicFix &copy; {new Date().getFullYear()} &bull; Citizen Infrastructure & Grievance Portal
      </div>
    </div>
  );
};
