from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import json
import tempfile
from PIL import Image
import base64
import io

from sam2_predict_runner import run_sam2_predict  

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或 "http://localhost:3000"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/predict")
async def predict_mask(
    file: UploadFile = File(...),
    points: str = Form(...),       # JSON 字串
    box: Optional[str] = Form(None)  # JSON 字串
):
    # 存圖
    contents = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(contents)
        image_path = tmp.name

    try:
        # 解析點資料
        point_data = json.loads(points)  # List[{"x": int, "y": int, "label": int}]
        coords = [(p["x"], p["y"]) for p in point_data]
        labels = [p["label"] for p in point_data]

        # 解析 box 資料
        box_tuple = None
        if box:
            box_data = json.loads(box)
            box_tuple = (box_data["x1"], box_data["y1"], box_data["x2"], box_data["y2"])

        # sam2
        mask: Image.Image = run_sam2_predict(image_path, coords, labels, box_tuple)

        # 回傳 base64 圖
        buffer = io.BytesIO()
        mask.save(buffer, format="PNG")
        base64_mask = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "status": "ok",
            "mask_base64": base64_mask
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
