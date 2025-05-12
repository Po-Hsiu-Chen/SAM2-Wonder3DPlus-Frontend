import os
import numpy as np
import torch
from PIL import Image
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

# 裝置設定（只初始化一次）
if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")

if device.type == "cuda":
    torch.autocast("cuda", dtype=torch.bfloat16).__enter__()
    if torch.cuda.get_device_properties(0).major >= 8:
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

# 載入模型（只載入一次）
checkpoint = "/workspace/SAM2/checkpoints/sam2.1_hiera_large.pt"
model_cfg = "/workspace/SAM2/sam2/configs/sam2.1/sam2.1_hiera_l.yaml"
model = build_sam2(model_cfg, checkpoint)
predictor = SAM2ImagePredictor(model)

# === 主推論函式 ===
def run_sam2(image: Image.Image, point: tuple[int, int], box: tuple[int, int, int, int]) -> Image.Image:
    image_array = np.array(image.convert("RGB"))
    predictor.set_image(image_array)

    input_point = np.array([point])
    input_label = np.array([1])
    input_box = np.array(box)
    mask_input = None

    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        box=input_box,
        mask_input=mask_input,
        multimask_output=False
    )

    best_mask = masks[np.argmax(scores)].astype(np.uint8) * 255
    alpha = Image.fromarray(best_mask).convert("L")
    image_rgba = image.convert("RGBA")
    image_rgba.putalpha(alpha)

    return image_rgba  # return masked image
