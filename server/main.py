# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import base64
# import cv2
# import numpy as np
# from ultralytics import YOLO
# from paddleocr import PaddleOCR
# import logging

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # --- GLOBAL INSTANTIATION (models loaded ONCE) ---
# yolo_model = YOLO("./best.pt")

# # MINIMAL PaddleOCR initialization
# ocr_model = PaddleOCR(lang='en')

# app = FastAPI()
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=['*'],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class ImagePayload(BaseModel):
#     image: str

# def base64_to_image(base64_str):
#     """Convert base64 string to OpenCV image with proper error handling"""
#     try:
#         if ',' not in base64_str or not base64_str.strip():
#             raise ValueError("Base64 string is empty or not in expected format.")
        
#         header, img_b64 = base64_str.split(',', 1)
#         img_bytes = base64.b64decode(img_b64)
#         img_array = np.frombuffer(img_bytes, dtype=np.uint8)
#         img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
#         if img is None:
#             raise ValueError("Failed to decode image. Image is None.")
        
#         return img
#     except Exception as e:
#         logger.error(f"Error in base64_to_image: {str(e)}")
#         raise ValueError(f"Image decoding failed: {str(e)}")

# def preprocess_for_ocr(image_crop):
#     """Simple preprocessing to prevent memory issues"""
#     try:
#         h, w = image_crop.shape[:2]
        
#         # Resize if too large to prevent memory issues
#         max_dim = 800
#         if max(h, w) > max_dim:
#             scale = max_dim / max(h, w)
#             new_w = int(w * scale)
#             new_h = int(h * scale)
#             image_crop = cv2.resize(image_crop, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
#         # Ensure minimum size
#         if h < 20 or w < 40:
#             image_crop = cv2.resize(image_crop, (max(40, w*2), max(20, h*2)), 
#                                   interpolation=cv2.INTER_CUBIC)
        
#         return image_crop
#     except Exception as e:
#         logger.error(f"Preprocessing error: {str(e)}")
#         return image_crop

# def safe_extract_text_paddleocr(image_crop):
#     """Safely extract text using PaddleOCR with comprehensive error handling"""
#     try:
#         # Preprocess crop
#         processed_crop = preprocess_for_ocr(image_crop)
        
#         # Call PaddleOCR
#         results = ocr_model.ocr(processed_crop, cls=False)
        
#         detected_text = ""
#         confidence = 0.0
        
#         # Safe result parsing with multiple checks
#         if results is not None and len(results) > 0:
#             # results is a list, get first element
#             result_list = results[0] if isinstance(results, list) else results
            
#             if result_list is not None and len(result_list) > 0:
#                 for line in result_list:
#                     try:
#                         # Each line should be: [[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], [text, confidence]]
#                         if line and isinstance(line, list) and len(line) >= 2:
#                             # Get text and confidence from the second element
#                             text_info = line[1]
#                             if isinstance(text_info, list) and len(text_info) >= 2:
#                                 text = str(text_info[0]) if text_info[0] else ""
#                                 conf = float(text_info[1]) if text_info[1] is not None else 0.0
                                
#                                 # Keep text with highest confidence
#                                 if conf > confidence and text.strip():
#                                     detected_text = text.strip()
#                                     confidence = conf
#                             elif isinstance(text_info, tuple) and len(text_info) >= 2:
#                                 # Sometimes it's a tuple
#                                 text = str(text_info[0]) if text_info[0] else ""
#                                 conf = float(text_info[1]) if text_info[1] is not None else 0.0
                                
#                                 if conf > confidence and text.strip():
#                                     detected_text = text.strip()
#                                     confidence = conf
                    
#                     except (IndexError, TypeError, ValueError) as line_error:
#                         logger.warning(f"Error parsing OCR line: {str(line_error)}")
#                         continue
        
#         logger.info(f"OCR Result: '{detected_text}' (confidence: {confidence:.3f})")
#         return detected_text, confidence
        
#     except Exception as e:
#         logger.error(f"Error in safe_extract_text_paddleocr: {str(e)}")
#         return "", 0.0

