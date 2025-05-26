'use client';

import dynamic from 'next/dynamic';

const ModelViewer = dynamic(() => import('./ModelViewer'), {
  ssr: false,
  loading: () => <p>載入模型中...</p>,
});

type ClientModelPageProps = {
  modelPath: string;
};

export default function ClientModelPage({ modelPath }: ClientModelPageProps) {

  return (
    <main>
      <h1>3D GLB Viewer</h1>
      <ModelViewer src={modelPath} />
    </main>
  );
}
