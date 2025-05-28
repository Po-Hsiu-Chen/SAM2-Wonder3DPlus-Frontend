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
  const [isGenerating, setIsGenerating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    setIsGenerating(true); // 開始載入狀態

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('points', JSON.stringify(points));
    if (box) {
      formData.append('box', JSON.stringify({ x1: box[0], y1: box[1], x2: box[2], y2: box[3] }));
    }
    formData.append('camera_type', 'persp');

    try {
      const res = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.status === "ok") {
        alert("模型已生成！");
        const backendBaseUrl = "http://localhost:8000";
        setModelPath(backendBaseUrl + data.model_path);
      } else {
        alert("生成失敗: " + data.message);
      }
    } catch (error) {
      alert("請求失敗：" + error);
    }

    setIsGenerating(false); // 載入結束
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
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    // 同步 canvas CSS 尺寸
    const resizeObserver = new ResizeObserver(() => {
      const rect = img.getBoundingClientRect();
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    });

    resizeObserver.observe(img);

    // 畫遮罩
    drawMask();

    return () => {
      resizeObserver.disconnect();
    };
  }, [maskBase64, previewUrl]);  // 監控 maskBase64 和圖片改變

  return (
    <main className="w-full min-h-screen flex flex-col items-center gap-6" style={{ backgroundColor: '#F7F7FF', paddingTop: '2%', paddingLeft: '14%', paddingRight: '14%'}}>
      <h1 className="text-xl font-bold">3D 模型生成</h1>
      
      {/* 更換圖片按鈕 */}
      {previewUrl && (
        <button
          onClick={() => document.getElementById('fileInput')?.click()}
          style={{
              display: 'inline-flex',
              flexDirection: 'row',   
              alignItems: 'center',   
              background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)',
              border: 'none',
              borderRadius: 24,
              gap: 6,
              color: 'white',
              padding: '10px 50px',
              fontSize: 14,
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0, 123, 255, 0.6)',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: 'fit-content'
            }}
        >
          <span className="material-symbols-outlined">
            refresh
          </span>
          更換圖片
        </button>
      )}
      <input
        ref={fileInputRef}
        id="fileInput"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <hr style={{ width: '100%', border: '1px solid #EFEFF7'}} />

      {/* 編輯區域 */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          //maxWidth: previewUrl ? '1200px' : '700px',
          //height: previewUrl ? '500px' : '300px', 
          maxWidth: previewUrl ? '100%' : '700px',
          height: previewUrl ? 'auto' : '300px',
          aspectRatio: previewUrl ? '2 / 1' : undefined,  
          //height: previewUrl ? 'auto' : '300px',          
          border: previewUrl ? 'none' : '1px dashed #4285f4',
          borderRadius: 12,
          backgroundColor: 'white',
          userSelect: 'none',
          overflow: 'hidden',
          boxShadow: previewUrl ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'border 0.3s, box-shadow 0.3s, height 0.3s ease',
          margin: '0 auto',
        }}
      >
        {/* 左側：圖片預覽 */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'crosshair',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#F6F7FB',
            alignItems: 'center',
          }}
        >
          {previewUrl ? (
            <>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="預覽圖"
                  onLoad={() => {
                    const img = imageRef.current;
                    const canvas = canvasRef.current;
                    if (img && canvas) {
                      canvas.width = img.naturalWidth; // 真實像素
                      canvas.height = img.naturalHeight;

                      const rect = img.getBoundingClientRect(); // 取得畫面上的顯示尺寸
                      canvas.style.width = `${img.clientWidth}px`;   
                      canvas.style.height = `${img.clientHeight}px`;

                      // console.log('Rendered width:', rect.width);
                      // console.log('Rendered height:', rect.height);
                    }

                    drawMask(); 
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    position: 'absolute',
                    zIndex: 2,
                  }}
                />

                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    zIndex: 3,
                    width: '100%',  
                    height: '100%', 
                    cursor: 'crosshair',
                  }}
                  onClick={handleCanvasClick}
                />

              </div>
            </>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#4285f4',
                cursor: 'pointer',
                padding: 20,
                backgroundColor: '#FDFDFF'
              }}
            >
              <span className="material-symbols-outlined"  style={{ fontSize: 64, color: '#4285f4', marginBottom: 20}}>add_photo_alternate</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('fileInput')?.click();
                }}

                style={{
                  display: 'inline-flex',
                  flexDirection: 'row',   
                  alignItems: 'center',   
                  background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)',
                  border: 'none',
                  borderRadius: 24,
                  gap: 6,
                  color: 'white',
                  padding: '10px 50px',
                  fontSize: 14,
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0, 123, 255, 0.6)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  minWidth: 'fit-content'
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  style={{ width: 20, height: 20 }} 
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                上傳圖片
              </button>

              <p style={{ marginTop: 12, color: '#666' }}>點擊按鈕上傳圖片或將圖片拖入</p>
              <input
                id="fileInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>


        {/* 右側：按鈕區 */}
        {previewUrl && (
          <div
            style={{
              width: '20%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'start',
              alignItems: 'center',
              gap: 10,
              padding: 10,
              paddingTop: '2%',
              paddingBottom: '2%'
            }}
          >
            {[
              { label: '保留', mode: 'point-positive', icon: 'edit', title: '點擊增加mask範圍' },
              { label: '移除', mode: 'point-negative', icon: 'do_not_disturb_on', title: '點擊移除mask範圍' },
              { label: '框選', mode: 'box', icon: 'pageless', title: '點擊左上角及右下角以框選欲加mask範圍' },
            ].map(({ label, mode: m, icon, title }) => (
              <button
                key={m}
                onClick={() => setMode(m as Mode)}
                title={title}
                className={`w-full rounded text-gray-800 flex items-center gap-2 justify-start ${mode === m ? 'bg-gray-200' : 'bg-white'}`}
                style={{
                  border: '1px solid #666',
                  borderRadius: 16,
                  padding: '6px 16px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background-color 0.3s, border-color 0.3s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#1E2939' }}>
                  {icon}
                </span>
                {label}
              </button>
            ))}


            {/* 生成模型按鈕 */}
            <button
              onClick={handleGenerate}
              style={{
                marginTop: 12,
                width: '100%',
                background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)',
                border: 'none',
                borderRadius: 16,
                padding: '8px 16px',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 'bold',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0, 123, 255, 0.6)',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'inline-flex',         
                whiteSpace: 'nowrap',     
        
                transition: 'background 0.3s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6 }}>
                auto_awesome
              </span>
              生成 3D 模型
            </button>
          </div>
        )}


      </div>
      
      {/* 生成中狀態顯示區 */}
      <div style={{ position: 'relative', width: '100%' }}>
        {isGenerating && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backdropFilter: 'blur(4px)',
              backgroundColor: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: 12,
            }}
          >
            <div
              style={{
                padding: 16,
                backgroundColor: '#F0F3FF',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#5458FF',
                fontWeight: 'bold',
              }}
            >
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ width: 28, height: 28 }}
              >
                <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>生成中...</span>
            </div>
          </div>
        )}

        {/* 模型顯示 */}
        <div
          style={{
            flexBasis: '40%',
            flexShrink: 0,
            width: '100%',
            marginTop: 20,
            border: '1px solid #ddd',
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#fff',
            position: 'relative',
          }}
        >
          {modelPath && <ClientModelPage modelPath={modelPath} />}
        </div>
      </div>

    </main>
  );
}