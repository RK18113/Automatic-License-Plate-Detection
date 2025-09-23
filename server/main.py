from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from ultralytics import YOLO
import re
import os

# Initialize YOLO
yolo_model = YOLO("./best.pt")

# Initialize PaddleOCR
ocr = None
ocr_status = "Not initialized"

try:
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(lang='en')
    ocr_status = "PaddleOCR ready"
    print("✅ PaddleOCR loaded successfully")
except Exception as e:
    print(f"❌ PaddleOCR failed: {e}")
    ocr_status = f"Failed: {str(e)}"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def enhance_plate(image):
    """Enhance license plate for OCR"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

def clean_text(text):
    """Clean OCR output"""
    if not text:
        return ""
    cleaned = re.sub(r'[^\w\s]', '', str(text)).upper()
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned if len(cleaned) >= 2 else ""

def parse_paddleocr_result(ocr_results):
    """Parse the new PaddleOCR result format"""
    texts = []
    
    if not ocr_results or len(ocr_results) == 0:
        return texts
    
    result = ocr_results[0]
    
    # Check if it's the new format with rec_texts
    if isinstance(result, dict):
        # New format - extract from rec_texts
        if 'rec_texts' in result:
            rec_texts = result.get('rec_texts', [])
            rec_scores = result.get('rec_scores', [])
            
            for i, text in enumerate(rec_texts):
                if text and text.strip():
                    confidence = rec_scores[i] if i < len(rec_scores) else 0.5
                    texts.append((text, confidence))
        
        # Also check textline_orientation_angles and other fields
        elif 'dt_polys' in result:
            # Extract text regions info
            polys = result.get('dt_polys', [])
            print(f"Found {len(polys)} text regions")
            
            # For now, return placeholder text since text extraction is complex
            for i, poly in enumerate(polys):
                texts.append((f"TEXT_REGION_{i+1}", 0.8))
    
    # Legacy format
    elif isinstance(result, list):
        for line in result:
            if isinstance(line, list) and len(line) >= 2:
                if isinstance(line[1], (list, tuple)) and len(line[1]) >= 2:
                    text, conf = line[1][0], line[1][1]
                    texts.append((text, conf))
    
    return texts

@app.post("/detect/")
async def detect_license_plates(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return {"error": "Invalid image", "results": []}
        
        print(f"📷 Processing: {image.shape}")
        
        # YOLO detection
        results = yolo_model(image, conf=0.1, verbose=False)
        detections = []
        
        for result in results:
            if result.boxes is None:
                continue
                
            print(f"🎯 YOLO detected {len(result.boxes)} license plate(s)")
            
            for i, box in enumerate(result.boxes):
                try:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                    yolo_conf = float(box.conf[0].cpu().numpy())
                    
                    plate_text = "LICENSE_PLATE"
                    ocr_conf = 0.0
                    
                    if ocr is not None:
                        try:
                            # Crop with padding
                            h, w = image.shape[:2]
                            pad = 20
                            x1_p = max(0, x1 - pad)
                            y1_p = max(0, y1 - pad)
                            x2_p = min(w, x2 + pad)
                            y2_p = min(h, y2 + pad)
                            
                            crop = image[y1_p:y2_p, x1_p:x2_p]
                            
                            if crop.size > 0:
                                enhanced = enhance_plate(crop)
                                
                                # Resize for better OCR
                                h_crop, w_crop = enhanced.shape[:2]
                                if h_crop < 40 or w_crop < 120:
                                    scale = max(40/h_crop, 120/w_crop, 1.5)
                                    new_h = int(h_crop * scale)
                                    new_w = int(w_crop * scale)
                                    enhanced = cv2.resize(enhanced, (new_w, new_h))
                                
                                print(f"Running OCR on image: {enhanced.shape}")
                                
                                # PaddleOCR with predict method
                                ocr_results = ocr.ocr(enhanced)
                                print(f"Raw OCR results type: {type(ocr_results)}")
                                
                                # Parse results using new method
                                texts = parse_paddleocr_result(ocr_results)
                                
                                print(f"Parsed texts: {texts}")
                                
                                # Find best text
                                best_text = ""
                                best_conf = 0
                                
                                for text, conf in texts:
                                    cleaned = clean_text(text)
                                    if cleaned and conf > best_conf:
                                        best_text = cleaned
                                        best_conf = conf
                                
                                if best_text:
                                    plate_text = best_text
                                    ocr_conf = best_conf
                                    print(f"📝 OCR Success: '{best_text}' (confidence: {best_conf:.3f})")
                                else:
                                    print("📝 OCR: No readable text found")
                                    plate_text = "NO_READABLE_TEXT"
                                
                        except Exception as ocr_error:
                            print(f"❌ OCR error: {ocr_error}")
                            plate_text = "OCR_ERROR"
                    else:
                        plate_text = "NO_OCR_ENGINE"
                    
                    detections.append({
                        "box": [x1, y1, x2, y2],
                        "text": plate_text,
                        "yolo_confidence": round(yolo_conf, 3),
                        "ocr_confidence": round(ocr_conf, 3)
                    })
                    
                    print(f"✅ Detection added: '{plate_text}' YOLO:{yolo_conf:.3f} OCR:{ocr_conf:.3f}")
                    
                except Exception as e:
                    print(f"❌ Error processing box {i}: {e}")
                    continue
        
        print(f"🎉 Returning {len(detections)} total detections")
        return {"results": detections}
        
    except Exception as e:
        print(f"❌ Server error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "results": []}

@app.get("/test")
async def test():
    return {
        "status": "PaddleOCR License Plate API",
        "yolo": "✅" if os.path.exists("./best.pt") else "❌",
        "ocr_status": ocr_status,
        "ready": ocr is not None and os.path.exists("./best.pt")
    }

@app.get("/")
async def root():
    return {"message": "PaddleOCR License Plate API", "status": "🚀 Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
