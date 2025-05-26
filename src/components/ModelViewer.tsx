'use client';
import '@google/model-viewer';

type ModelViewerProps = {
  src: string;
};

export default function ModelViewer({ src }: ModelViewerProps) {
  return (
    <model-viewer
      src={src}
      alt="3D model"
      auto-rotate
      camera-controls
      ar
      style={{ width: '100%', height: '500px' }}
    />
  );
}
