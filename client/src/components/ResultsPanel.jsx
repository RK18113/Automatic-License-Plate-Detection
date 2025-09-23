import React, { useState } from 'react';

const ResultsPanel = ({ detections, processingTime }) => {
  const [expandedCard, setExpandedCard] = useState(null);

  if (detections.length === 0) {
    return (
      <div className="results-panel empty">
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Detections Yet</h3>
          <p>Capture or upload an image to start detecting license plates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <div className="results-header">
        <h3>Detection Results</h3>
        <div className="results-meta">
          <span>{detections.length} plate{detections.length !== 1 ? 's' : ''} found</span>
          <span>•</span>
          <span>{processingTime}ms</span>
        </div>
      </div>

      <div className="results-list">
        {detections.map((det, idx) => (
          <div
            key={idx}
            className={`detection-card ${expandedCard === idx ? 'expanded' : ''}`}
            onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
          >
            <div className="card-header">
              <div className="plate-text">
                <span className="plate-icon">🏷️</span>
                <strong>{det.text}</strong>
              </div>
              <div className="confidence-badge">
                {(det.yolo_confidence * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="card-details">
              <div className="detail-row">
                <span className="label">YOLO Confidence:</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ 
                      width: `${det.yolo_confidence * 100}%`,
                      backgroundColor: det.yolo_confidence > 0.8 ? '#4CAF50' : 
                                     det.yolo_confidence > 0.5 ? '#FF9800' : '#f44336'
                    }}
                  ></div>
                  <span>{(det.yolo_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="detail-row">
                <span className="label">OCR Confidence:</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill"
                    style={{ 
                      width: `${det.ocr_confidence * 100}%`,
                      backgroundColor: det.ocr_confidence > 0.8 ? '#4CAF50' : 
                                     det.ocr_confidence > 0.5 ? '#FF9800' : '#f44336'
                    }}
                  ></div>
                  <span>{(det.ocr_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              {expandedCard === idx && (
                <div className="extended-details">
                  <div className="detail-row">
                    <span className="label">Bounding Box:</span>
                    <span>[{det.box.join(', ')}]</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Detection Quality:</span>
                    <span className={`quality-badge ${
                      det.yolo_confidence > 0.8 ? 'high' : 
                      det.yolo_confidence > 0.5 ? 'medium' : 'low'
                    }`}>
                      {det.yolo_confidence > 0.8 ? 'High' : 
                       det.yolo_confidence > 0.5 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsPanel;
