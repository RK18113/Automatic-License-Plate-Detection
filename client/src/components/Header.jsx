import React from 'react';

const Header = ({ darkMode, setDarkMode, apiStatus }) => {
  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online': return '#4CAF50';
      case 'offline': return '#f44336';
      default: return '#ff9800';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'online': return 'API Online';
      case 'offline': return 'API Offline';
      default: return 'Checking...';
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          <div className="logo">🚗</div>
          <div className="title">
            <h1>LicensePlate AI</h1>
            <p>Advanced License Plate Recognition System</p>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="api-status" style={{ color: getStatusColor() }}>
            <span className="status-dot" style={{ backgroundColor: getStatusColor() }}></span>
            {getStatusText()}
          </div>
          
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
