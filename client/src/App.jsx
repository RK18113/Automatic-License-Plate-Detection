import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import Header from "./components/Header";
import CameraView from "./components/CameraView";
import ControlPanel from "./components/ControlPanel";
import ResultsPanel from "./components/ResultsPanel";
import StatsCard from "./components/StatsCard";
import Footer from "./components/Footer";
import LoadingOverlay from "./components/LoadingOverlay";
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
  const [darkMode, setDarkMode] = useState(true);
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
      const response = await axios.get("http://localhost:8000/test");
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
        
        // Calculate average confidence
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

  // Handle image load
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  // Clear results
  const clearResults = () => {
    setImageSrc(null);
    setDetections([]);
    setError("");
  };

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      {loading && <LoadingOverlay />}
      
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
        apiStatus={apiStatus}
      />
      
      <div className="main-container">
        <div className="content-grid">
          {/* Left Panel */}
          <div className="left-panel">
            <CameraView
              webcamRef={webcamRef}
              imageSrc={imageSrc}
              imgRef={imgRef}
              detections={detections}
              width={WIDTH}
              height={HEIGHT}
              handleImageLoad={handleImageLoad}
              imgDims={imgDims}
              error={error}
            />
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            <ControlPanel
              onCapture={handleCapture}
              onUpload={handleUpload}
              onClear={clearResults}
              loading={loading}
              hasResults={detections.length > 0}
            />

            {/* Stats Cards */}
            <div className="stats-grid">
              <StatsCard
                title="Total Detections"
                value={totalDetections}
                icon="🎯"
                color="#4CAF50"
              />
              <StatsCard
                title="Avg Confidence"
                value={`${(averageConfidence * 100).toFixed(1)}%`}
                icon="📊"
                color="#2196F3"
              />
              <StatsCard
                title="Processing Time"
                value={`${processingTime}ms`}
                icon="⚡"
                color="#FF9800"
              />
            </div>

            <ResultsPanel
              detections={detections}
              processingTime={processingTime}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default App;
