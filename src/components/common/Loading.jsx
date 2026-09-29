import React from 'react';
import './Loading.css';

export function Loading({ text = 'Loading details...', fullScreen = false, size = 'md' }) {
  const content = (
    <div className={`loading-container loading-${size}`}>
      <div className="loading-spinner animate-spin" />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return content;
}

export function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', className = '' }) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}
