from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import json
import tempfile
from PIL import Image
import base64
import io
import os

from sam2_predict_runner import run_sam2_predict  
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/output", StaticFiles(directory="/workspace/output"), name="output")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或是你可以限定成 ["http://localhost:3000"]
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

        # sam2 回傳兩張圖 (去背後圖片, 遮罩圖片)
        image_no_background, mask = run_sam2_predict(image_path, coords, labels, box_tuple)

        # 把遮罩圖片轉成 base64 傳回前端
        buffer = io.BytesIO()
        mask.save(buffer, format="PNG")
        base64_mask = base64.b64encode(buffer.getvalue()).decode("utf-8")
        print("回傳的 mask_base64 長度:", len(base64_mask))

        return {
            "status": "ok",
            "mask_base64": base64_mask,
            # 如果前端要去背後圖片路徑或 base64，也可以加上去
            # "image_no_background_base64": image_no_background_base64
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/generate")
async def generate_3d_model(
    file: UploadFile = File(...),
    points: str = Form(...),
    box: Optional[str] = Form(None),
    camera_type: str = Form("persp")  # 預設為 perspective
):
    import subprocess
    import uuid

    # 儲存圖像
    contents = await file.read()
    image_id = str(uuid.uuid4())[:8]
    temp_dir = f"/workspace/output/{image_id}"
    os.makedirs(temp_dir, exist_ok=True)
    image_path = os.path.join(temp_dir, "input.png")
    with open(image_path, "wb") as f:
        f.write(contents)

    # 解析點與框
    point_data = json.loads(points)
    coords = [(p["x"], p["y"]) for p in point_data]
    labels = [p["label"] for p in point_data]
    box_tuple = None
    if box:
        box_data = json.loads(box)
        box_tuple = (box_data["x1"], box_data["y1"], box_data["x2"], box_data["y2"])

    # SAM2 → 遮罩圖（RGBA）和去背後的圖片
    image_no_background, mask_img = run_sam2_predict(image_path, coords, labels, box_tuple)

    # 儲存去背後的圖片
    output_image_path = os.path.join(temp_dir, "output_image.png")
    image_no_background.save(output_image_path)

    # 儲存遮罩圖
    output_mask_path = os.path.join(temp_dir, "output_mask.png")
    mask_img.save(output_mask_path)

    # 呼叫 Wonder3D 生成模型
    try:
        subprocess.run([
            "python", "../Wonder3DPlus/run.py",
            "--input_path", output_image_path,  # 使用去背後的圖片
            "--camera_type", camera_type,
            "--output_path", os.path.join(temp_dir, "model")
        ], check=True)
    except subprocess.CalledProcessError:
        return {"status": "error", "message": "3D 模型生成失敗"}

    model_relative_path = f"/output/{image_id}/model/output_image/iterative_refine-1/persp/3d_model/model.glb"

    return {
        "status": "ok",
        "model_path": model_relative_path
    }

