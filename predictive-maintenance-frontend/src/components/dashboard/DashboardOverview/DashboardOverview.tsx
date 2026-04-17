import React from 'react';
import './DashboardOverview.css';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  trend?: { value: number; direction: 'up' | 'down' };
}

interface DashboardOverviewProps {
  stats: StatCard[];
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats }) => {
  return (
    <div className="dashboard-overview">
      {stats.map((stat, idx) => (
        <div key={idx} className="dashboard-overview__card">
          <div className="dashboard-overview__icon">{stat.icon}</div>
          <div className="dashboard-overview__content">
            <span className="dashboard-overview__label">{stat.label}</span>
            <span className="dashboard-overview__value">{stat.value}</span>
            {stat.trend && (
              <span
                className={`dashboard-overview__trend dashboard-overview__trend--${stat.trend.direction}`}
              >
                {stat.trend.direction === 'up' ? '↑' : '↓'} {Math.abs(stat.trend.value)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardOverview;
