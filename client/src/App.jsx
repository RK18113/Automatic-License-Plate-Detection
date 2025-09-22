import React, { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const fadeIn = {
  animation: "fadein 0.5s",
};

const displayWidth = 640;
const displayHeight = 480;

function App() {
  // State for boxes and uploaded image
  const webcamRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const [uploadedBase64, setUploadedBase64] = useState(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const imgRef = useRef();

  // Convert file to base64
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  // Handle webcam "Detect" button
  const handleDetect = async () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;
      try {
        const response = await axios.post("http://localhost:8000/detect/", {
          image: imageSrc,
        });
        setDetections(response.data.results || []);
        setUploadedBase64(null); // Hide upload preview after camera detect
        setImgDims({ w: displayWidth, h: displayHeight }); // Match webcam screenshot
      } catch (err) {
        setDetections([]);
      }
    }
  };

  // Handle upload
  const onImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setUploadedBase64(base64);
    setDetections([]);
  };

  // Send uploaded image for detection
  React.useEffect(() => {
    const detectUpload = async () => {
      if (uploadedBase64) {
        try {
          const response = await axios.post("http://localhost:8000/detect/", {
            image: uploadedBase64,
          });
          setDetections(response.data.results || []);
        } catch (err) {
          setDetections([]);
        }
      }
    };
    detectUpload();
    // eslint-disable-next-line
  }, [uploadedBase64]);

  // Update real dimensions for uploaded image
  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      });
    }
  };

  // Helper to scale detection box for resized images (webcam: always displayWidth/displayHeight, upload: scale if needed)
  const scaledCoords = (box) => {
    const sx = displayWidth / imgDims.w;
    const sy = displayHeight / imgDims.h;
    return [box[0] * sx, box[1] * sy, box[2] * sx, box[3] * sy];
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(120deg, #232526 0%, #414345 100%)",
      }}
    >
      {/* Webcam feed */}
      <div
        style={{
          position: "relative",
          width: displayWidth,
          height: displayHeight,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          marginBottom: 20,
        }}
      >
        <Webcam
          audio={false}
          height={displayHeight}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={displayWidth}
          style={{ display: "block", width: "100%", height: "100%" }}
        />
        {/* Webcam overlay: always at fixed size */}
        {!uploadedBase64 && detections.length > 0 && (
          <svg
            width={displayWidth}
            height={displayHeight}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none",
              width: "100%",
              height: "100%",
            }}
          >
            {detections.map((det, idx) => (
              <g key={idx}>
                <rect
                  x={det.box[0]}
                  y={det.box[1]}
                  width={det.box[2] - det.box[0]}
                  height={det.box[3] - det.box[1]}
                  fill="none"
                  stroke="rgba(255,80,80,0.9)"
                  strokeWidth={3}
                  rx={8}
                  style={fadeIn}
                />
                <text
                  x={det.box[0] + 8}
                  y={det.box[1] - 10}
                  fill="white"
                  fontSize="20"
                  fontWeight="bold"
                  style={{ textShadow: "0 0 8px #000" }}
                >
                  {det.text}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
      {/* Button */}
      <button
        onClick={handleDetect}
        style={{
          padding: "10px 28px",
          marginBottom: 16,
          borderRadius: 8,
          background: "#ffd600",
          color: "#232526",
          fontWeight: 700,
          fontSize: 18,
          boxShadow: "0 2px 8px #0002",
          border: "none",
          cursor: "pointer",
          outline: "none",
        }}
      >
        Detect (from Camera)
      </button>
      {/* Upload Image Button */}
      <label
        style={{
          background: "#31343a",
          color: "#ffd600",
          padding: "10px 24px",
          borderRadius: 8,
          boxShadow: "0 2px 8px #0004",
          marginBottom: 26,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Upload Image
        <input
          type="file"
          accept="image/*"
          onChange={onImageChange}
          style={{ display: "none" }}
        />
      </label>
      {/* Uploaded image preview (true size) with overlay */}
      {uploadedBase64 && (
        <div
          style={{
            position: "relative",
            display: "inline-block",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            background: "#191a1d",
          }}
        >
          <img
            src={uploadedBase64}
            alt="Uploaded"
            ref={imgRef}
            onLoad={handleImageLoad}
            style={{ display: "block", borderRadius: 16 }}
          />
          {/* Overlay for true pixel dimensions, only if box & imgDims known */}
          {imgDims.w > 0 && imgDims.h > 0 && detections.length > 0 && (
            <svg
              width={imgDims.w}
              height={imgDims.h}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
              }}
            >
              {detections.map((det, idx) => (
                <g key={idx}>
                  <rect
                    x={det.box[0]}
                    y={det.box[1]}
                    width={det.box[2] - det.box[0]}
                    height={det.box[3] - det.box[1]}
                    fill="none"
                    stroke="rgba(255,80,80,0.9)"
                    strokeWidth={3}
                    rx={8}
                  />
                  <text
                    x={det.box[0] + 8}
                    y={det.box[1] - 10}
                    fill="white"
                    fontSize="20"
                    fontWeight="bold"
                    style={{ textShadow: "0 0 8px #000" }}
                  >
                    {det.text}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      )}
      {/* Detection Results */}
      <div
        style={{
          marginTop: 10,
          width: 400,
          maxWidth: "90%",
          display: detections.length ? "block" : "none",
        }}
      >
        {detections.map((det, idx) => (
          <div
            key={idx}
            style={{
              background: "rgba(34,44,54,0.95)",
              borderRadius: 12,
              color: "#eee",
              marginBottom: 18,
              boxShadow: "0 2px 12px #0007",
              padding: "18px 32px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: "#ffd600",
                letterSpacing: 1.2,
              }}
            >
              {det.text}
            </div>
            <div style={{ marginTop: 6, fontSize: 15 }}>
              Bounding Box: [{det.box.join(", ")}]
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes fadein { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default App;
