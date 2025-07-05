'use client';

import { useState, useRef, useEffect } from 'react';
import UploadSection from '@/components/UploadSection';
import Header from '@/components/Header';
import Joyride, { CallBackProps, Step } from 'react-joyride';
import { useRouter } from 'next/navigation';

type Mode = 'point-positive' | 'point-negative' | 'box';
type Point = { x: number; y: number; label: 0 | 1 };
type BoxCoord = { x: number; y: number };

export default function UploadPage() {
  // -------- 圖片處理 --------
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // -------- 操作模式與標記 --------
  const [mode, setMode] = useState<Mode>('point-positive');
  const [points, setPoints] = useState<Point[]>([]);
  const [boxTemp, setBoxTemp] = useState<BoxCoord[]>([]); // 暫存框選座標
  const [box, setBox] = useState<[number, number, number, number] | null>(null);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(true);

  // -------- 模型處理 --------
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [colorPaths, setColorPaths] = useState<string[]>([]);
  const [normalPaths, setNormalPaths] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // -------- UI 流程狀態 --------
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showHelp, setShowHelp] = useState(false);
  const [helpStep, setHelpStep] = useState(0);
  const [runJoyride, setRunJoyride] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(true);
  const router = useRouter();

  const helpImages = [
    {
      title: '上傳圖片',
      src: '/help/step1.png',
      caption: '點擊上傳圖片，選擇欲上傳的圖片',
    },
    {
      title: '圖片去背',
      src: '/help/step2.png',
      caption: '點擊保留，再點擊你想要增加遮罩的物體',
    },
    {
      title: '圖片去背',
      src: '/help/step3.png',
      caption: '點擊框選，點擊左上角再點擊右下角，框住你想要增加遮罩的物體',
    },
  ];

  const modeTitle = {
    'point-positive': '保留',
    'point-negative': '移除',
    'box': '框選'
  };

  const modeHint: Record<Mode, string> = {
    'point-positive': '點擊增加遮罩範圍',
    'point-negative': '點擊移除遮罩範圍',
    'box': '點擊左上角及右下角以框選欲加遮罩範圍',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPoints([]);
      setBox(null);
      setMaskBase64(null);
      setCurrentStep(2);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPoints([]);
      setBox(null);
      setMaskBase64(null);
      setCurrentStep(2);
    } else {
      alert("請上傳圖片格式的檔案");
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
    if (!selectedFile || (points.length === 0 && !box)) {
      alert("請透過滑鼠點擊生成遮罩");
      return;
    }

    setCurrentStep(3);
    setIsGenerating(true); // 開始載入狀態

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('points', JSON.stringify(points.length > 0 ? points : []));
    if (box) {
      formData.append('box', JSON.stringify({ x1: box[0], y1: box[1], x2: box[2], y2: box[3] }));
    }
    formData.append('camera_type', 'persp');

    try {
      const res = await fetch('http://127.0.0.1:8000/generate', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.status === "ok") {
        const backendBaseUrl = "http://127.0.0.1:8000";
        setModelPath(backendBaseUrl + data.model_path);
        setColorPaths(data.color_grid_paths.map((path: string) => backendBaseUrl + path));
        setNormalPaths(data.normal_grid_paths.map((path: string) => backendBaseUrl + path));
        // const modelPath = backendBaseUrl + data.model_path;
        // const colorPath = backendBaseUrl + data.color_grid_path;
        // const normalPath = backendBaseUrl + data.normal_grid_path;
      } else {
        alert("生成失敗: " + data.message);
      }
    } catch (error) {
      alert("請求失敗：" + error);
    }

    // 模擬生成成功
    // const fakeBaseUrl = "/fake_assets";
    // setModelPath("/fake_assets/model.glb");
    // setColorPaths([
    //   `${fakeBaseUrl}/colors/rgb_000_back.png`,
    //   `${fakeBaseUrl}/colors/rgb_000_front_left.png`,
    //   `${fakeBaseUrl}/colors/rgb_000_left.png`,
    //   `${fakeBaseUrl}/colors/rgb_000_front.png`,
    //   `${fakeBaseUrl}/colors/rgb_000_front_right.png`,
    //   `${fakeBaseUrl}/colors/rgb_000_right.png`,
    // ]);
    // setNormalPaths([
    //   `${fakeBaseUrl}/normals/normals_000_back.png`,
    //   `${fakeBaseUrl}/normals/normals_000_front_left.png`,
    //   `${fakeBaseUrl}/normals/normals_000_left.png`,
    //   `${fakeBaseUrl}/normals/normals_000_front.png`,
    //   `${fakeBaseUrl}/normals/normals_000_front_right.png`,
    //   `${fakeBaseUrl}/normals/normals_000_right.png`,
    // ]);
    setIsGenerating(false); // 載入結束
  };

  const sendToBackend = async (
    points: Point[],
    box: [number, number, number, number] | null,
    file: File
  ) => {
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('points', JSON.stringify(points.length > 0 ? points : []));
    if (box) {
      formData.append(
        'box',
        JSON.stringify({ x1: box[0], y1: box[1], x2: box[2], y2: box[3] })
      );
    }

    const res = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setMaskBase64(data.mask_base64);
    console.log("maskBase64長度:", data.mask_base64?.length);
    console.log("maskBase64前30字:", data.mask_base64?.slice(0,30));

  };

  const drawPointsAndBox = (ctx: CanvasRenderingContext2D) => {
    // 畫點
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = p.label === 1 ? 'limegreen' : 'red';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    // 畫框
    if (box) {
      const [x1, y1, x2, y2] = box;
      ctx.beginPath();
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 3;
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.stroke();
    }
  };

  const drawMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    const { naturalWidth, naturalHeight } = img;
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;

    // 清除畫布並畫原圖
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 若尚未有遮罩，只畫點與框
    if (!maskBase64) {
      drawPointsAndBox(ctx);
      return;
    }

    // 有遮罩才載入
    const maskImg = new Image();
    maskImg.src = `data:image/png;base64,${maskBase64}`;
    maskImg.onload = () => {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height); // 畫遮罩
      ctx.globalAlpha = 1;
      drawPointsAndBox(ctx); // 再畫點與框
    };

    maskImg.onerror = () => {
      console.error("遮罩載入失敗，base64:", maskBase64?.substring(0, 30));
      drawPointsAndBox(ctx);
    };
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, type, step, lifecycle } = data;
    if (step?.target === '.step-help' && lifecycle === 'complete') {
      setRunJoyride(false); // 關閉導覽
    }
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
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="w-full min-h-screen flex flex-col items-center gap-6 pt-4" style={{ backgroundColor: '#F7F7FF', paddingLeft: '8%', paddingRight: '8%'}}>
      <Header />
      {mounted && (
        <Joyride
          steps={[{
            target: '.step-help',
            content: '點擊此按鈕，可查看操作說明',
            disableBeacon: true,
          }]}
          run={runJoyride}
          callback={handleJoyrideCallback}
          continuous
          showProgress
          showSkipButton
          spotlightClicks={true}
          disableOverlayClose={true}
          locale={{
            last: 'OK', 
          }}
          styles={{
            options: {
              zIndex: 1000,
            },
            buttonNext: {
              backgroundColor: '#ffffff',
              color: '#999999',
              border: '1px solid #cccccc',
              borderRadius: '9999px',
              padding: '6px 20px',
              fontWeight: 'bold',
            } }}
        />
      )}

      <h1 className="text-xl font-bold">3D 模型生成</h1>
      
      {/* 更換圖片按鈕 */}
      {previewUrl && (
        <button
          disabled={isGenerating}
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
              padding: '6px 35px',
              fontSize: 12,
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0, 123, 255, 0.6)',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: 'fit-content',
              opacity: isGenerating ? 0.5 : 1
            }}
        >
          <span className="material-symbols-outlined">
            refresh
          </span>
          更換圖片
        </button>
      )}

      {/* 模型預覽提示 */}
      {modelPath && !isGenerating && (
        <div
          style={{
            width: '100%',
            marginTop: 20,
            padding: '10px 20px',
            background: 'linear-gradient(90deg, #e0e4ff 0%, #f3f4ff 100%)',
            borderRadius: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ fontWeight: 'bold', color: '#4e5cb9' }}>模型已生成！可點擊預覽</span>
          <button
            onClick={() =>                   
              router.push(
                `/viewer?model=${encodeURIComponent(modelPath)}`
                + `&colors=${encodeURIComponent(JSON.stringify(colorPaths))}`
                + `&normals=${encodeURIComponent(JSON.stringify(normalPaths))}`
              )
            }
            style={{
              padding: '6px 16px',
              backgroundColor: '#5458FF',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            前往模型預覽
          </button>
        </div>
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

      <div className="flex flex-col md:flex-row w-full gap-5">
        {/* 導引區 */}
        <div
          className="
            step-sidebar
            w-full md:w-[15%]
            flex flex-row md:flex-col
            items-center md:items-start
            bg-[#FDFDFF]
            rounded-xl
            shadow-sm
            p-2
          "
        >
          {[
            { step: 1, label: '選取圖片' },
            { step: 2, label: '圖片去背' },
            { step: 3, label: '生成模型' }
          ].map(({ step, label }) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 'bold',
                fontSize: 12, 
                color: currentStep === step ? '#5458FF' : '#999',
                backgroundColor: currentStep === step ? '#E0E4FF' : 'transparent',
                borderRadius: 8,
                padding: '6px 12px',
                width: '100%',
              }}
            >
              <span
                style={{
                  backgroundColor: currentStep === step ? '#5458FF' : '#ccc',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  aspectRatio: '1', 
                }}
              >
                {step}
              </span>
              {label}
            </div>
          ))}
        </div>

        {/* 編輯區域 */}
        <div
          className="step-upload flex flex-col md:flex-row w-full max-w-full md:[aspect-ratio:2/1]"
          style={{
            border: 'none',
            borderRadius: 12,
            backgroundColor: 'white',
            userSelect: 'none',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            margin: '0 auto',
          }}
        >
          {/* 圖片 */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              cursor: 'crosshair',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backgroundColor: '#F6F7FB',
              alignItems: 'stretch',
              minHeight: 300,
            }}
          >
            {/* 圖片上傳區 */}
            {!previewUrl && (
              <UploadSection
                previewUrl={previewUrl}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                handleDrop={handleDrop}
              />
            )}

            {/* 圖片預覽 */}
            {previewUrl && (
              <>
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                  {hintOpen ? (
                    <div style={{
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      padding: '12px 16px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      width: 240,
                      position: 'relative',
                    }}>
                      {/* 關閉按鈕 */}
                      <span
                        onClick={() => setHintOpen(false)}
                        className="material-symbols-outlined"
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          fontSize: 20,
                          color: '#999',
                          cursor: 'pointer',
                        }}
                      >
                        close
                      </span>

                      {/* 標題 + 內容 */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span className="material-symbols-outlined" style={{ color: '#3CAAFE', fontSize: 18 }}>
                          info
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: 14 }}>{modeTitle[mode]}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#666' }}>{modeHint[mode]}</p>
                    </div>
                  ) : (
                    // 收合狀態：只顯示 info 圖示
                    <span
                      className="material-symbols-outlined"
                      onClick={() => setHintOpen(true)}
                      style={{
                        fontSize: 28,
                        color: '#3CAAFE',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: '50%',
                        padding: 6,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      info
                    </span>
                  )}
                </div>

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
                  {/* 模糊遮罩層 */}
                  {isGenerating && (
                    <div
                      style={{
                        position: 'absolute',
                        zIndex: 5,
                        width: '100%',
                        height: '100%',
                        backdropFilter: 'blur(4px)',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
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
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" style={{ width: 28, height: 28 }}>
                          <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span>生成中...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* 預覽圖片 */}
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
                      position: 'relative',
                      zIndex: 2,
                    }}
                  />

                  {/* canvas */}
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
                
                {/* 互動遮罩 (生成中時阻擋 canvas 點擊) */}
                {isGenerating && (
                  <div
                    style={{
                      position: 'absolute',
                      zIndex: 10,
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'not-allowed',
                      pointerEvents: 'auto',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </>
            )}
          </div>

          {/* 按鈕區 */}
          {previewUrl && (
            <div className="w-full md:w-[20%] flex flex-col justify-start items-center gap-3 p-3">
              {[
                { label: '點擊生成遮罩', mode: 'point-positive', icon: 'edit' },
                { label: '框選生成遮罩', mode: 'box', icon: 'pageless' },
                { label: '點擊移除遮罩', mode: 'point-negative', icon: 'do_not_disturb_on' },
              ].map(({ label, mode: m, icon }) => (
                <button
                  disabled={isGenerating}
                  key={m}
                  onClick={() => setMode(m as Mode)}
                  className={`w-full rounded flex items-center gap-2 justify-start ${
                    mode === m ? 'bg-[#5B6CB2] text-white' : 'bg-white text-gray-800'
                  }`}
                  style={{
                    border: mode === m ? 'none' : '1px solid #666',
                    borderRadius: 16,
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background-color 0.3s, border-color 0.3s',
                    opacity: isGenerating ? 0.5 : 1,
                    pointerEvents: isGenerating ? 'none' : 'auto',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 18,
                      color: mode === m ? '#FFFFFF' : '#1E2939',
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              ))}

              <button
                disabled={isGenerating}
                onClick={handleGenerate}
                className="mt-auto w-full"
                style={{
                  background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)',
                  border: 'none',
                  borderRadius: 16,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 'bold',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0, 123, 255, 0.6)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.3s',
                  opacity: isGenerating ? 0.5 : 1,
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
      </div>
                    
      <button
        onClick={() => {
          setShowHelp(true);
          setRunJoyride(false); // 點擊時結束 Joyride
        }}
        className="help-button step-help"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          backgroundColor: '#5458FF',
          color: '#fff',
          border: 'none',
          fontSize: 28,
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          zIndex: 50,
        }}
      >
        ?
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 sm:px-20">
          <div
            className="
              relative w-full max-w-[800px]
              bg-[#d9deff] text-[#4e5cb9]
              rounded-3xl
              p-6 sm:p-10
              flex flex-col items-center
              shadow-[0_4px_20px_rgba(0,0,0,0.2)]
              overflow-y-auto max-h-[90vh]
            "
          >
            {/* 關閉按鈕 */}
            <span
              className="material-symbols-outlined absolute top-3 right-3 text-3xl cursor-pointer"
              onClick={() => setShowHelp(false)}
            >
              cancel
            </span>

            {/* 左右箭頭（縮小在手機） */}
            <span
              className={`
                material-symbols-outlined absolute left-1 top-1/2 -translate-y-1/2
                text-4xl sm:text-5xl cursor-pointer
                ${helpStep === 0 ? 'opacity-30 cursor-not-allowed' : 'text-transparent bg-gradient-to-r from-[#5254ff] to-[#4796ff] bg-clip-text'}
              `}
              onClick={() => helpStep > 0 && setHelpStep(helpStep - 1)}
            >
              arrow_left
            </span>

            <span
              className={`
                material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2
                text-4xl sm:text-5xl cursor-pointer
                ${helpStep === helpImages.length - 1 ? 'opacity-30 cursor-not-allowed' : 'text-transparent bg-gradient-to-r from-[#5254ff] to-[#4796ff] bg-clip-text'}
              `}
              onClick={() => helpStep < helpImages.length - 1 && setHelpStep(helpStep + 1)}
            >
              arrow_right
            </span>

            {/* 標題 */}
            <h2 className="mb-2 text-xl sm:text-2xl font-bold text-center">
              {helpImages[helpStep].title}
            </h2>

            {/* 圖片 */}
            <img
              src={helpImages[helpStep].src}
              alt={`step-${helpStep + 1}`}
              className="w-full h-auto mb-4 rounded-xl max-h-[50vh] object-contain"
            />

            {/* 說明文字 */}
            <p className="mb-3 text-center text-base">{helpImages[helpStep].caption}</p>

            {/* 進度 */}
            <div className="flex gap-2">
              {helpImages.map((_, idx) => (
                <div
                  key={idx}
                  className={`
                    w-[10px] h-[10px] rounded-full
                    ${helpStep === idx ? 'bg-[#4e5cb9]' : 'bg-[#aaa] opacity-40'}
                  `}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 模型生成成功後的中央彈出提示 */}
      {modelPath && !isGenerating && showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 80px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: '20px',
              width: '90vw', 
              maxWidth: 420,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              position: 'relative',
              textAlign: 'center',
            }}
          >
            <h2 style={{ fontSize: 20, marginBottom: 12, color: '#4e5cb9' }}>
              模型已生成
            </h2>
            <p style={{ fontSize: 14, marginBottom: 24 }}>
              點擊下方按鈕可前往模型預覽畫面查看 3D 模型
            </p>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              marginTop: 20,
            }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#fff',
                  color: '#333',
                  border: '2px solid #888',
                  borderRadius: 24,
                  fontWeight: 'bold',
                  fontSize: 14,
                  cursor: 'pointer',
                  width: 'fit-content',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                }}
              >
                關閉
              </button>

              <button
                onClick={() =>
                  router.push(
                    `/viewer?model=${encodeURIComponent(modelPath)}`
                    + `&colors=${encodeURIComponent(JSON.stringify(colorPaths))}`
                    + `&normals=${encodeURIComponent(JSON.stringify(normalPaths))}`
                  )
                }
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 24,
                  fontWeight: 'bold',
                  fontSize: 14,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  width: 'fit-content',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                }}
              >
                前往模型預覽
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}