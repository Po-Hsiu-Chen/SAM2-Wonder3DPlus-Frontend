'use client';

import { useRef, useState } from 'react';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);

  const [clicks, setClicks] = useState<{ x: number; y: number }[]>([]);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [box, setBox] = useState<[number, number, number, number] | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMaskBase64(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setClicks([]);
      setPoint(null);
      setBox(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
  
    const rect = canvas.getBoundingClientRect();
  
    // CSS 實際顯示大小 vs 實際畫布大小
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
  
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
  
    const newClicks = [...clicks, { x, y }];
    setClicks(newClicks);
  
    if (newClicks.length === 1) {
      setPoint(newClicks[0]);
    } else if (newClicks.length === 3) {
      const [_, p1, p2] = newClicks;
      setBox([
        Math.min(p1.x, p2.x),
        Math.min(p1.y, p2.y),
        Math.max(p1.x, p2.x),
        Math.max(p1.y, p2.y),
      ]);
    }
  };
  

  const handleUpload = async () => {
    setClicks([]);
    if (!selectedFile || !point || !box) {
      alert('請上傳圖片並點擊兩次：一次取點、一次框住區域');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('x', point.x.toString());
    formData.append('y', point.y.toString());
    formData.append('x1', box[0].toString());
    formData.append('y1', box[1].toString());
    formData.append('x2', box[2].toString());
    formData.append('y2', box[3].toString());

    const res = await fetch('http://localhost:8000/encode', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setMaskBase64(data.mask_base64);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-2xl font-bold">SAM2 點擊選點 + 框選分割</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {previewUrl && (
        <>
          <canvas
            ref={canvasRef}
            style={{
              border: '1px solid gray',
              maxWidth: '80vw',
              height: 'auto',
            }}
            onClick={handleCanvasClick}
          />
          <img
            ref={imageRef}
            src={previewUrl}
            alt="預覽"
            hidden
            onLoad={() => {
              const canvas = canvasRef.current;
              const ctx = canvas?.getContext('2d');
              const img = imageRef.current;
              if (canvas && ctx && img) {
                const { naturalWidth, naturalHeight } = img;
            
                // 動態設定 canvas 寬高
                canvas.width = naturalWidth;
                canvas.height = naturalHeight;
            
                // 畫圖
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
              }
            }}
            
          />

            {clicks.length === 0 && <p>請點擊第一次（SAM2 點）</p>}
            {clicks.length === 1 && <p>請點擊第二次（框選左上角）</p>}
            {clicks.length === 2 && <p>請點擊第三次（框選右下角）</p>}
            {clicks.length === 3 && point && box && (
              <p>點位：({point.x}, {point.y})，框：({box[0]}, {box[1]}) - ({box[2]}, {box[3]})</p>
            )}

        </>
      )}

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        執行 SAM2 分割
      </button>

      {maskBase64 && (
        <img
          src={`data:image/png;base64,${maskBase64}`}
          alt="遮罩結果"
          className="mt-4 border"
          style={{ maxWidth: '512px' }}
        />
      )}
    </main>
  );
}
