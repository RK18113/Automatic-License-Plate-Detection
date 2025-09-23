import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>LicensePlate AI</h4>
          <p>Advanced license plate recognition powered by YOLO and PaddleOCR</p>
        </div>
        <div className="footer-section">
          <h4>Technology Stack</h4>
          <ul>
            <li>YOLOv8 for Detection</li>
            <li>PaddleOCR for Text Recognition</li>
            <li>React for Frontend</li>
            <li>FastAPI for Backend</li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Features</h4>
          <ul>
            <li>Real-time Detection</li>
            <li>High Accuracy OCR</li>
            <li>Batch Processing</li>
            <li>Performance Analytics</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2025 LicensePlate AI. Built with ❤️ for computer vision.</p>
      </div>
    </footer>
  );
};

export default Footer;
