import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/** A single shimmer placeholder block */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  className = '',
  style,
}) => (
  <div
    className={`skeleton ${className}`}
    style={{ width, height, borderRadius, flexShrink: 0, ...style }}
  />
);

/** Pre-built: machine overview card skeleton (matches the 4-machine strip in InsightsPage) */
export const MachineCardSkeleton: React.FC = () => (
  <div style={{
    borderRadius: 14,
    border: '1.5px solid #e2e8f0',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 180,
    flex: 1,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Skeleton width={90} height={12} />
      <Skeleton width={48} height={20} borderRadius={20} />
    </div>
    <Skeleton width={120} height={10} />
    <Skeleton width="100%" height={6} borderRadius={4} />
    <Skeleton width={80} height={10} />
  </div>
);

/** Pre-built: analysis panel skeleton (phase + ROI row) */
export const AnalysisPanelSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {/* Row 1: Phase + ROI */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton width={140} height={11} />
        <Skeleton width={200} height={22} />
        <Skeleton width="100%" height={8} borderRadius={4} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width="60%" height={10} />
              <Skeleton width="80%" height={18} />
              <Skeleton width="70%" height={9} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton width={100} height={11} />
        <Skeleton width="100%" height={64} borderRadius={10} />
        {[0,1,2].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Skeleton width={120} height={11} />
              <Skeleton width={90} height={9} />
            </div>
            <Skeleton width={60} height={13} />
          </div>
        ))}
      </div>
    </div>

    {/* Risk Calendar banner */}
    <div style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width={80} height={10} />
        <Skeleton width={260} height={15} />
        <Skeleton width={320} height={12} />
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[0,1].map(i => (
          <div key={i} style={{ borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '10px 16px', width: 150, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="60%" height={9} />
            <Skeleton width="80%" height={13} />
            <Skeleton width="90%" height={9} />
          </div>
        ))}
      </div>
    </div>

    {/* Row 2: Correlation + Maintenance Windows */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
      {[0,1].map(i => (
        <div key={i} style={{ borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton width={140} height={11} />
          <Skeleton width={200} height={10} />
          {[0,1,2,3].map(j => (
            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width={80} height={10} />
              {[0,1,2,3].map(k => <Skeleton key={k} width={52} height={28} borderRadius={6} />)}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Pre-built: dashboard machine card skeleton */
export const DashboardCardSkeleton: React.FC = () => (
  <div style={{
    borderRadius: 14,
    border: '1.5px solid #e2e8f0',
    padding: '20px 22px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: '#fff',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Skeleton width={110} height={14} />
      <Skeleton width={60} height={22} borderRadius={20} />
    </div>
    <Skeleton width={160} height={11} />
    <Skeleton width="100%" height={8} borderRadius={4} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Skeleton width="60%" height={9} />
          <Skeleton width="80%" height={16} />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
