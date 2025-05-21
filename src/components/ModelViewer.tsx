'use client';
import '@google/model-viewer';

export default function ModelViewer() {
  return (
    <model-viewer
      src="/model1.glb"
      alt="3D model"
      auto-rotate
      camera-controls
      ar
      style={{ width: '100%', height: '500px' }}
    />
  );
}
