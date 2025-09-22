# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# import base64
# import cv2
# import numpy as np
# from ultralytics import YOLO
# from paddleocr import PaddleOCR

# # --- GLOBAL INSTANTIATION (models loaded ONCE) ---
# yolo_model = YOLO("./best.pt")
# ocr_model = PaddleOCR(use_angle_cls=True, lang='en')  # Language can be customized (e.g., 'en', 'en+ch', etc.)

# app = FastAPI()
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=['*'],  # For dev, use "*" - use real host for production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class ImagePayload(BaseModel):
#     image: str  # expects base64 string (with header, e.g. "data:image/jpeg;base64,...")

# def base64_to_image(base64_str):
#     if ',' not in base64_str or not base64_str.strip():
#         raise ValueError("Base64 string is empty or not in expected format.")
#     header, img_b64 = base64_str.split(',', 1)
#     img_bytes = base64.b64decode(img_b64)
#     img_array = np.frombuffer(img_bytes, dtype=np.uint8)
#     img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
#     if img is None:
#         raise ValueError("Failed to decode image. Image is None.")
#     return img

# @app.post("/detect/")
# async def detect(payload: ImagePayload):
#     try:
#         print("Request received")
#         image = base64_to_image(payload.image)
#         if image is None:
#             print("Image is None after decoding.")
#             return {"results": [], "error": "Image decode failed"}
#         print("Image decoded, shape:", image.shape if image is not None else None)
#         results = yolo_model(image)
#         print("YOLO results:", results)
#         detections = []
#         for r in results:
#             for box in r.boxes:
#                 x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
#                 print(f"Box: {x1}, {y1}, {x2}, {y2}")
#                 h, w = image.shape[:2]
#                 x1, x2 = max(0, x1), min(w-1, x2)
#                 y1, y2 = max(0, y1), min(h-1, y2)
#                 plate_crop = image[y1:y2, x1:x2]
#                 print("Crop shape:", plate_crop.shape if plate_crop is not None else None)
#                 if plate_crop.size == 0 or (y2 - y1 < 15 or x2 - x1 < 15):
#                     continue
#                 try:
#                     crop_resized = cv2.resize(plate_crop, (180, 50), interpolation=cv2.INTER_AREA)
#                 except Exception as resize_error:
#                     print("Resize error:", resize_error)
#                     continue
#                 ocr_results = ocr_model.ocr(crop_resized)
#                 detected_text = ""
#                 conf_score = 0
#                 if ocr_results and len(ocr_results[0]) > 0:
#                     for line in ocr_results[0]:
#                         text, conf = line[1][0], line[1][1]
#                         if conf > conf_score:
#                             detected_text = text
#                             conf_score = conf
#                 detections.append({
#                     "box": [x1, y1, x2, y2],
#                     "text": detected_text.strip()
#                 })
#         print("Detections:", detections)
#         return {"results": detections}
#     except Exception as e:
#         print("ERROR:", e)
#         return {"results": [], "error": str(e)}



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
