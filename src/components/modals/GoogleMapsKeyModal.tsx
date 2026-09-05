import React, { useState } from 'react';
import {
  isValidGoogleMapsKey,
  getStoredGoogleMapsKey,
  setStoredGoogleMapsKey,
  clearStoredGoogleMapsKey,
  getKeyStatusInfo
} from '../../utils/maps';

interface GoogleMapsKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
  showToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const GoogleMapsKeyModal: React.FC<GoogleMapsKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
  showToast
}) => {
  const currentStatus = getKeyStatusInfo();
  const [inputValue, setInputValue] = useState(getStoredGoogleMapsKey() || '');
  const [showKey, setShowKey] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setInputError('Please enter an API key or use OpenStreetMap.');
      return;
    }

    if (!isValidGoogleMapsKey(trimmed)) {
      setInputError(
        'Invalid key format. Genuine Google Maps Platform API keys start with "AIza" and are 39 characters long.'
      );
      return;
    }

    setInputError(null);
    setStoredGoogleMapsKey(trimmed);
    showToast(
      'Google Maps Activated',
      'Your Google Maps Platform API key has been saved and loaded.',
      'success'
    );
    onKeyUpdated();
    onClose();
  };

  const handleClearKey = () => {
    clearStoredGoogleMapsKey();
    setInputValue('');
    setInputError(null);
    showToast('Key Cleared', 'Custom API key removed. Using default configuration.', 'info');
    onKeyUpdated();
  };

  return (
    <div
      className="modal-backdrop active"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                fontSize: '18px'
              }}
            >
              <i className="fab fa-google"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Google Maps API Configuration
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Activate high-resolution satellite imagery, dynamic pins, and live traffic
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Current Status Box */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: currentStatus.isValid ? '#F0FDF4' : '#FFFBEB',
              border: currentStatus.isValid ? '1px solid #BBF7D0' : '1px solid #FDE68A',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i
                className={`fas ${currentStatus.isValid ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}
                style={{
                  color: currentStatus.isValid ? '#16A34A' : '#D97706',
                  fontSize: '18px'
                }}
              ></i>
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: currentStatus.isValid ? '#166534' : '#92400E'
                  }}
                >
                  {currentStatus.isValid ? 'Google Maps API Key Active' : 'Key Action Needed'}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: currentStatus.isValid ? '#15803D' : '#B45309'
                  }}
                >
                  {currentStatus.reason || `Active key: ${currentStatus.maskedKey}`}
                </div>
              </div>
            </div>
            {currentStatus.source === 'stored' && (
              <button
                type="button"
                onClick={handleClearKey}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  color: '#EF4444',
                  cursor: 'pointer'
                }}
              >
                Clear Key
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSaveKey}>
            <label
              htmlFor="googleMapsApiKeyInput"
              style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}
            >
              Enter Google Maps Platform API Key
            </label>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                id="googleMapsApiKeyInput"
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setInputError(null);
                }}
                placeholder="AIzaSy..."
                style={{
                  width: '100%',
                  padding: '10px 42px 10px 14px',
                  borderRadius: '8px',
                  border: inputError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer'
                }}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            {inputError && (
              <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>
                <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
                {inputError}
              </div>
            )}

            {/* Quick Demo Key Guidance */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '18px',
                fontSize: '12px',
                color: '#475569'
              }}
            >
              <div style={{ fontWeight: 600, color: '#1E293B', marginBottom: '4px' }}>
                💡 Don't have an API key yet?
              </div>
              <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
                Get an instant, zero-cost <strong>Maps Demo Key</strong> without setting up a billing account or credit card:
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#0A6EBD',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '11px'
                  }}
                >
                  <i className="fas fa-key"></i>
                  Mint Free Maps Demo Key ↗
                </a>
                <a
                  href="https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '11px'
                  }}
                >
                  <i className="fab fa-google"></i>
                  Google Cloud Console ↗
                </a>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                type="submit"
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0A6EBD',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-check"></i>
                Save & Activate Google Maps
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
