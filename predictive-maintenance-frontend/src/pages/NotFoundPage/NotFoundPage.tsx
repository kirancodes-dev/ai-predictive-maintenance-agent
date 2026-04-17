import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '4rem' }}>
    <div style={{ fontSize: '4rem' }}>404</div>
    <p style={{ color: '#888' }}>Page not found.</p>
    <Link to="/" style={{ color: '#3b82f6' }}>← Back to Dashboard</Link>
  </div>
);

export default NotFoundPage;
