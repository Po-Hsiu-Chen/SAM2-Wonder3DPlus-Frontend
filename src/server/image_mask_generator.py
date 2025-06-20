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

def show_mask(mask, ax, random_color=False, borders = True):
    if random_color:
        color = np.concatenate([np.random.random(3), np.array([0.6])], axis=0)
    else:
        color = np.array([30/255, 144/255, 255/255, 0.6])
    h, w = mask.shape[-2:]
    mask = mask.astype(np.uint8)
    mask_image =  mask.reshape(h, w, 1) * color.reshape(1, 1, -1)
    if borders:
        import cv2
        contours, _ = cv2.findContours(mask,cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE) 
        # Try to smooth contours
        contours = [cv2.approxPolyDP(contour, epsilon=0.01, closed=True) for contour in contours]
        mask_image = cv2.drawContours(mask_image, contours, -1, (1, 1, 1, 0.5), thickness=2) 
    ax.imshow(mask_image)

def show_points(coords, labels, ax, marker_size=375):
    pos_points = coords[labels==1]
    neg_points = coords[labels==0]
    ax.scatter(pos_points[:, 0], pos_points[:, 1], color='green', marker='*', s=marker_size, edgecolor='white', linewidth=1.25)
    ax.scatter(neg_points[:, 0], neg_points[:, 1], color='red', marker='*', s=marker_size, edgecolor='white', linewidth=1.25)   

def show_box(box, ax):
    x0, y0 = box[0], box[1]
    w, h = box[2] - box[0], box[3] - box[1]
    ax.add_patch(plt.Rectangle((x0, y0), w, h, edgecolor='green', facecolor=(0, 0, 0, 0), lw=2))    

def show_masks(image, masks, scores, point_coords=None, box_coords=None, input_labels=None, borders=True):
    for i, (mask, score) in enumerate(zip(masks, scores)):
        plt.figure(figsize=(10, 10))
        plt.imshow(image)
        show_mask(mask, plt.gca(), borders=borders)
        if point_coords is not None:
            assert input_labels is not None
            show_points(point_coords, input_labels, plt.gca())
        if box_coords is not None:
            # boxes
            show_box(box_coords, plt.gca())
        if len(scores) > 1:
            plt.title(f"Mask {i+1}, Score: {score:.3f}", fontsize=18)
        plt.axis('off')
        vis_output = os.path.join(output_dir, f"visual_mask_{i+1}.png")
        plt.savefig(vis_output)
        plt.show()

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

