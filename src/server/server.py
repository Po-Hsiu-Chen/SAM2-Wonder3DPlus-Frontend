from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import base64
import tempfile
from main_fastapi import run_sam2_pipeline  

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

    # 存成臨時圖片
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # 呼叫 SAM2 遮罩生成功能（不跑 Wonder3D）
        mask_path = run_sam2_pipeline(tmp_path, point=(x, y), box=(x1, y1, x2, y2))

        # 轉 base64 回傳
        with open(mask_path, "rb") as f:
            base64_mask = base64.b64encode(f.read()).decode("utf-8")

        return {
            "status": "ok",
            "mask_base64": base64_mask
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
