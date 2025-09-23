import React from 'react';

const ControlPanel = ({ onCapture, onUpload, onClear, loading, hasResults }) => {
  return (
    <div className="control-panel">
      <h3>Controls</h3>
      
      <div className="button-group">
        <button
          onClick={onCapture}
          disabled={loading}
          className="btn btn-primary"
        >
          <span className="btn-icon">📷</span>
          {loading ? 'Processing...' : 'Capture Photo'}
        </button>

        <label className="btn btn-secondary">
          <span className="btn-icon">📁</span>
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={onUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </label>

        {hasResults && (
          <button
            onClick={onClear}
            className="btn btn-outline"
          >
            <span className="btn-icon">🗑️</span>
            Clear Results
          </button>
        )}
      </div>

      <div className="tips">
        <h4>💡 Tips for Better Results</h4>
        <ul>
          <li>Ensure good lighting conditions</li>
          <li>Position the license plate clearly in frame</li>
          <li>Avoid blur and reflections</li>
          <li>Use high resolution images when uploading</li>
        </ul>
      </div>
    </div>
  );
};

export default ControlPanel;
