import React from 'react';

const LoadingOverlay = () => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <h3>Processing Image...</h3>
        <p>Analyzing license plates with AI</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
