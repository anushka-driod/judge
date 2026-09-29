import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Scale, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: 'var(--space-8)',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'var(--accent-100)',
        color: 'var(--accent-700)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'var(--space-4)',
      }}>
        <Scale size={32} />
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: 'var(--space-6)' }}>
        The legal screen or case record you are attempting to visit does not exist or has been moved.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" icon={ArrowLeft}>
          Return to Safe Dashboard
        </Button>
      </Link>
    </div>
  );
}
