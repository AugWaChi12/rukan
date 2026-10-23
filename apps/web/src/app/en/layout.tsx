// root layout ภาษาอังกฤษ (/en)
import '../globals.css';
import { anuphan, prompt } from '../fonts';
import { siteMetadata } from '../site-metadata';

export { viewport } from '../site-metadata';
export const metadata = siteMetadata('en');

export default function EnglishRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${prompt.variable} ${anuphan.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
