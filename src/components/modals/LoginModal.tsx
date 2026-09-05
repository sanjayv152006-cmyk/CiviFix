import React, { useState } from 'react';
import { AuthSession } from '../../types';
import { CivicLogo } from '../CivicLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
  onSwitchToRegister: () => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSwitchToRegister,
  showToast
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showToast('Error', 'Please enter all fields', 'error');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('civicfix_users') || '[]');
    const user = storedUsers.find(
      (u: any) => u.id === identifier.trim() || u.email.toLowerCase() === identifier.trim().toLowerCase()
    );

    // Also support default demo credentials:
    // admin / admin123 or user / user123 or registered user
    if (user && user.password === password) {
      const sessionUser: AuthSession = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      };
      onLoginSuccess(sessionUser);
      onClose();
      showToast('Success', `Welcome back, ${user.fullName}!`, 'success');
      return;
    }

    // Default admin shortcut
    if (identifier.toLowerCase() === 'admin' && password === 'admin123') {
      const sessionUser: AuthSession = {
        id: 'CFA0001',
        fullName: 'Officer Kumar',
        email: 'officer.k@civicfix.gov',
        role: 'admin'
      };
      onLoginSuccess(sessionUser);
      onClose();
      showToast('Success', 'Admin logged in successfully.', 'success');
      return;
    }

    // Default citizen shortcut
    if (identifier.toLowerCase() === 'citizen' && password === 'citizen123') {
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
      onClose();
      showToast('Success', 'Citizen logged in successfully.', 'success');
      return;
    }

    showToast('Login Failed', 'Invalid CivicFix ID/email or password.', 'error');
  };

  return (
    <div className="modal-overlay active" id="loginModal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          id="btn-close-login"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="modal-header">
          <div className="modal-logo" title="CivicFix">
            <CivicLogo size={52} variant="emblem" />
          </div>
          <h2>Welcome back</h2>
          <p>Login to your CivicFix account</p>
        </div>
        <form className="modal-form" id="loginForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="loginIdentifier">
              CivicFix ID or Email
            </label>
            <input
              type="text"
              id="loginIdentifier"
              className="form-control"
              placeholder="CFU10001 or you@example.com (or 'admin')"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="loginPassword">
              Password
            </label>
            <input
              type="password"
              id="loginPassword"
              className="form-control"
              placeholder="•••••••• (or 'admin123')"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-row-flex">
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked /> Remember me
            </label>
            <button
              type="button"
              className="link-text"
              onClick={() => showToast('Info', 'Password reset instructions sent to your email.', 'info')}
            >
              Forgot password?
            </button>
          </div>
          <button type="submit" id="btn-submit-login" className="btn btn-primary btn-block btn-lg">
            Login
          </button>
          <p className="modal-foot">
            Don't have an account?{' '}
            <button
              type="button"
              className="link-text"
              onClick={() => {
                onClose();
                onSwitchToRegister();
              }}
            >
              Register
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
