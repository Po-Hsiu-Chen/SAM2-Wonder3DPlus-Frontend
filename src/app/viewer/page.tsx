'use client';

import { useSearchParams } from 'next/navigation';
import ModelViewer from '@/components/ModelViewer';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';

export default function ViewerPage() {
  const searchParams = useSearchParams();
  const [modelPath, setModelPath] = useState<string | null>(null);
  const [colorPaths, setColorPaths] = useState<string[]>([]);
  const [normalPaths, setNormalPaths] = useState<string[]>([]);
  const [bgMode, setBgMode] = useState<'white' | 'dark'>('dark');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxType, setLightboxType] = useState<'color' | 'normal'>('color');

  const openLightbox = (index: number, type: 'color' | 'normal') => {
    setLightboxIndex(index);
    setLightboxType(type);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => setIsLightboxOpen(false);

  const handlePrev = () => {
    setLightboxIndex((prev) =>
      prev === 0 ? (lightboxType === 'color' ? colorPaths.length - 1 : normalPaths.length - 1) : prev - 1
    );
  };

  const handleNext = () => {
    const length = lightboxType === 'color' ? colorPaths.length : normalPaths.length;
    setLightboxIndex((prev) => (prev === length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const model = searchParams.get('model');
    const colors = searchParams.get('colors');
    const normals = searchParams.get('normals');

    if (model) setModelPath(model);

    try {
      if (colors) setColorPaths(JSON.parse(colors));
      if (normals) setNormalPaths(JSON.parse(normals));
    } catch (e) {
      console.error('解析圖片路徑失敗:', e);
    }
  }, [searchParams]);

  if (!modelPath) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        無法讀取模型，請從去背頁面重新操作
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 px-6 py-10 bg-[#F7F7FF] pt-[72px]">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="w-full text-center py-16 px-6">
        <h1 className="text-4xl font-bold text-blue-900 mb-3">3D 模型預覽</h1>
        <p className="text-gray-500 text-base">
          使用滑鼠拖曳即可自由旋轉模型
        </p>
      </section>

      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-6" style={{ height: 'auto' }}>

        {/* 左半部 - multiview 圖片 */}
        <div className="w-full lg:basis-1/2 overflow-auto flex flex-col gap-6 px-[1%] max-h-[80vh]">
          {[
            { title: 'Color Maps', icon: 'palette', paths: colorPaths, type: 'color' as const },
            { title: 'Normal Maps', icon: 'texture', paths: normalPaths, type: 'normal' as const },
          ].map(({ title, icon, paths, type }) => (
            <div key={type} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
              <h2 className="text-md font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[20px] text-blue-500">{icon}</span>
                {title}
              </h2>

              <div className="flex flex-wrap gap-3">
                {paths.map((path, i) => (
                  <div
                    key={`${type}-${i}`}
                    className="w-[18%] min-w-[90px] aspect-square relative group overflow-hidden rounded-md shadow hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => openLightbox(i, type)}
                  >
                    <img
                      src={path}
                      alt={`${title} ${i}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm">
                      點擊預覽
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 右半部 - 模型檢視 */}
        <div className="w-full lg:basis-1/2 relative flex flex-col">
          <div
            className="rounded-lg overflow-hidden relative w-full min-h-[400px] aspect-[1/1] lg:aspect-auto lg:flex-1"
            style={{
              backgroundColor: bgMode === 'dark' ? '#1e1e1e' : '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {/* 下載按鈕 */}
            {modelPath && (
              <div className="absolute top-2 left-2 z-10">
                <a
                  href={modelPath}
                  download
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  下載模型
                </a>
              </div>
            )}

            {/* 背景切換 */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2 text-sm text-gray-600">
              <label className="relative inline-flex items-center cursor-pointer w-14 h-8">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={bgMode === 'dark'}
                  onChange={() => setBgMode(prev => (prev === 'dark' ? 'white' : 'dark'))}
                />
                <div className="w-full h-full bg-gray-300 rounded-full peer-checked:bg-gray-500 transition-colors duration-300" />
                <div
                  className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow transition-transform duration-300 ${
                    bgMode === 'dark' ? 'translate-x-6' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-gray-800 select-none pointer-events-none">
                    {bgMode === 'dark' ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
              </label>
            </div>

            {/* 模型展示 */}
            <ModelViewer
              src={modelPath}
              style={{ width: '100%', height: '100%', backgroundColor: bgMode === 'dark' ? '#1e1e1e' : '#ffffff' }}
            />
          </div>
        </div>
      </div>
      
      {/* multiview 放大檢視 */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="relative bg-white rounded-xl shadow-xl p-4 max-w-[90%] max-h-[90%]">
            {/* 關閉按鈕 */}
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
            >
              ×
            </button>
          
            {/* 左右箭頭 */}
            <button
              onClick={handlePrev}
              className="absolute left-[-40px] top-1/2 -translate-y-1/2 text-3xl text-white bg-black/40 rounded-full px-2 hover:bg-black"
            >
              ‹
            </button>

            <img
              src={(lightboxType === 'color' ? colorPaths : normalPaths)[lightboxIndex]}
              alt="preview"
              className="max-w-full max-h-[85vh] rounded-md"
            />

            <button
              onClick={handleNext}
              className="absolute right-[-40px] top-1/2 -translate-y-1/2 text-3xl text-white bg-black/40 rounded-full px-2 hover:bg-black"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
