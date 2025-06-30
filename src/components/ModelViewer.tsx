'use client';

import { useEffect } from 'react';

type ModelViewerProps = {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
};

export default function ModelViewer({
  src,
  alt = '3D model',
  style,
  className,
  ...rest
}: ModelViewerProps) {
  useEffect(() => {
    // 確保只在 client 載入 @google/model-viewer
    import('@google/model-viewer');
  }, []);

  return (
    <model-viewer
      src={src}
      alt={alt}
      auto-rotate
      camera-controls
      interaction-prompt="none"
      camera-orbit="0deg 70deg 3m"
      field-of-view="30deg"
      exposure="1.1"
      shadow-intensity="1"
      auto-rotate-delay="0"
      style={style}
      class={className}
      {...rest}
    />
  );
}
