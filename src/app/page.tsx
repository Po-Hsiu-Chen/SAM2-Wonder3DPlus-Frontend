'use client';

import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import ModelViewer from '@/components/ModelViewer';
import { useEffect, useState } from 'react';

const modelData = [
  { glb: 'KINGJUN.glb', img: 'KINGJUN.jpg' },
  { glb: 'Virus.glb', img: 'Virus.jpg' },
  { glb: 'Mickey.glb', img: 'Mickey.jpg' },
  { glb: 'Shrimp.glb', img: 'Shrimp.jpg' },
  { glb: 'Stitch.glb', img: 'Stitch.jpg' },
  { glb: 'PineappleBun.glb', img: 'PineappleBun.jpg' },
  { glb: 'CustardBread.glb', img: 'CustardBread.jpg' },
  { glb: 'EggTart.glb', img: 'EggTart.jpg' },
  { glb: 'Toucan.glb', img: 'Toucan.jpg' },
  { glb: 'Turtle.glb', img: 'Turtle.jpg' },
  { glb: 'Carp.glb', img: 'Carp.jpg' },
  { glb: 'Toad.glb', img: 'Toad.jpg' },
  { glb: 'Penguin.glb', img: 'Penguin.jpg' },
];


export default function HomePage() {
  return (
    <main className="m-0 pt-4 min-h-screen bg-[#f7f7ff] text-gray-800" style={{ paddingLeft: '8%', paddingRight: '8%'}}>
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="w-full text-center py-20 px-6">
        <h1 className="text-4xl font-bold mb-4">圖片轉 3D 模型</h1>
        <p className="text-gray-500 text-lg">整合 SAM2 分割與 Wonder3D++，實現從 2D 圖像到 3D 模型</p>
      </section>

      {/* 示意圖區塊 */}
      <section className="w-[90%] mx-auto mb-20">
        <div className="rounded-3xl bg-[#F6F7FB] shadow-lg p-10 flex flex-col lg:flex-row gap-12">
          
          {/* 左半部說明 */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-bold mb-2">即時遮罩與三維重建</h2>
            <p className="text-gray-600 mb-6">支使用者透過點選或框選方式標記物體區域，系統將呼叫 SAM2 產生遮罩，經 Wonder3D++ 建構多視角影像與 glb 模型</p>
            <div className="flex gap-4">
              <Link href="/upload" className="px-6 py-2 text-white rounded-full" style={{background: 'linear-gradient(90deg, #5458FF 0%, #3CAAFF 100%)'}}>立即開始</Link>
              <a href="#gallery" className="px-6 py-2 bg-gray-200 rounded-full hover:bg-gray-300">瀏覽模型範例</a>
            </div>
          </div>

          {/* 影片 */}
          <div className="flex-1">
            <div
              className="w-full h-48 bg-gray-200 flex items-center justify-center"
              style={{ minHeight: '200px' }}
            >
              放影片
            </div>
          </div>
        </div>
      </section>
      
      {/* 模型範例 */}
      <section id="gallery" className="px-6 py-12 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">模型範例</h2>

        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {modelData.map(({ glb, img }, idx) => (
            <div
              key={idx}
              className="relative group rounded-2xl shadow-lg bg-white overflow-hidden transition-transform transform hover:scale-105 hover:shadow-2xl"
            >
              {/* 模型展示區 */}
              <div className="w-full aspect-square bg-gray-50 flex items-center justify-center overflow-hidden rounded-t-2xl">
                {/* ModelViewer 和 Image 切換 */}
                <div className="w-full h-full relative">
                  <div className="w-full h-full transition-opacity duration-300 group-hover:opacity-0">
                    <ModelViewer
                      src={`/models/${glb}`}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Image
                      src={`/images/${img}`}
                      alt="原始圖片"
                      width={180}
                      height={180}
                      className="object-contain max-h-full"
                    />
                  </div>
                </div>
              </div>

              {/* 模型名稱 */}
              <p className="text-center mt-3 mb-4 text-sm font-medium text-gray-700 truncate px-3">
                {glb}
              </p>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
