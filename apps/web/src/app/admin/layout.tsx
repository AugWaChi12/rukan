import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../globals.css';
import { anuphan, prompt } from '../fonts';

export const metadata: Metadata = {
  title: 'รู้กัน · Admin Console (admin.rukan.app)',
  description: 'ศูนย์ควบคุมและดูแลความปลอดภัยสำหรับทีมงาน รู้กัน (rukan)',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f0e0d',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className={`${prompt.variable} ${anuphan.variable} dark antialiased`}>
      <body className="min-h-dvh bg-[#0f0e0d] text-[#f2eadb] font-sans antialiased selection:bg-[#e9a9bf] selection:text-[#2e2238]">
        {children}
      </body>
    </html>
  );
}
