'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md flex justify-between items-center px-8 z-50">
      <Link href="/" className="flex items-center gap-2 cursor-pointer">
        <span
          className="material-symbols-outlined text-[28px] text-blue-900"
          style={{ lineHeight: '1' }}
        >
          deployed_code
        </span>
        <span className="font-bold text-lg text-blue-900">Test</span>
      </Link>

      <nav className="flex gap-6 text-sm font-semibold text-blue-800">
        <Link href="/" className="hover:text-[#3B49FF] transition-colors">主頁</Link>
        <Link href="/upload" className="hover:text-[#3B49FF] transition-colors">操作頁面</Link>
      </nav>
    </header>
  );
}