# @app.post("/detect/")
# async def detect(payload: ImagePayload):
#     try:
#         logger.info("Detection request received")
        
#         # Decode image
#         image = base64_to_image(payload.image)
#         logger.info(f"Image decoded successfully, shape: {image.shape}")
        
#         # Run YOLO detection
#         results = yolo_model(image, conf=0.5)
#         logger.info("YOLO detection completed")
        
#         detections = []
        
#         for r in results:
#             if r.boxes is not None and len(r.boxes) > 0:
#                 for box in r.boxes:
#                     try:
#                         # Extract bounding box coordinates
#                         x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
#                         confidence = float(box.conf[0].cpu().numpy())
                        
#                         # Validate coordinates
#                         h, w = image.shape[:2]
#                         x1, x2 = max(0, x1), min(w, x2)
#                         y1, y2 = max(0, y1), min(h, y2)
                        
#                         # Skip small detections
#                         if (x2 - x1) < 20 or (y2 - y1) < 10:
#                             continue
                        
#                         # Crop the detected region
#                         plate_crop = image[y1:y2, x1:x2]
                        
#                         if plate_crop.size == 0:
#                             continue
                        
#                         # Extract text using safe PaddleOCR function
#                         detected_text, ocr_confidence = safe_extract_text_paddleocr(plate_crop)
                        
#                         # Only include good results
#                         if ocr_confidence > 0.3 and len(detected_text) > 0:
#                             detections.append({
#                                 "box": [x1, y1, x2, y2],
#                                 "text": detected_text,
#                                 "yolo_confidence": confidence,
#                                 "ocr_confidence": ocr_confidence
#                             })
                    
#                     except Exception as box_error:
#                         logger.error(f"Box processing error: {str(box_error)}")
#                         continue
        
#         logger.info(f"Final detections: {len(detections)} plates found")
#         return {"results": detections, "status": "success"}
        
#     except ValueError as ve:
#         logger.error(f"Value error: {str(ve)}")
#         raise HTTPException(status_code=400, detail=str(ve))
    
#     except Exception as e:
#         logger.error(f"Unexpected error: {str(e)}")
#         return {"results": [], "error": str(e), "status": "error"}

# @app.get("/health")
# async def health_check():
#     return {"status": "healthy", "models_loaded": True}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)




# easy ocr
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
from ultralytics import YOLO
import easyocr

# Load your YOLOv11 trained model (.pt) once at startup
yolo_model = YOLO("./best.pt") # Change to your model path
reader = easyocr.Reader(['en'])

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # For dev, use * (or ["http://localhost:3000"] for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImagePayload(BaseModel):
    image: str

def base64_to_image(base64_str):
    header, img_b64 = base64_str.split(',', 1)
    img_bytes = base64.b64decode(img_b64)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return img

@app.post("/detect/")
async def detect(payload: ImagePayload):
    image = base64_to_image(payload.image)
    # YOLO Inference: get bounding boxes for plates
    results = yolo_model(image)
    detections = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            # Crop and sanitize box
            h, w = image.shape[:2]
            x1, x2 = max(0, x1), min(w-1, x2)
            y1, y2 = max(0, y1), min(h-1, y2)
            plate_crop = image[y1:y2, x1:x2]
            # Skip if crop is invalid
            if plate_crop.size == 0 or (y2 - y1 < 15 or x2 - x1 < 15):
                continue
            try:
                crop_resized = cv2.resize(plate_crop, (180, 50), interpolation=cv2.INTER_AREA)
            except:
                continue
            ocr_results = reader.readtext(crop_resized)
            # Get the string with the highest confidence
            detected_text, conf_score = "", 0
            for ocr in ocr_results:
                if len(ocr) >= 3 and ocr[2] > conf_score:
                    detected_text = ocr[1]
                    conf_score = ocr[2]
            detections.append({
                "box": [x1, y1, x2, y2],
                "text": detected_text.strip()
            })
    return {"results": detections}
