// root layout ภาษาไทย (/) — มี 2 root layout เพื่อให้ <html lang> ถูกต้องในแต่ละภาษา
import '../globals.css';
import { anuphan, prompt } from '../fonts';
import { siteMetadata } from '../site-metadata';

export { viewport } from '../site-metadata';
export const metadata = siteMetadata('th');

export default function ThaiRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${prompt.variable} ${anuphan.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
