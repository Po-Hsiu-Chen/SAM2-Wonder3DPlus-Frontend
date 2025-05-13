import os
import numpy as np
from PIL import Image
import torch

# 匯入你 SAM2 的核心
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

# === Step 1: 初始化裝置與模型（只做一次） ===

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

# 修改成你的權重與 config 路徑
checkpoint = "/workspace/SAM2/checkpoints/sam2.1_hiera_large.pt"
model_cfg = "/workspace/SAM2/sam2/configs/sam2.1/sam2.1_hiera_l.yaml"

print("載入 SAM2 模型中...")
model = build_sam2(model_cfg, checkpoint)
predictor = SAM2ImagePredictor(model)
print("SAM2 模型初始化完成")

# === Step 2: 提供 API 函式 ===

def run_sam2_predict(
    image_path: str,
    coords: list[tuple[int, int]],
    labels: list[int],
    box: tuple[int, int, int, int] | None
) -> Image.Image:
    """
    輸入：
        image_path：圖片路徑
        coords：多點 [(x1, y1), (x2, y2), ...]
        labels：對應 label（1=正點，0=負點）
        box：可選的 (x1, y1, x2, y2)
    回傳：
        PIL.Image，含遮罩的 RGBA 圖片
    """
    image = Image.open(image_path).convert("RGB")
    image_array = np.array(image)

    predictor.set_image(image_array)

    point_coords = np.array(coords)
    point_labels = np.array(labels)
    box_arr = np.array(box) if box else None

    masks, scores, logits = predictor.predict(
        point_coords=point_coords,
        point_labels=point_labels,
        box=box_arr,
        mask_input=None,
        multimask_output=False
    )

    best_mask = masks[np.argmax(scores)].astype(np.uint8) * 255
    alpha_mask = Image.fromarray(best_mask).convert("L")
    image_rgba = image.convert("RGBA")
    image_rgba.putalpha(alpha_mask)

    best_mask = masks[np.argmax(scores)].astype(np.uint8) * 255
    alpha_mask = Image.fromarray(best_mask).convert("L")

    # 原始遮罩：0=黑，255=白
    mask_array = masks[np.argmax(scores)].astype(np.uint8) * 255

    # 建立透明圖，白區設為半透明紅色
    rgba = np.zeros((mask_array.shape[0], mask_array.shape[1], 4), dtype=np.uint8)
    rgba[mask_array == 255] = [255, 0, 0, 255]  

    mask_img = Image.fromarray(rgba, mode="RGBA")
    return mask_img


