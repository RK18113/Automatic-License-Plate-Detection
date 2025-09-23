import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const WIDTH = 640;
const HEIGHT = 480;

const fadeInStyle = {
  animation: "fadein 0.5s",
};

function App() {
  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const imgRef = useRef(null);
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });

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

  // Handle detection on webcam capture
  const handleDetect = async () => {
    if (!webcamRef.current) return;
    const capturedImage = webcamRef.current.getScreenshot();
    if (!capturedImage) return;

    setLoading(true);
    setError("");
    setDetections([]);
    setImageSrc(capturedImage);

    const file = dataURLToFile(capturedImage, "capture.jpg");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/detect", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.error) {
        setError(response.data.error);
        setDetections([]);
      } else if (response.data.results) {
        setDetections(response.data.results);
      } else {
        setDetections([]);
      }
    } catch (err) {
      setError("Detection failed: " + err.message);
      setDetections([]);
    }
    setLoading(false);
  };

  // Handle image upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setDetections([]);
    setImageSrc(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/detect", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.error) {
        setError(response.data.error);
        setDetections([]);
      } else if (response.data.results) {
        setDetections(response.data.results);
      } else {
        setDetections([]);
      }
    } catch (err) {
      setError("Detection failed: " + err.message);
      setDetections([]);
    }
    setLoading(false);
  };

  // Record image natural dimensions on load (used for scaling boxes)
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  // Calculate scale factors for bounding box coordinates
  const getScaledBoxes = (box) => {
    if (imgDims.width === 0 || imgDims.height === 0) return box;

    const scaleX = WIDTH / imgDims.width;
    const scaleY = HEIGHT / imgDims.height;

    const [x1, y1, x2, y2] = box;

    return [x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY];
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: 20,
        background: "linear-gradient(120deg, #232526 0%, #414345 100%)",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <Webcam
        audio={false}
        height={HEIGHT}
        width={WIDTH}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ width: WIDTH, height: HEIGHT }}
        style={{ borderRadius: 12 }}
      />
      <div style={{ marginTop: 10 }}>
        <button
          onClick={handleDetect}
          disabled={loading}
          style={{
            padding: "12px 24px",
            backgroundColor: loading ? "#888" : "#ffd600",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: 16,
            color: "#232526",
          }}
        >
          {loading ? "Detecting..." : "Detect"}
        </button>
        <label
          style={{
            padding: "12px 24px",
            backgroundColor: "#31343a",
            color: "#ffd600",
            borderRadius: 8,
            marginLeft: 20,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={loading}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 20,
          display: imageSrc ? "inline-block" : "none",
          borderRadius: 12,
          boxShadow: "0 0 20px rgba(0,0,0,0.6)",
        }}
      >
        {imageSrc && (
          <>
            <img
              src={imageSrc}
              alt="Captured"
              ref={imgRef}
              onLoad={handleImageLoad}
              style={{ width: WIDTH, borderRadius: 12, height: HEIGHT }}
            />
            <svg
              width={WIDTH}
              height={HEIGHT}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              {detections.map((det, idx) => {
                const [x1, y1, x2, y2] = getScaledBoxes(det.box);

                return (
                  <g key={idx}>
                    <rect
                      x={x1}
                      y={y1}
                      width={x2 - x1}
                      height={y2 - y1}
                      fill="none"
                      stroke="#00FF00"
                      strokeWidth={3}
                      rx={8}
                    />
                    <text
                      x={x1 + 5}
                      y={y1 - 5}
                      fill="#00FF00"
                      fontWeight="bold"
                      fontSize="18"
                      stroke="#000"
                      strokeWidth="0.7"
                    >
                      {det.text}
                    </text>
                  </g>
                );
              })}
            </svg>
          </>
        )}
      </div>

      {detections.length > 0 && (
        <div
          style={{
            marginTop: 20,
            maxWidth: WIDTH,
            marginLeft: "auto",
            marginRight: "auto",
            textAlign: "left",
            color: "#ffd600",
          }}
        >
          <h3>Detection Results</h3>
          {detections.map((det, idx) => (
            <div
              key={idx}
              style={{
                padding: 10,
                borderBottom: "1px solid #444",
                fontSize: 16,
                wordBreak: "break-word",
              }}
            >
              <strong>Text:</strong> {det.text} <br />
              <strong>Box:</strong> [{det.box.join(", ")}] <br />
              <strong>YOLO Confidence:</strong> {(det.yolo_confidence*100).toFixed(1)}%{" "}
              <br />
              <strong>OCR Confidence:</strong> {(det.ocr_confidence*100).toFixed(1)}%
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
