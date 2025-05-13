# main.py
import os
import subprocess
import sys
import argparse
from PIL import Image

def run_sam2_pipeline(image_path: str, point: tuple[int, int], box: tuple[int, int, int, int]) -> str:
    """
    執行 SAM2 背景去除（不進入 Wonder3D），回傳遮罩圖路徑
    """
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    output_dir = os.path.join("output", image_name)
    os.makedirs(output_dir, exist_ok=True)

    print("Step 1: 執行 SAM2 背景去除...")
    try:
        subprocess.run([
            "python", "SAM2/image_mask_generator.py",
            image_path,
            "--point", str(point[0]), str(point[1]),
            "--box", str(box[0]), str(box[1]), str(box[2]), str(box[3])
        ], check=True)
    except subprocess.CalledProcessError:
        print("SAM2 去背失敗")
        raise RuntimeError("SAM2 去背失敗")

    mask_path = os.path.abspath(os.path.join(output_dir, "output_mask.png"))

    if not os.path.exists(mask_path):
        raise FileNotFoundError(f"找不到遮罩圖：{mask_path}")
    
    print(f"遮罩圖產生完成：{mask_path}")
    return mask_path


def run_full_pipeline(image_path: str, camera_type: str, point, box):
    """
    完整流程：SAM2 去背 + Wonder3D 生成
    """
    mask_path = run_sam2_pipeline(image_path, point, box)

    image_name = os.path.splitext(os.path.basename(image_path))[0]
    print("Step 2: 執行 Wonder3DPlus 模型生成...")
    try:
        subprocess.run([
            "python", "Wonder3DPlus/run.py",
            "--input_path", mask_path,
            "--camera_type", camera_type,
            "--output_path", os.path.join("..", "output", image_name)
        ], check=True)
    except subprocess.CalledProcessError:
        print("Wonder3DPlus 生成失敗")
        raise RuntimeError("Wonder3DPlus 失敗")

    print("全部完成！")


# ===============================
# CLI 執行入口
# ===============================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="主程式：SAM2 + Wonder3D")
    parser.add_argument("image_path", type=str, help="輸入圖片路徑")
    parser.add_argument("camera_type", type=str, choices=["ortho", "persp"])
    parser.add_argument("--point", type=int, nargs=2, metavar=("X", "Y"), required=True)
    parser.add_argument("--box", type=int, nargs=4, metavar=("X1", "Y1", "X2", "Y2"), required=True)
    args = parser.parse_args()

    run_full_pipeline(args.image_path, args.camera_type, args.point, args.box)
