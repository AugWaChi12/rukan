import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const isSubdomainAdmin = host.startsWith('admin.');

  // 1. ถ้าเข้าผ่าน admin.rukan.app หรือ admin.localhost:
  // เข้าสู่หน้า Admin Console โดยตรง (URL แสดง root หรือ subpath สวยงาม)
  if (isSubdomainAdmin) {
    if (!pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname === '/' ? '' : pathname}`;
      const rewriteResponse = NextResponse.rewrite(url, { request });
      return updateSession(request, rewriteResponse);
    }
  }

  // 2. ถ้าเข้าผ่าน rukan.app แล้วพยายามเข้า /admin โดยตรง:
  // บังคับ Redirect ไปที่ https://admin.rukan.app ทันทีตามกฎ "ให้เข้า admin.rukan.app เท่านั้น"
  if (!isSubdomainAdmin && pathname.startsWith('/admin')) {
    if (host.includes('rukan.app')) {
      const targetPath = pathname.replace('/admin', '') || '/';
      return NextResponse.redirect(new URL(`https://admin.rukan.app${targetPath}`));
    }
  }

  return updateSession(request);
}

export const config = {
  // ไม่ต้องรันกับไฟล์ static / รูป / favicon
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
