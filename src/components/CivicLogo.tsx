import React from 'react';

export interface CivicLogoProps {
  /** 'emblem' displays the location-pin/city/wrench/map mark; 'full' displays the complete logo with CivicFix text and slogan */
  variant?: 'emblem' | 'full';
  size?: number | string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export const CivicLogo: React.FC<CivicLogoProps> = ({
  variant = 'emblem',
  size = 40,
  className = '',
  alt = 'CivicFix',
  style = {}
}) => {
  const isFull = variant === 'full';
  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const src = isFull ? `${cleanBase}civicfix-logo-transparent.png` : `${cleanBase}civicfix-emblem-transparent.png`;
  const numericSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={src}
      alt={alt}
      className={`civicfix-logo-asset ${className}`}
      style={{
        height: numericSize,
        width: 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        aspectRatio: isFull ? '709 / 891' : '641 / 600',
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        flexShrink: 0,
        ...style
      }}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );
};

// Backwards-compatible export
export const CivicLogoIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 38,
  className = ''
}) => {
  return <CivicLogo size={size} variant="emblem" className={className} />;
};

