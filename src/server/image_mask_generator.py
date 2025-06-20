import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import numpy as np
import torch
import matplotlib.pyplot as plt
from PIL import Image
import argparse

from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

# 設定裝置
if torch.cuda.is_available():
    device = torch.device("cuda")
elif torch.backends.mps.is_available():
    device = torch.device("mps")
else:
    device = torch.device("cpu")
print(f"Using device: {device}")

if device.type == "cuda":
    torch.autocast("cuda", dtype=torch.bfloat16).__enter__()
    if torch.cuda.get_device_properties(0).major >= 8:
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
elif device.type == "mps":
    print("\nMPS support is experimental. Results may differ or perform worse than CUDA.")

# 命令列參數
parser = argparse.ArgumentParser(description="SAM2 Segmentation")
parser.add_argument("image_path", type=str, help="Path to the input image")
parser.add_argument("--point", type=int, nargs=2, metavar=("X", "Y"), help="Optional point coordinate")
parser.add_argument("--box", type=int, nargs=4, metavar=("X1", "Y1", "X2", "Y2"), help="Optional bounding box")
args = parser.parse_args()

np.random.seed(3)

# Step 1: 載入圖像與建立資料夾
image = Image.open(args.image_path).convert("RGB")
image_array = np.array(image)

image_name = os.path.splitext(os.path.basename(args.image_path))[0]
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..")) # SAM2_Wonder3DPlus/
output_dir = os.path.join(project_root, "output", image_name)
os.makedirs(output_dir, exist_ok=True)

plt.imsave(os.path.join(output_dir, "original_image.png"), image_array)

# Step 2: 載入模型
checkpoint = "/workspace/SAM2/checkpoints/sam2.1_hiera_large.pt"
model_cfg = "../sam2/configs/sam2.1/sam2.1_hiera_l.yaml"
model = build_sam2(model_cfg, checkpoint)
predictor = SAM2ImagePredictor(model)

# Step 3: 設定圖像
predictor.set_image(image_array)

# Step 4: 處理輸入
input_point = np.array([args.point]) if args.point else None
input_label = np.array([1]) if args.point else None
input_box = np.array(args.box) if args.box else None

# Step 5: 預測
masks, scores, logits = predictor.predict(
    point_coords=input_point,
    point_labels=input_label,
    box=input_box,
    mask_input=None,
    multimask_output=False
)

# Step 6: 取最好的 mask
sorted_ind = np.argsort(scores)[::-1]
masks = masks[sorted_ind]
scores = scores[sorted_ind]

best_mask = masks[0].astype(np.uint8) * 255
plt.imsave(os.path.join(output_dir, "predicted_mask.png"), best_mask, cmap='jet')

# Step 7: 套用 mask 並儲存
alpha = Image.fromarray(best_mask).convert("L")
image.putalpha(alpha)
output_mask_path = os.path.join(output_dir, "output_mask.png")
image.save(output_mask_path)
print(f"Saved: {output_mask_path}")

