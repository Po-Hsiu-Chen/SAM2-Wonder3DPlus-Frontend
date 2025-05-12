from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw
import io
import base64
from sam2_runner import run_sam2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/encode")
async def encode_image(
    file: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    x1: int = Form(...),
    y1: int = Form(...),
    x2: int = Form(...),
    y2: int = Form(...)
):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    masked = run_sam2(image, point=(x, y), box=(x1, y1, x2, y2))

    # 回傳 base64 圖片
    buf = io.BytesIO()
    masked.save(buf, format="PNG")
    base64_str = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "status": "ok",
        "mask_base64": base64_str
    }
