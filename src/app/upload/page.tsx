'use client';

import { useState, useRef, useEffect } from 'react';

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    const res = await fetch('http://localhost:8000/encode', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setMaskBase64(data.mask_base64);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="text-2xl font-bold">圖片上傳與遮罩顯示</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setSelectedFile(file);
        }}
      />

      <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        上傳圖片並執行分割
      </button>

      {maskBase64 && (
        <img
          src={`data:image/png;base64,${maskBase64}`}
          alt="遮罩結果"
          className="mt-4 border"
          style={{ maxWidth: '500px' }}
        />
      )}
    </main>
  );
}
