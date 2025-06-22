'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import ClientModelPage from '@/components/ClientModelPage';
import { useEffect, useState } from 'react';

export default function ViewerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [modelPath, setModelPath] = useState<string | null>(null);

  useEffect(() => {
    const path = searchParams.get('model');
    if (path) setModelPath(path);
  }, [searchParams]);

  if (!modelPath) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-600 text-lg">
        無法讀取模型，請從去背頁面重新操作。
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center gap-6 px-4 py-10 bg-[#F7F7FF]">
      <h1 className="text-2xl font-bold text-[#4e5cb9]">3D 模型預覽</h1>

      <div
        style={{
          width: '100%',
          maxWidth: 1000,
          height: '80vh',
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <ClientModelPage modelPath={modelPath} />
      </div>

      <button
        onClick={() => router.push('/upload')}
        className="mt-6 px-6 py-2 rounded-full bg-gray-200 hover:bg-gray-300 transition text-sm font-semibold"
      >
        返回去背頁面
      </button>
    </main>
  );
}
