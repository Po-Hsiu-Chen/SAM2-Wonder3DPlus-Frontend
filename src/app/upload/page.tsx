'use client';

import { useState, useRef, useEffect } from 'react';
import ClientModelPage from '@/components/ClientModelPage';

type Mode = 'point-positive' | 'point-negative' | 'box';

type Point = { x: number; y: number; label: 0 | 1 };
type BoxCoord = { x: number; y: number };




export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [boxTemp, setBoxTemp] = useState<BoxCoord[]>([]); // 暫存 box 點
  const [box, setBox] = useState<[number, number, number, number] | null>(null);

  const [mode, setMode] = useState<Mode>('point-positive');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [modelPath, setModelPath] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPoints([]);
      setBox(null);
      setMaskBase64(null);
    }
  };

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !selectedFile) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (mode === 'point-positive' || mode === 'point-negative') {
      const label: 0 | 1 = mode === 'point-positive' ? 1 : 0;
      const newPoints: Point[] = [...points, { x, y, label }];
      setPoints(newPoints);
      console.log('已新增點:', newPoints);
      await sendToBackend(newPoints, box, selectedFile);
    }
    

    if (mode === 'box') {
      const temp = [...boxTemp, { x, y }];
      setBoxTemp(temp);


      if (temp.length === 2) {
        const x1 = Math.min(temp[0].x, temp[1].x);
        const y1 = Math.min(temp[0].y, temp[1].y);
        const x2 = Math.max(temp[0].x, temp[1].x);
        const y2 = Math.max(temp[0].y, temp[1].y);
        const boxVal: [number, number, number, number] = [x1, y1, x2, y2];
        setBox(boxVal);
        setBoxTemp([]);
        console.log('已完成框選:', boxVal);
        await sendToBackend(points, boxVal, selectedFile);
      } else {
        setBoxTemp(temp);
      }
    }
  };
  const handleGenerate = async () => {
    if (!selectedFile || points.length === 0) {
      alert("請先上傳圖片與選點");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('points', JSON.stringify(points));
    if (box) {
      formData.append(
        'box',
        JSON.stringify({ x1: box[0], y1: box[1], x2: box[2], y2: box[3] })
      );
    }
    formData.append('camera_type', 'persp');

    const res = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.status === "ok") {
      alert("模型已生成！");
      console.log("模型路徑:", data.model_path);

      // 這裡組合完整 URL，並存到 state 或直接傳給 ClientModelPage
      const backendBaseUrl = "http://localhost:8000"; // 你的後端地址
      const fullModelUrl = backendBaseUrl + data.model_path;

      // 假設你要用 state 管理模型路徑，並用它來渲染 ClientModelPage
      setModelPath(fullModelUrl);

    } else {
      alert("生成失敗: " + data.message);
    }
  };


  const sendToBackend = async (
    points: Point[],
    box: [number, number, number, number] | null,
    file: File
  ) => {
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('points', JSON.stringify(points));
    if (box) {
      formData.append(
        'box',
        JSON.stringify({ x1: box[0], y1: box[1], x2: box[2], y2: box[3] })
      );
    }

    const res = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setMaskBase64(data.mask_base64);
    console.log("maskBase64長度:", data.mask_base64?.length);
    console.log("maskBase64前30字:", data.mask_base64?.slice(0,30));

  };

  const drawMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img || !maskBase64) return;
  
    const { naturalWidth, naturalHeight } = img;
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
  
    const maskImg = new Image();
    //maskImg.src = data:image/png;base64,${maskBase64};
    maskImg.src = `data:image/png;base64,${maskBase64}`;
    maskImg.onload = () => {
      console.log("遮罩圖片已載入");
      ctx.clearRect(0, 0, canvas.width, canvas.height); // 先清
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 原圖
      ctx.globalAlpha = 0.5;
      ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height); // 遮罩
      ctx.globalAlpha = 1;
  
      // 測試框（可刪）
      //ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
      //ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
  
    maskImg.onerror = () => {
      console.error("遮罩載入失敗，base64:", maskBase64?.substring(0, 30));
    };
  };
  

  useEffect(() => {
    drawMask();
  }, [maskBase64]);

  return (
    <main className="p-4 flex flex-col items-center gap-4">
      <h1 className="text-xl font-bold">SAM2 多點遮罩測試</h1>

      <div className="flex gap-2">
        <button onClick={() => setMode('point-positive')} className="bg-blue-500 text-white px-2 py-1 rounded">
          保留
        </button>
        <button onClick={() => setMode('point-negative')} className="bg-blue-500 text-white px-2 py-1 rounded">
          移除
        </button>
        <button onClick={() => setMode('box')} className="bg-blue-500 text-white px-2 py-1 rounded">
          框選
        </button>
      </div>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {previewUrl && (
        <div>
          <div  style={{ position: 'relative', flexBasis: '60%', flexShrink: 0, width: '100%', border: '1px solid #ddd', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1,
              width: '100%',
              height: '100%',
              cursor: 'crosshair',
            }}
            onClick={handleCanvasClick}
          />
            <img
              ref={imageRef}
              src={previewUrl}
              alt="預覽圖"
              onLoad={() => {
                const img = imageRef.current;
                const canvas = canvasRef.current;
                if (img && canvas) {
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  canvas.style.width = img.clientWidth + 'px';
                  canvas.style.height = img.clientHeight + 'px';
                }
                drawMask();
              }}
              
              style={{ maxWidth: '80vw', height: 'auto', display: 'block', position: 'relative', zIndex: 0 }}
            />
          </div>
          
          {/* 提示文字區 */}
          <div className="mt-2">
            {mode === 'point-positive' && <p className="text-green-700">請點擊圖片以新增 <strong>保留</strong></p>}
            {mode === 'point-negative' && <p className="text-red-700">請點擊圖片以新增 <strong>移除</strong></p>}
            {mode === 'box' && boxTemp.length === 0 && <p className="text-blue-700">請點擊圖片以選擇 <strong>框選左上角</strong></p>}
            {mode === 'box' && boxTemp.length === 1 && <p className="text-blue-700">請點擊圖片以選擇 <strong>框選右下角</strong></p>}
          </div>
        </div>
      )}
      <button
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
        onClick={handleGenerate}
      >
        生成 3D 模型
      </button>
      <div style={{ flexBasis: '40%', flexShrink: 0, width: '100%', marginTop: 20, border: '1px solid #ddd' }}>
        {modelPath && <ClientModelPage modelPath={modelPath} />}
      </div>
      


    </main>
  );
}   