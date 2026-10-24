import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'รู้กัน · Admin Console (admin.rukan.app)',
  description: 'ศูนย์ควบคุมและดูแลความปลอดภัยสำหรับทีมงาน รู้กัน (rukan)',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0e0d] text-[#f2eadb] font-sans antialiased selection:bg-[#e9a9bf] selection:text-[#2e2238]">
      {children}
    </div>
  );
}
