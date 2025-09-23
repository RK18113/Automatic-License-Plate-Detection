import React from 'react';
import Webcam from 'react-webcam';

const CameraView = ({ 
  webcamRef, 
  imageSrc, 
  imgRef, 
  detections, 
  width, 
  height, 
  handleImageLoad, 
  imgDims,
  error 
}) => {
  const getScaledBoxes = (box) => {
    if (imgDims.width === 0 || imgDims.height === 0) return box;
    const scaleX = width / imgDims.width;
    const scaleY = height / imgDims.height;
    const [x1, y1, x2, y2] = box;
    return [x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY];
  };

  return (
    <div className="camera-view">
      <div className="camera-container">
        {!imageSrc ? (
          <div className="webcam-wrapper">
            <Webcam
              audio={false}
              height={height}
              width={width}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ width, height }}
              className="webcam"
            />
            <div className="webcam-overlay">
              <div className="scan-line"></div>
              <div className="corner corner-tl"></div>
              <div className="corner corner-tr"></div>
              <div className="corner corner-bl"></div>
              <div className="corner corner-br"></div>
            </div>
          </div>
        ) : (
          <div className="image-wrapper">
            <img
              src={imageSrc}
              alt="Captured"
              ref={imgRef}
              onLoad={handleImageLoad}
              className="captured-image"
              style={{ width, height }}
            />
            <svg
              width={width}
              height={height}
              className="detection-overlay"
            >
              {detections.map((det, idx) => {
                const [x1, y1, x2, y2] = getScaledBoxes(det.box);
                const confidence = det.yolo_confidence;
                const color = confidence > 0.8 ? '#4CAF50' : confidence > 0.5 ? '#FF9800' : '#f44336';

                return (
                  <g key={idx}>
                    <rect
                      x={x1}
                      y={y1}
                      width={x2 - x1}
                      height={y2 - y1}
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      rx="4"
                      className="detection-box"
                    />
                    <rect
                      x={x1}
                      y={y1 - 30}
                      width={Math.max(det.text.length * 10, 100)}
                      height="25"
                      fill={color}
                      rx="3"
                      fillOpacity="0.8"
                    />
                    <text
                      x={x1 + 5}
                      y={y1 - 10}
                      fill="white"
                      fontWeight="bold"
                      fontSize="14"
                      fontFamily="Arial, sans-serif"
                    >
                      {det.text} ({(confidence * 100).toFixed(0)}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        
        {error && (
          <div className="error-overlay">
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;
