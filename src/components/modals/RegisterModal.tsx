import React, { useState } from 'react';
import { AuthSession } from '../../types';
import { CivicLogo } from '../CivicLogo';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (session: AuthSession) => void;
  onSwitchToLogin: () => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onRegisterSuccess,
  onSwitchToLogin,
  showToast
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Chennai');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'admin'>('citizen');
  const [agree, setAgree] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      showToast('Error', 'Please fill all required fields', 'error');
      return;
    }

    if (!agree) {
      showToast('Warning', 'Please agree to the Terms of Service to continue.', 'warning');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('civicfix_users') || '[]');
    if (storedUsers.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      showToast('Error', 'Email already registered. Please login.', 'error');
      return;
    }

    const lastIdNum = storedUsers.length > 0
      ? parseInt(storedUsers[storedUsers.length - 1].id?.replace('CFU', '') || '10001')
      : 10001;
    const newUserId = `CFU${lastIdNum + 1}`;

    const newUser = {
      id: newUserId,
      fullName: `${firstName} ${lastName}`,
      email: email.trim(),
      phone: phone.trim() || '+91 98401 23456',
      city: city.trim() || 'Tamil Nadu',
      ward: `${city.trim()} Zone`,
      password: password,
      role: role,
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

    onRegisterSuccess(session);
    onClose();
    showToast(
      'Account created successfully',
      `Your CivicFix ID: ${newUserId}. You are now logged in!`,
      'success',
      6000
    );
  };

  return (
    <div className="modal-overlay active" id="registerModal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="modal-close"
          id="btn-close-register"
          onClick={onClose}
        >
          <i className="fas fa-times"></i>
        </button>
        <div className="modal-header">
          <div className="modal-logo" title="CivicFix">
            <CivicLogo size={52} variant="emblem" />
          </div>
          <h2>Create account</h2>
          <p>Join CivicFix and start making a difference</p>
        </div>
        <form className="modal-form" id="registerForm" onSubmit={handleSubmit}>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="registerFirstName">
                First Name
              </label>
              <input
                type="text"
                id="registerFirstName"
                className="form-control"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="registerLastName">
                Last Name
              </label>
              <input
                type="text"
                id="registerLastName"
                className="form-control"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="registerEmail">
              Email
            </label>
            <input
              type="email"
              id="registerEmail"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="registerPhone">
                Phone Number
              </label>
              <input
                type="tel"
                id="registerPhone"
                className="form-control"
                placeholder="+91 98401 23456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="registerCity">
                City / District
              </label>
              <input
                type="text"
                id="registerCity"
                className="form-control"
                placeholder="e.g. Chennai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="registerPassword">
              Password
            </label>
            <input
              type="password"
              id="registerPassword"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="registerRole">
              Account Type
            </label>
            <select
              className="form-control"
              id="registerRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'citizen' | 'admin')}
            >
              <option value="citizen">Citizen</option>
              <option value="admin">Authority Official</option>
            </select>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              required
            />{' '}
            I agree to the Terms of Service and Privacy Policy
          </label>
          <button type="submit" id="btn-submit-register" className="btn btn-primary btn-block btn-lg">
            Create Account
          </button>
          <p className="modal-foot">
            Already have an account?{' '}
            <button
              type="button"
              className="link-text"
              onClick={() => {
                onClose();
                onSwitchToLogin();
              }}
            >
              Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
