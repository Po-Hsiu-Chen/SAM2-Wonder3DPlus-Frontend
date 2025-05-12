from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageDraw
import io
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/encode")
async def encode_image(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # 假裝做分割：畫個遮罩（黑底、紅框）
    mask = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(mask)
    draw.rectangle([50, 50, image.width - 50, image.height - 50], outline="red", width=5)

    # 合成遮罩在原圖上（半透明紅框）
    output = image.copy().convert("RGBA")
    output.alpha_composite(mask)

    # 轉成 base64 傳回
    buf = io.BytesIO()
    output.save(buf, format="PNG")
    base64_str = base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "status": "ok",
        "message": "已產生遮罩",
        "mask_base64": base64_str
    }
