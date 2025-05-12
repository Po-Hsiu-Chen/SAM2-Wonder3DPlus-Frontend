'use client';

import { useRef, useState } from 'react';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMaskBase64(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPoint(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    setPoint({ x, y });
  };

  const handleUpload = async () => {
    if (!selectedFile || !point) {
      alert('請先上傳圖片並點擊一個位置！');
      return;
    }

    // 設定一個預設 box（以點為中心）
    const boxSize = 100;
    const x1 = Math.max(0, point.x - boxSize);
    const y1 = Math.max(0, point.y - boxSize);
    const x2 = point.x + boxSize;
    const y2 = point.y + boxSize;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('x', point.x.toString());
    formData.append('y', point.y.toString());
    formData.append('x1', x1.toString());
    formData.append('y1', y1.toString());
    formData.append('x2', x2.toString());
    formData.append('y2', y2.toString());

    const res = await fetch('http://localhost:8000/encode', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setMaskBase64(data.mask_base64);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-2xl font-bold">SAM2 圖片點擊分割測試</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {previewUrl && (
        <>
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            style={{ border: '1px solid gray' }}
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
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            }}
          />
          {point && (
            <p>你點的位置：({point.x}, {point.y})</p>
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
