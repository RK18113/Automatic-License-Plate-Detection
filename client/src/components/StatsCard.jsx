import React from 'react';

const StatsCard = ({ title, value, icon, color }) => {
  return (
    <div className="stats-card" style={{ '--accent-color': color }}>
      <div className="stats-icon">{icon}</div>
      <div className="stats-content">
        <div className="stats-value">{value}</div>
        <div className="stats-title">{title}</div>
      </div>
    </div>
  );
};

export default StatsCard;
