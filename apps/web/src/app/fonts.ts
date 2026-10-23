import { Anuphan, Prompt } from 'next/font/google';

// Prompt = หัวข้อ/ปุ่ม, Anuphan = เนื้อหา (ทั้งคู่รองรับไทย + อังกฤษ)
export const prompt = Prompt({
  variable: '--font-prompt',
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const anuphan = Anuphan({
  variable: '--font-anuphan',
  subsets: ['thai', 'latin'],
  display: 'swap',
});
