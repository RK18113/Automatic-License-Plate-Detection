import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import "./index.css";

const WIDTH = 800;
const HEIGHT = 600;

function App() {
  const webcamRef = useRef(null);
  const imgRef = useRef(null);
  
  // States
  const [imageSrc, setImageSrc] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const [displayDims, setDisplayDims] = useState({ width: 0, height: 0 });
  const [activeView, setActiveView] = useState('camera');
  const [totalDetections, setTotalDetections] = useState(0);
  const [averageConfidence, setAverageConfidence] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [apiStatus, setApiStatus] = useState('checking');

  // Check API status on mount
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await axios.get("https://automatic-license-plate-detection.onrender.com");
      setApiStatus(response.data.ready ? 'online' : 'offline');
    } catch (err) {
      setApiStatus('offline');
    }
  };

  // Convert base64 image to File object
  const dataURLToFile = (dataurl, filename) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Handle webcam capture
  const handleCapture = async () => {
    if (!webcamRef.current) return;
    const capturedImage = webcamRef.current.getScreenshot();
    if (!capturedImage) return;

    await processImage(dataURLToFile(capturedImage, "capture.jpg"), capturedImage);
  };

  // Handle file upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const imageUrl = URL.createObjectURL(file);
    await processImage(file, imageUrl);
  };

  // Process image function
  const processImage = async (file, imageUrl) => {
    setLoading(true);
    setError("");
    setDetections([]);
    setImageSrc(imageUrl);
    setActiveView('results');
    
    const startTime = Date.now();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/detect/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const endTime = Date.now();
      setProcessingTime(endTime - startTime);

      if (response.data.error) {
        setError(response.data.error);
        setDetections([]);
      } else if (response.data.results) {
        const results = response.data.results;
        setDetections(results);
        setTotalDetections(prev => prev + results.length);
        
        const avgConf = results.reduce((sum, det) => sum + det.yolo_confidence, 0) / results.length;
        setAverageConfidence(avgConf);
      } else {
        setDetections([]);
      }
    } catch (err) {
      setError("Detection failed: " + err.message);
      setDetections([]);
    }
    setLoading(false);
  };

  // Handle image load - FIXED
  const handleImageLoad = () => {
    if (imgRef.current) {
      const img = imgRef.current;
      setImgDims({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setDisplayDims({
        width: img.clientWidth,
        height: img.clientHeight,
      });
    }
  };

  // Get scaled boxes for detection overlay - FIXED
  const getScaledBoxes = (box) => {
    if (imgDims.width === 0 || imgDims.height === 0 || displayDims.width === 0 || displayDims.height === 0) {
      return box;
    }
    
    // Scale from original image size to display size
    const scaleX = displayDims.width / imgDims.width;
    const scaleY = displayDims.height / imgDims.height;
    
    const [x1, y1, x2, y2] = box;
    
    return [
      x1 * scaleX,
      y1 * scaleY,
      x2 * scaleX,
      y2 * scaleY
    ];
  };

  return (
    <div className="app">
      {/* Top Navigation */}
      <nav className="nav">
        <div className="nav-left">
          <div className="logo">PlateVision</div>
          <div className="nav-tabs">
            <button 
              className={activeView === 'camera' ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setActiveView('camera')}
            >
              Detection
            </button>
            <button 
              className={activeView === 'results' ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setActiveView('results')}
            >
              Results
            </button>
          </div>
        </div>
        <div className="nav-right">
          <div className={`status-indicator ${apiStatus}`}>
            <div className="status-dot"></div>
            <span>{apiStatus === 'online' ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          
          {/* Camera View */}
          {activeView === 'camera' && (
            <div className="view-container">
              <div className="main-panel">
                <div className="panel-header">
                  <h2>License Plate Detection</h2>
                  <p>Capture or upload an image to detect license plates</p>
                </div>
                
                <div className="camera-section">
                  <div className="camera-container">
                    {!imageSrc ? (
                      <div className="webcam-wrapper">
                        <Webcam
                          audio={false}
                          height={HEIGHT}
                          width={WIDTH}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          videoConstraints={{ width: WIDTH, height: HEIGHT }}
                          className="webcam"
                        />
                      </div>
                    ) : (
                      <div className="image-container">
                        <img
                          src={imageSrc}
                          alt="Captured"
                          ref={imgRef}
                          onLoad={handleImageLoad}
                          className="captured-image"
                        />
                        <svg 
                          className="detection-overlay" 
                          width={displayDims.width} 
                          height={displayDims.height}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                          }}
                        >
                          {detections.map((det, idx) => {
                            const [x1, y1, x2, y2] = getScaledBoxes(det.box);
                            const confidence = det.yolo_confidence;
                            const color = confidence > 0.8 ? "#000" : confidence > 0.5 ? "#333" : "#666";
                            
                            return (
                              <g key={idx}>
                                <rect
                                  x={x1}
                                  y={y1}
                                  width={x2 - x1}
                                  height={y2 - y1}
                                  fill="none"
                                  stroke={color}
                                  strokeWidth="2"
                                  rx="2"
                                />
                                <rect
                                  x={x1}
                                  y={y1 - 25}
                                  width={Math.max(det.text.length * 7, 60)}
                                  height="20"
                                  fill={color}
                                  rx="2"
                                />
                                <text
                                  x={x1 + 4}
                                  y={y1 - 10}
                                  fill="white"
                                  fontSize="11"
                                  fontWeight="600"
                                  fontFamily="monospace"
                                >
                                  {det.text}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="controls">
                    <button 
                      className="btn btn-primary"
                      onClick={handleCapture}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Capture'}
                    </button>
                    
                    <label className="btn btn-secondary">
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={loading}
                        style={{ display: 'none' }}
                      />
                    </label>
                    
                    {imageSrc && (
                      <button 
                        className="btn btn-outline"
                        onClick={() => {
                          setImageSrc(null);
                          setDetections([]);
                          setError('');
                          setActiveView('camera');
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Side Stats */}
              <div className="side-panel">
                <div className="stats-card">
                  <div className="stat">
                    <div className="stat-value">{totalDetections}</div>
                    <div className="stat-label">Total Detections</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{(averageConfidence * 100).toFixed(1)}%</div>
                    <div className="stat-label">Average Confidence</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{processingTime}ms</div>
                    <div className="stat-label">Processing Time</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results View */}
          {activeView === 'results' && (
            <div className="view-container">
              <div className="results-panel">
                <div className="panel-header">
                  <h2>Detection Results</h2>
                  <p>{detections.length} license plate{detections.length !== 1 ? 's' : ''} detected</p>
                </div>
                
                {detections.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-content">
                      <h3>No detections yet</h3>
                      <p>Switch to Detection tab to capture or upload an image</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setActiveView('camera')}
                      >
                        Start Detection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="results-grid">
                    {detections.map((det, idx) => (
                      <div key={idx} className="result-card">
                        <div className="result-header">
                          <div className="plate-number">{det.text}</div>
                          <div className={`confidence-badge ${
                            det.yolo_confidence > 0.8 ? 'high' : 
                            det.yolo_confidence > 0.5 ? 'medium' : 'low'
                          }`}>
                            {(det.yolo_confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="result-details">
                          <div className="detail">
                            <span className="detail-label">YOLO Confidence</span>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ 
                                  width: `${det.yolo_confidence * 100}%`
                                }}
                              ></div>
                            </div>
                            <span className="detail-value">{(det.yolo_confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="detail">
                            <span className="detail-label">OCR Confidence</span>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ 
                                  width: `${det.ocr_confidence * 100}%`
                                }}
                              ></div>
                            </div>
                            <span className="detail-value">{(det.ocr_confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {error && (
                  <div className="error-message">
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Processing Image</h3>
            <p>Detecting license plates...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
