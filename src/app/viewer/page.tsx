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
    <main className="min-h-screen flex flex-col items-center gap-6 px-6 py-10 bg-[#F7F7FF]">
      <Header />
      
      <h1 className="text-2xl font-bold text-[#4e5cb9] mb-4">3D 模型預覽</h1>

      <div className="w-full max-w-[1400px] flex gap-6" style={{ height: '80vh' }}>
        {/* 左半部 - multiview 圖片 */}
        <div className="basis-1/2 overflow-auto flex flex-col gap-6 pl-[0.5%] pr-[0.5%] border border-gray-300 rounded-lg">
          
          {/* Color Maps */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Color Maps</h2>
            <div className="flex flex-wrap gap-3">
              {colorPaths.map((path, i) => (
                <div key={`color-${i}`} className="w-[15%] min-w-[100px] group relative">
                  <img
                    src={path}
                    alt={`Color ${i}`}
                    className="rounded-lg shadow-md hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Normal Maps */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Normal Maps</h2>
            <div className="flex flex-wrap gap-3">
              {normalPaths.map((path, i) => (
                <div key={`normal-${i}`} className="w-[15%] min-w-[100px] group relative">
                  <img
                    src={path}
                    alt={`Normal ${i}`}
                    className="rounded-lg shadow-md hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右半部 - 模型檢視區 */}
        <div className="basis-1/2 relative flex flex-col">
          <div
            className="flex-1 rounded-lg overflow-hidden relative"
            style={{
              backgroundColor: bgMode === 'dark' ? '#1e1e1e' : '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            {/* 背景切換開關 */}
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
    </main>
  );
}
